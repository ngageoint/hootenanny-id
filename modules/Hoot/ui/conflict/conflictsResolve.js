/*******************************************************************************************************
 * File: conflictsResolve.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 5/24/18
 *******************************************************************************************************/

import HootOSM from '../../managers/hootOsm';
import Event   from '../../managers/eventManager';

/**
 * @class ConflictsResolve
 */
export default class ConflictsResolve {
    /**
     * @param instance - conflict class
     */
    constructor( instance ) {
        this.instance = instance;
        this.context  = instance.context;
        this.sidebar  = instance.context.hoot.sidebar;
        this.data     = instance.data;
    }

    /**
     * Resolve current review item
     */
    retainFeature() {
        let reviewItem      = this.data.currentReviewItem,
            currentRelation = this.instance.graphSync.getCurrentRelation();

        if ( reviewItem ) {
            if ( currentRelation ) {
                for ( let i = 0; i < currentRelation.members.length; i++ ) {
                    let key = i + 1;

                    d3.selectAll( `.review-feature${ key }` )
                        .classed( `highlight review-feature${ key }`, false );
                }

                this.instance.graphSync.updateReviewTagsForResolve( currentRelation );
            }

            this.instance.info.tableContainer.remove();

            let hasChanges = this.context.history().hasChanges();

            if ( hasChanges ) {
                HootOSM.save( this.data.mergedItems, false, () => {
                    this.data.mergedItems = [];
                    this.instance.traverse.jumpTo( 'forward' );
                } );
            }
        } else {
            // TODO: alert nothing to review
        }
    }

    /**
     * Save any unsaved items and resolve all remaining reviewables
     *
     * @param layer - review layer
     */
    acceptAll( layer ) {
        let hasChanges = this.context.history().hasChanges();

        if ( hasChanges ) {
            HootOSM.save( this.data.mergedItems, false, () => {
                this.performAcceptAll( layer );
            } );
        } else {
            this.performAcceptAll( layer );
        }
    }

    /**
     * Resolve all remaining reviewables
     *
     * @param layer - review layer
     */
    performAcceptAll( layer ) {
        let conflateController = this.sidebar.conflateForm.controller,
            key                = {
                name: layer.name,
                id: layer.id,
                color: layer.color
            };

        // enter controller refresh state
        conflateController.text.html( 'Refreshing &#8230;' );

        // update layer
        HootOSM.removeLayer( layer.id );
        HootOSM.loadLayer( key );

        // exit controller refresh state
        conflateController.text.html( layer.name );

        Event.send( 'review-complete' );
    }
}