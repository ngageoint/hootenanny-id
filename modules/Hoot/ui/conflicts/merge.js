/*******************************************************************************************************
 * File: merge.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 5/16/18
 *******************************************************************************************************/

import _clone   from 'lodash-es/clone';
import _find    from 'lodash-es/find';
import _forEach from 'lodash-es/forEach';
import _reduce  from 'lodash-es/reduce';
import _uniq    from 'lodash-es/uniq';

import { JXON }             from '../../../util/jxon';
import { t }                from '../../../util/locale';
import { operationDelete }  from '../../../operations/delete';
import { actionChangeTags } from '../../../actions/index';
import { osmNode }          from '../../../osm';
import { osmWay }           from '../../../osm';

/**
 * @class Merge
 */
export default class Merge {
    /**
     * @param instance - conflicts class
     */
    constructor( instance ) {
        this.data = instance.data;

        this.mergeArrow = {
            from: null,
            to: null
        };

    }

    /**
     * Merge together 2 POI nodes
     *
     * @returns {Promise<void>}
     */
    async mergeFeatures() {
        let features = _clone( Object.values(this.mergeArrow).map( function( a ) { return a; } ) ),
            reverse  = d3.event.ctrlKey || d3.event.metaKey,
            featureUpdate,
            featureDelete,
            mergedFeature,
            reviewRefs;


        // show merge button
        this.toggleMergeButton( true );

        if ( reverse ) {
            // flip features
            features.reverse();
        }



        // This tag identifies the feature that is being merged into and will be removed by the server
        // after merging is completed. The tag is not needed by POI to Polygon conflation, however,
        // and will be ignored since POIs are always merged into polygons.

        features[ 0 ].tags[ 'hoot:merge:target' ] = 'yes';

        featureUpdate = features[ 0 ];
        featureDelete = features[ 1 ];

        try {
            let mergedNode = await this.getMergedNode( features );

            mergedNode.tags[ 'hoot:status' ] = 3;

            Hoot.context.perform(
                actionChangeTags( featureUpdate.id, mergedNode.tags ),
                t( 'operations.change_tags.annotation' )
            );

            mergedFeature = featureUpdate; // feature that is updated is now the new merged node

        } catch ( e ) {
            window.console.log( e );
            throw new Error( 'Unable to merge features' );
        }

        try {
            let mergeItems              = this.getMergeItems( features ),
                { reviewRefsResponses } = await Hoot.api.getReviewRefs( mergeItems );

            reviewRefs = _uniq( reviewRefsResponses[ 0 ].reviewRefs.concat( reviewRefsResponses[ 1 ].reviewRefs ) );
            reviewRefs = this.removeNonRefs( reviewRefs, [ mergeItems[ 0 ].id, mergeItems[ 1 ].id ] );

            // TODO: get back to this
            // let missingRelationIds = this.getMissingRelationIds( reviewRefs );
        } catch ( e ) {
            throw new Error( 'Unable to retrieve review references for merged items' );
        }

        this.processMerge( reviewRefs, mergedFeature, featureDelete );
    }

    /**
     * Process and finalize the merge by deleting the node being merged and by updating
     * the tags of both nodes and their parent relations to indicate the relations have been resolved.
     *
     * @param reviewRefs - reference of nodes being merged
     * @param mergedFeature - data of merged node
     * @param featureToDelete - data of node to delete
     */
    processMerge( reviewRefs, mergedFeature, featureToDelete ) {
        let reviewRelationId = this.data.currentReviewItem.relationId;

        _forEach( reviewRefs, ref => {
            let refRelation    = Hoot.context.hasEntity( `r${ ref.reviewRelationId }_${ this.data.mapId }` ),
                mergedRelation = Hoot.context.hasEntity( `r${ reviewRelationId }_${ this.data.mapId }` );

            if ( refRelation.members.length === mergedRelation.members.length ) {
                let foundCount = 0;

                _forEach( refRelation.members, refMember => {
                    let found = _find( mergedRelation.members, mergedMember => mergedMember.id === refMember.id );

                    if ( found ) {
                        foundCount++;
                    }
                } );

                if ( foundCount === refRelation.members.length ) {
                    refRelation.tags[ 'hoot:review:needs' ] = 'no';

                    Hoot.context.perform(
                        actionChangeTags( refRelation.id, refRelation.tags ),
                        t( 'operations.change_tags.annotation' )
                    );
                }
            }

            let refRelationMember = refRelation.memberById( featureToDelete.id );

            if ( refRelationMember ) {
                let exists = _find( this.data.mergedConflicts, { id: refRelation.id } );

                if ( exists && exists.obj ) {
                    exists = exists.obj.id === mergedFeature.id;
                }

                if ( !exists && !refRelation.memberById( mergedFeature.id ) ) {

                    if ( mergedFeature.type === 'node' ) {

                        let newNode = this.createNewRelationNodeMeta( mergedFeature.id, refRelation.id, refRelationMember.index );
                        this.data.mergedConflicts.push( newNode );
                    } else {
                        let newWay = this.createNewRelationWayMeta( mergedFeature.id, refRelation.id, refRelationMember.index );
                        this.data.mergedConflicts.push( newWay );
                     }
                }
            }
        } );

        let fe = Hoot.context.hasEntity( featureToDelete.id );

        if ( fe ) {
            fe.hootMeta = { 'isReviewDel': true };
        }

        operationDelete( [ featureToDelete.id ], Hoot.context )();

    }

    /**
     * Generate and parse the new merged feature
     *
     * @param features - list of nodes to merge
     * @returns {object} - merged node
     */
    async getMergedNode( features ) {
        let jxonFeatures = [ JXON.stringify( features[ 0 ].asJXON() ), JXON.stringify( features[ 1 ].asJXON() ) ].join( '' ),
            osmXml     = `<osm version="0.6" upload="true" generator="hootenanny">${ jxonFeatures }</osm>`,
            mergedXml  = await Hoot.api.poiMerge( osmXml );

        let dom        = new DOMParser().parseFromString( mergedXml, 'text/xml' ),
            mapId      = this.data.currentReviewItem.mapId,

            featureOsm = await Hoot.context.connection().parse( dom, mapId );

        return featureOsm[ 0 ];
    }

    /**
     * Generate parameters for nodes being merged together
     *
     * @param features - list of nodes to merge
     * @returns {array} - data of merged items
     */
    getMergeItems( features ) {
        return _reduce( features, ( arr, feature ) => {
            let item = {
                mapId: this.data.mapId,
                id: feature.origid.substring( 1 ),
                type: feature.type
            };

            arr.push( item );

            return arr;
        }, [] );
    }

    /**
     * Remove any irrelevant reviews that don't reference either of the 2 items being merged together
     *
     * @param reviewRefs - reference of nodes being merged
     * @param mergeIds - ids of items being merged
     * @returns {array} - new list of relevant review items
     */
    removeNonRefs( reviewRefs, mergeIds ) {
        let reviewMergeRelationId = this.data.currentReviewItem.relationId;

        return _reduce( reviewRefs, ( arr, ref ) => {
            if ( (mergeIds.indexOf( '' + ref.id ) === -1) || ref.reviewRelationId !== reviewMergeRelationId ) {
                arr.push( ref );
            }

            return arr;
        }, [] );
    }

    /**
     * Generate metadata for merged node
     *
     * @param mergedNodeId - node ID
     * @param relationId - relation ID
     * @param mergedIdx - index of node in relation
     */
    createNewRelationNodeMeta( mergedNodeId, relationId, mergedIdx ) {
        let node = new osmNode(),
            obj  = {};

        node.id    = mergedNodeId;
        node.type  = 'node';
        node.role  = 'reviewee';
        node.index = mergedIdx;

        obj.id  = relationId;
        obj.obj = node;

        return obj;
    }

    /**
     * Generate metadata for merged way
     * @param {*} mergeWayId
     * @param {*} relationId
     * @param {*} mergeIdx
     */

    createNewRelationWayMeta( mergedWayId, relationId, mergedIdx ) {
        let way = new osmWay(),
            obj = {};
        way.id    = mergedWayId;
        way.type  = 'way';
        way.role  = 'reviewee';
        way.index = mergedIdx;

        obj.id  = relationId;
        obj.obj = way;

        return obj;
    }

    /**
     * Get IDs of missing relations
     *
     * @param reviewRefs - reference of nodes being merged
     * @returns {array} - list of missing relation IDs
     */
    getMissingRelationIds( reviewRefs ) {
        return _reduce( reviewRefs, ( arr, ref ) => {
            let relId = `r${ ref.reviewRelationId }_${ this.data.mapId }`;

            if ( !Hoot.context.hasEntity( relId ) ) {
                arr.push( relId );
            }

            return arr;
        }, [] );
    }

    /**
     * Show/hide merge button in conflicts review container
     *
     * @param hide - true | false
     */
    toggleMergeButton( hide ) {
        d3.select( '.action-buttons .merge' ).classed( 'hidden', hide );
    }

    /**
     * Disables/Enables pointer events on merge button when user attempts to reverse merge
     * @param disable  - true | false
     */

    disableMergeButton( disable ) {
        d3.select( '.action-buttons .merge' ).classed( 'disable-reverse', disable );
    }

    checkMergeArrowFeatures( toFeature, fromFeature ) {

        let mergeFeatures = [];

       if ( toFeature.id.charAt( 0 ) === 'n' && fromFeature.id.charAt( 0 ) === 'w' ) {
            mergeFeatures.push( toFeature, fromFeature, null);
            return mergeFeatures;
        }
    }

    /**
     * Activate merge arrow layer. Arrow appears when hovering over merge button
     *
     * @param feature
     * @param againstFeature
     */
    activateMergeArrow( feature, againstFeature ) {
        let that = this;

        that.mergeArrow.from = againstFeature;
        that.mergeArrow.to   = feature;

        d3.select( '.action-buttons' )
            .on( 'mouseleave', function() {
                // reactivate pointer events if they've previously been disabled by invalid reverse merge attempt
                that.disableMergeButton( false );
            } );

        d3.select( '.action-buttons .merge' )
            .on( 'mouseenter', function() {
                this.focus();

                let mergeArrowFeatures = that.checkMergeArrowFeatures( feature, againstFeature );

                if ( d3.event.ctrlKey || d3.event.metaKey ) {

                    // if the from type is a way and the to type is a node then prevent the ctrlKey
                    // if invalid reverse merge, disable merge button
                    that.updateMergeArrow( mergeArrowFeatures.length > 2 ? ' delete' && that.disableMergeButton( true ) : 'reverse' );

                } else {
                    that.updateMergeArrow();
                }

                d3.select( this )
                    .on( 'keydown', () => {
                        if ( d3.event.ctrlKey || d3.event.metaKey ) {
                            that.updateMergeArrow( mergeArrowFeatures.length > 2 ? 'delete' && that.disableMergeButton( true ) : 'reverse' );
                        }
                    } )
                    .on( 'keyup', () => {
                        that.updateMergeArrow();
                    } );

            } )
            .on( 'mouseleave', function() {
                this.blur();

                that.updateMergeArrow( 'delete' );

            } );
    }

    updateMergeArrow( mode ) {
        if ( !Hoot.context.graph().entities[ this.mergeArrow.from.id ] ||
            !Hoot.context.graph().entities[ this.mergeArrow.to.id ] ) {
            Hoot.context.background().updateArrowLayer( {} );

            return;
        }

        let pt1   = d3.geoCentroid( this.mergeArrow.to.asGeoJSON( Hoot.context.graph() ) ),
            pt2   = d3.geoCentroid( this.mergeArrow.from.asGeoJSON( Hoot.context.graph() ) ),
            coord = [ pt1, pt2 ];

        if ( mode === 'reverse' ) coord = coord.reverse();

        let gj = mode === 'delete' ? {} : {
            type: 'LineString',
            coordinates: coord
        };


        Hoot.context.background().updateArrowLayer( gj );
    }
}
