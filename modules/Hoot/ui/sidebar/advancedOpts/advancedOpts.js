/*******************************************************************************************************
 * File: advancedOpts.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 4/23/18
 *******************************************************************************************************/

import _                 from 'lodash-es';
import API               from '../../../managers/api';
import AdvancedOptsData  from './advancedOptsData';
import AdvancedOptsLogic from './advancedOptsLogic';
import { d3combobox }    from '../../../../lib/hoot/d3.combobox';

export default class AdvancedOpts {
    constructor( context ) {
        this.context         = context;
        this.body            = context.container();
        this.sidebar         = d3.select( '#hoot-sidebar' );
        this.optTypes        = [ 'custom', 'horizontal', 'average', 'reference' ];
        this.advancedOptions = null;
        this.logic           = new AdvancedOptsLogic();
    }

    get isOpen() {
        return this.form.classed( 'visible' );
    }

    get parsedOptions() {
        if ( !this.selectedOpts ) {
            this.selectedOpts = this.data.generateSelectedValues( this.form );
        }

        return _.reduce( this.selectedOpts, ( str, opt ) => {
            if ( str.length > 0 ) str += ' ';

            str += `-D "${ opt.name }=${ opt.value }"`;

            return str;
        }, '' );
    }

    async init() {
        this.optTypes = [ 'custom', 'horizontal', 'average', 'reference' ];
        let allOpts   = await Promise.all( _.map( this.optTypes, type => API.getAdvancedOptions( type ) ) );

        this.advancedOptions = {
            base: allOpts[ 0 ],
            horizontal: allOpts[ 1 ],
            average: allOpts[ 2 ],
            reference: allOpts[ 3 ]
        };

        this.data = new AdvancedOptsData( _.cloneDeep( this.advancedOptions ) );

        this.render();
    }

    render() {
        this.defaultFields = this.data.getDefaultFields();
        this.fieldsMeta    = this.data.generateFields( this.defaultFields );

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
        let instance = this;

        let group = this.contentDiv.selectAll( '.form-group' )
            .data( this.fieldsMeta ).enter()
            .append( 'div' )
            .attr( 'id', d => d.id + '_group' )
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
                instance.createFormFields( d.children, d3.select( this ) );
            }
        } );
    }

    createFormFields( members, group ) {
        let instance = this;

        let fieldContainer = group.selectAll( '.hoot-form-field' )
            .data( members ).enter()
            .append( 'div' )
            .classed( 'hoot-form-field small contain', true )
            .classed( 'hidden', d => d.required === 'true' )
            .on( 'change', d => this.logic.handleFieldChange( d ) );

        fieldContainer
            .append( 'label' )
            .append( 'span' )
            .text( d => d.label );

        fieldContainer.select( function( d ) {
            let field = d3.select( this );

            switch ( d.type ) {
                case 'checkbox': {
                    instance.createCheckbox( field );
                    break;
                }
                case 'checkplus': {
                    instance.createCheckplus( field );
                    break;
                }
                case 'bool':
                case 'list': {
                    instance.createCombobox( field );
                    break;
                }
                case 'long':
                case 'int':
                case 'double':
                case 'string': {
                    instance.createTextField( field );
                    break;
                }
            }
        } );
    }

    createCheckbox( field ) {
        field.select( 'label' )
            .insert( 'input', ':first-child' )
            .attr( 'type', 'checkbox' )
            .attr( 'id', d => d.id )
            .classed( 'reset', true )
            .classed( 'checkbox-input', d => d.type === 'checkbox' )
            .classed( 'checkplus-input', d => d.type === 'checkplus' )
            .select( function( d ) {
                this.checked = d.placeholder === 'true';
            } );
    }

    createCheckplus( field ) {
        let instance = this;

        this.createCheckbox( field );

        field.select( function( d ) {
            if ( d.subchecks && d.subchecks.length ) {
                d3.select( this ).classed( 'has-children', true );
                instance.createFormFields( d.subchecks, field );

                field.selectAll( '.hoot-form-field' ).classed( d.id + '_child', true );
            }
        } );
    }

    createTextField( field ) {
        field.select( 'label' )
            .append( 'input' )
            .attr( 'type', 'text' )
            .attr( 'id', d => d.id )
            .attr( 'placeholder', d => d.placeholder )
            .select( function( d ) {
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

    createCombobox( field ) {
        let instance = this;

        field.select( 'label' )
            .append( 'input' )
            .attr( 'id', d => d.id )
            .attr( 'type', 'text' )
            .attr( 'placeholder', d => d.placeholder )
            .select( function( d ) {
                if ( d.combobox ) {
                    let combobox = d3combobox()
                        .data( _.map( d.combobox, n => {
                            return {
                                value: n.name,
                                title: n.name,
                                id: n.id
                            };
                        } ) );

                    d3.select( this )
                        .call( combobox );

                    instance.createSubGroup( field, d );
                }
            } );
    }

    createSubGroup( field, d ) {
        let instance  = this,
            fieldData = this.data.generateFields( d.combobox );

        field.selectAll( '.form-group' )
            .data( fieldData )
            .enter()
            .append( 'div' )
            .attr( 'id', s => s.label + '_engine_group')
            .classed( `form-group contain ${d.id}_group`, true )
            .classed( 'hidden', s => s.label !== d.placeholder )
            .select( function( s ) {
                if ( s.children && s.children.length ) {
                    field.classed( 'has-children', true );

                    instance.createFormFields( s.children, d3.select( this ) );
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
                this.selectedOpts = this.data.generateSelectedValues( this.form );

                console.log( this.selectedOpts );

                this.toggle();
            } );

        actionsContainer.append( 'button' )
            .classed( 'button alert round strong', true )
            .text( 'Cancel' );
    }
}