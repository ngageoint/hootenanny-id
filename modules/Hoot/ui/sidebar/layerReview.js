/*******************************************************************************************************
 * File: layerReview.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 4/29/18
 *******************************************************************************************************/

import ExportData from '../modals/exportData';
import SidebarForm from './sidebarForm';

/**
 * @class LayerReview
 */
export default class LayerReview extends SidebarForm {
    /**
     * @param container - div to render UI in
     * @param layer - merged layer
     */
    constructor( container, layer ) {
        super( container );

        this.layer = layer;
        this.conflicts = Hoot.ui.conflicts;
    }

    /**
     * Render UI of layer review form
     */
    render() {
        super.render();

        this.fieldset = this.innerWrapper.append( 'fieldset' );

        this.reviewInfo = this.fieldset.append( 'div' )
            .classed( 'hoot-form-field', true )
            .append( 'span' )
            .classed( '_icon info review-count', true )
            .text( 'There are 0 reviews' );

        this.acceptAll = this.fieldset.append( 'div' )
            .classed( 'hoot-form-field', true )
            .append( 'a' )
            // .attr( 'href', '!#' )
            .text( 'Resolve all remaining reviews' )
            .on( 'click', () => {
                d3.event.stopPropagation();
                d3.event.preventDefault();

                this.conflicts.resolve.acceptAll( this.layer );
            } );

        this.conflicts.init( this.layer )
            .then( () => this.listen() );
    }

    /**
     * Update the number of remaining reviews
     *
     * @param text - text to replace old text
     */
    updateReviewCount( text ) {
        this.reviewInfo.text( text );
    }

    removeReviewUI() {
        Hoot.ui.conflicts.deactivate();
    }
    /**
     * Update text to reflect that all reviews have been resolved.
     * Display buttons to export data or to add another datasets
     */
    reviewComplete() {
        this.reviewInfo.text( 'All reviews resolved!' );
        this.acceptAll.remove();

        let layer = this.layer;
        let btnContainer = this.fieldset.append('div')
            .classed( 'hoot-form-field action-container', true );

        btnContainer.append( 'button' )
            .classed( 'button secondary small strong round', true )
            .text('Export Data')
            .on('click', async () => {
                let translations = (await Hoot.api.getTranslations()).filter( t => t.CANEXPORT);
                new ExportData(translations, { data: layer }, 'Dataset' ).render();
            });

        btnContainer.append('button')
            .classed('button dark text-light small strong round', true)
            .text('Add Another Dataset')
            .on('click', async () => {
                await Hoot.layers.refreshLayers();
                Hoot.layers.removeAllLoadedLayers();
                await Hoot.layers.addHashLayer('reference', layer.id);
            });
    }

    /**
     * Listen for events
     */
    listen() {
        Hoot.events.on( 'meta-updated', text => this.updateReviewCount( text ) );
        Hoot.events.on( 'review-complete', () => this.reviewComplete() );
        Hoot.events.on( 'loaded-layer-removed', () => this.removeReviewUI() );
    }
}
