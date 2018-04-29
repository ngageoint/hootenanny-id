/*******************************************************************************************************
 * File: sidebarAdvancedOptions.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 4/23/18
 *******************************************************************************************************/

import _                  from 'lodash-es';
import API                from '../../control/api';
import FieldsRetriever    from '../models/advancedOptions/fieldsRetriever';
import SelectionRetriever from '../models/advancedOptions/selectionRetriever';

export default class SidebarAdvancedOptions {
    constructor( context ) {
        this.context         = context;
        this.body            = context.container();
        this.sidebar         = d3.select( '#sidebar' );
        this.optTypes        = [ 'custom', 'horizontal', 'average', 'reference' ];
        this.advancedOptions = null;
    }

    async init() {
        let allOpts = await Promise.all( _.map( this.optTypes, type => API.getAdvancedOptions( type ) ) );

        this.advancedOptions = {
            base: allOpts[ 0 ],
            horizontal: allOpts[ 1 ],
            average: allOpts[ 2 ],
            reference: allOpts[ 3 ]
        };

        this.fieldsRetriever = new FieldsRetriever( _.cloneDeep( this.advancedOptions ) );

        this.render();
    }

    render() {
        this.defaultFields = this.fieldsRetriever.getDefaultFields();
        this.fieldsMeta    = this.fieldsRetriever.generateFields( this.defaultFields );

        this.createContainer();
        this.createHeader();
        this.createContentDiv();
        this.createGroups();
        this.createButtons();
    }

    toggle() {
        let formState = this.form.classed( 'visible' );

        this.form.classed( 'visible', !formState );
        this.overlay.classed( 'visible', !formState );
        d3.select( '#sidebar-resizer' ).classed( 'light', !formState );
    }

    createContainer() {
        this.form = this.sidebar.append( 'div' )
            .attr( 'id', 'advanced-opts-panel' )
            .classed( 'fill-white', true )
            .style( 'margin-left', () => this.sidebar.node().getBoundingClientRect().width = 'px' );

        this.overlay = d3.select( '#content' ).append( 'div' )
            .classed( 'map-overlay overlay', true );
    }

    createHeader() {
        let header = this.form.append( 'div' )
            .classed( 'advanced-opts-header big keyline-bottom', true )
            .append( 'h3' )
            .text( 'Advanced Conflation Options' );

        header.append( 'div' )
            .classed( 'fr _icon close pointer', true );
    }

    createContentDiv() {
        this.contentDiv = this.form.append( 'div' )
            .classed( 'advanced-opts-content', true );
    }

    createGroups() {
        let self = this;

        let group = this.contentDiv.selectAll( '.form-group' )
            .data( this.fieldsMeta ).enter()
            .append( 'div' )
            .classed( 'form-group', true );

        let groupToggle = group.append( 'div' )
            .classed( 'group-toggle', true )
            .on( 'click', function() {
                let parent    = d3.select( this ).node().parentNode,
                    body      = d3.select( parent ).select( '.group-body' ),
                    bodyState = body.classed( 'hidden' );

                body.classed( 'hidden', !bodyState );
            } );

        groupToggle.append( 'div' )
            .classed( 'inner-wrapper strong fill-light keyline-top keyline-bottom', true )
            .append( 'span' )
            .attr( 'id', d => `${ d.id }_label` )
            .text( d => d.label );

        let groupBody = group.append( 'div' )
            .classed( 'group-body fill-white hidden', true );

        groupBody.select( function( d ) {
            if ( d.children && d.children.length ) {
                self.createFormFields( d.children, d3.select( this ) );
            }
        } );
    }

    createFormFields( members, group ) {
        let self = this;

        let fieldContinaer = group.selectAll( '.form-field' )
            .data( members ).enter()
            .append( 'div' )
            .classed( 'form-field small contain', true );

        fieldContinaer.select( function( d ) {
            let field = d3.select( this );

            // TODO: multilist
            switch ( d.type ) {
                case 'checkbox': {
                    self.createCheckbox( field );
                    break;
                }
                case 'checkplus': {
                    self.createCheckplus( field );
                    break;
                }
                case 'long':
                case 'int':
                case 'double':
                case 'string': {
                    self.createTextField( field );
                    break;
                }
            }
        } );
    }

    createCheckbox( field ) {
        let label = field.append( 'label' )
            .attr( 'title', d => d.description );

        label.append( 'input' )
            .attr( 'type', 'checkbox' )
            .attr( 'id', d => d.id )
            .attr( 'name', d => _.snakeCase( d.label ) )
            .classed( 'reset', true )
            .select( function( d ) {
                this.checked = d.placeholder === 'true';
            } );

        label.append( 'span' )
            .text( d => d.label );
    }

    createCheckplus( field ) {
        let self = this;

        this.createCheckbox( field );

        field.select( function( d ) {
            if ( d.subchecks && d.subchecks.length ) {
                d3.select( this ).classed( 'has-children', true );
                self.createFormFields( d.subchecks, field );
            }
        } );
    }

    createTextField( field ) {
        field.append( 'label' )
            .text( d => d.label )
            .property( 'title', d => d.description );

        field.append( 'input' )
            .attr( 'type', 'text' )
            .attr( 'id', d => d.id )
            .attr( 'placeholder', d => d.placeholder )
            .classed( '' );

        field.select( function( d ) {
            let node = d3.select( this );

            if ( d.minvalue ) {
                node.attr( 'min', d.minvalue > 0 ? d.minvalue : 'na' );
            }

            if ( d.maxvalue ) {
                node.attr( 'max', d.maxvalue > 0 ? d.maxvalue : 'na' );
            }

            if ( d.onchange ) {
                node.on( 'change', () => {
                } );
            }
        } );
    }

    createButtons() {
        let actionsContainer = this.form.append( 'div' )
            .classed( 'advanced-opts-actions keyline-top', true );

        actionsContainer.append( 'button' )
            .classed( 'button primary round strong', true )
            .text( 'Apply' )
            .on( 'click', () => {
                let selectionRetriever = new SelectionRetriever( this.form, this.defaultFields );

                this.selectedVals = selectionRetriever.generateSelectedValues();
            } );

        actionsContainer.append( 'button' )
            .classed( 'button alert round strong', true )
            .text( 'Cancel' );
    }
}