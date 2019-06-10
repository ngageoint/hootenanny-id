/*******************************************************************************************************
 * File: sidebar.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 4/10/18
 *******************************************************************************************************/

import _filter  from 'lodash-es/filter';
import _forEach from 'lodash-es/forEach';
import _find    from 'lodash-es/find';

import LayerAdd      from './layerAdd';
import LayerConflate from './layerConflate';
import LayerReview   from './layerReview';

import {
    utilQsString,
    utilStringQs
}                       from '../../../util';
import { uiBackground } from '../../../ui';

/**
 * Create the sidebar
 *
 * @constructor
 */
export default class Sidebar {
    constructor() {
        this.iDSidebar = d3.select( '#sidebar' );

        this.forms = {};

        let formMeta = [
            {
                type: 'add',
                id: 'reference',
                class: 'layer-add',
                tableId: 'add-ref-table',
                refType: 'primary',
                color: 'violet',
                toggleButtonText: 'Add Reference Dataset'
            },
            {
                type: 'add',
                id: 'secondary',
                class: 'layer-add',
                tableId: 'add-secondary-table',
                refType: 'secondary',
                color: 'orange',
                toggleButtonText: 'Add Secondary Dataset'
            },
            {
                type: 'conflate',
                id: 'conflate',
                class: 'layer-conflate',
                toggleButtonText: 'Conflate'
            },
            {
                type: 'review',
                id: 'review',
                class: 'layer-review',
                toggleButtonText: 'Complete Review'
            }
        ];

        this.addFormData      = _filter( formMeta, form => form.type === 'add' );
        this.conflateFormData = _filter( formMeta, form => form.type === 'conflate' );
        this.reviewFormData   = _filter( formMeta, form => form.type === 'review' );
    }

    /**
     * Render all view inside sidebar
     */
    async render() {
        this.iDSidebar.classed( 'col4', false );
        this.iDSidebar.select( '.sidebar-component' ).remove();
        this.container = this.iDSidebar.append( 'div' )
            .attr( 'id', 'hoot-sidebar' )
            .classed( 'hoot-sidebar', true );

        this.createWrapper();
        await this.createForms();
        this.adjustSize();

        this.listen();

        return this;
    }

    createWrapper() {
        this.wrapper = this.container.append( 'div' )
            .classed( 'wrapper', true );
    }

    /**
     * Bind form data and create a form for each item
     */
    createForms() {
        let that = this;

        this.wrapper.selectAll( '.layer-add' )
            .data( this.addFormData ).enter()
            .select( function( d ) {
                that.forms[ d.id ] = new LayerAdd( d3.select( this ), d );
                that.forms[ d.id ].render();
            } );

        this.wrapper.selectAll( '.layer-conflate' )
            .data( this.conflateFormData ).enter()
            .select( async function( d ) {
                try {
                    const layerConflate = new LayerConflate( d3.select( this), d );
                    await layerConflate.getData();
                    that.forms[ d.id ] = layerConflate;
                } catch (e) {
                    throw e;
                }
            } );
    }

    layerLoaded() {
        _forEach( this.forms, form => {
            let loadedLayer = Hoot.layers.findLoadedBy( 'name', form.loadingLayerName );
            if ( loadedLayer != null ) {

                if ( loadedLayer.merged ) {
                    Hoot.layers.mergedLayer = loadedLayer;
                }

                form.controller.update();
                form.loadingLayerName = null;
                this.saveChanges();
                this.conflateCheck();
            }
        } );
    }

    layerMerged() {
        let that = this;

        let layer = Hoot.layers.mergedLayer;

        Hoot.layers.mergedLayer = null;

        this.wrapper
            .selectAll( '.layer-review' )
            .data( this.reviewFormData ).enter()
            .select( function() {
                that.reviewLayer = new LayerReview( d3.select( this ), layer );

                that.reviewLayer.render();
            } );
    }

    layerRemoved( d ) {
        if ( d.id === 'conflate' ) {
            Hoot.layers.loadedLayers = {};
            Hoot.layers.mergedLayer = null;
            delete this.forms[ d.id ];
            this.reset();
        }
        else {
            this.forms[ d.id ].render( d );
            this.conflateCheck();

            if (Object.keys(Hoot.layers.loadedLayers).length === 1) {
                let loadedLayer    = Object.values(Hoot.layers.loadedLayers)[0];
                if (loadedLayer.refType === 'primary') {
                    d3.select('#reference button.select-active-layer').remove();
                } else {
                    d3.select('#secondary button.select-active-layer').remove();
                }
            }

            //update url hash
            var q = utilStringQs(window.location.hash.substring(1));
            delete q[d.refType];
            window.location.replace('#' + utilQsString(q, true));
        }

        uiBackground.renderLayerToggle();
        this.adjustSize();
    }

    saveChanges() {
        let loadedLayers    = Object.values(Hoot.layers.loadedLayers);
        let selectReference = d3.selectAll('#reference');
        let selectSecondary = d3.selectAll('#secondary');
        let referenceActive = _find(loadedLayers, function(a, b) { return a.refType === 'primary'; });
        let secondaryActive = _find(loadedLayers, function(a, b) { return a.refType === 'secondary'; });

        if (loadedLayers.length === 2) {
            let changeActive    = new LayerAdd();

            // eslint-disable-next-line no-inner-declarations
            function updateButton(active, inactive) {

                if (active) {
                    d3.select(`#${active}`)
                        .classed('active-pulse', true);

                    d3.select(`#${active}  button.select-active-layer`)
                        .text('Active Layer')
                        .classed('button-active', true);

                    d3.select(`#${active} div.controller`)
                        .classed('disable-non-active', false);

                    d3.select(`#${active} button.delete-button`)
                        .classed('disable-non-active', false);
                }

                if (inactive) {
                    d3.select(`#${inactive}`)
                        .classed('active-pulse', false);

                    d3.select(`#${inactive}  button.select-active-layer`)
                        .text('Set as active layer')
                        .classed('button-active', false);

                    d3.select(`#${inactive} div.controller`)
                        .classed('disable-non-active', true);

                    d3.select(`#${inactive} button.delete-button`)
                        .classed('disable-non-active', true);
                }

            }

            // eslint-disable-next-line no-inner-declarations
            function onClickActive(layerName) {
                return function() {
                    let selection = d3.select(this);
                    let activeButton = selection.select('button.select-active-layer');
                    let setAsActive = activeButton.text() === 'Set as active layer';
                    let currentLayer = layerName === 'reference'
                        ? { refType: 'primary',  layerName: 'reference', otherLayer: 'secondary' }
                        : { refType: 'secondary', layerName: 'secondary', otherLayer: 'reference'};

                    let loadedLayers = Object.values(Hoot.layers.loadedLayers);

                    if (setAsActive) {
                        Object.values(loadedLayers).forEach(function(layer) {
                            layer.activeLayer = layer.refType === currentLayer.refType ? true : null;
                        });
                        updateButton(currentLayer.layerName, currentLayer.otherLayer);
                    } else {
                        loadedLayers.find(function(layer){ return layer.refType === currentLayer.refType; }).activeLayer = null;
                        updateButton(null, currentLayer.layerName);
                        updateButton(null, currentLayer.otherLayer);
                    }
                    activeButton.text(setAsActive ? 'Active Layer': 'Set as active layer');
                };

            }

            if (d3.select('#reference button.select-active-layer').empty()) {

                selectReference
                    .append('button')
                    .classed('select-active-layer', true)
                    .text('Set as active layer');

                if (referenceActive.activeLayer === true) {
                    d3.select('#reference button.select-active-layer')
                        .classed('select-active-layer', true)
                        .text('Active Layer');

                    updateButton('reference', 'secondary');

                }

                selectReference.on('click', onClickActive('reference'));
            }

            if (d3.select('#secondary button.select-active-layer').empty()) {

                selectSecondary
                    .append('button')
                    .classed('select-active-layer', true)
                    .text('Set as active layer');


                if (secondaryActive.activeLayer === true) {

                    d3.select('#secondary button.select-active-layer')
                        .classed('select-active-layer', true)
                        .text('Active Layer');

                    updateButton('secondary', 'reference');
                }

                selectSecondary.on('click', onClickActive('secondary'));

            }
        }
    }

    conflateCheck() {
        let loadedLayers   = Object.values( Hoot.layers.loadedLayers ),
            addControllers = d3.selectAll( '.add-controller' );

        if ( loadedLayers.length === 2 ) {
            if ( !this.forms.conflate.exists ) {
                this.forms.conflate.render( loadedLayers );
            }
        } else if ( addControllers.size() > 0 ) {
            this.forms.conflate.remove();
        }
    }

    removeLayerAddForms() {
        delete this.forms.reference;
        delete this.forms.secondary;
    }

    reset() {
        this.wrapper.selectAll( '.sidebar-form' ).remove();

        this.createForms();
    }

    adjustSize() {
        let sidebarWidth = this.iDSidebar.node().getBoundingClientRect().width,
            sidebarForm     = d3.selectAll( '.sidebar-form' );

        if ( sidebarWidth < 291 ) { // small
            sidebarForm.classed( 'small', true );
            sidebarForm.classed( 'medium', false );
            sidebarForm.classed( 'large', false );
        } else if ( sidebarWidth < 361 ) { // medium
            sidebarForm.classed( 'small', false );
            sidebarForm.classed( 'medium', true );
            sidebarForm.classed( 'large', false );
        } else { // large
            sidebarForm.classed( 'small', false );
            sidebarForm.classed( 'medium', false );
            sidebarForm.classed( 'large', true );
        }
    }

    listen() {
        Hoot.events.on( 'layer-loaded', layerName => this.layerLoaded( layerName ) );
        Hoot.events.on( 'layer-merged', () => this.layerMerged() );

        window.onresize = () => this.adjustSize();
    }
}
