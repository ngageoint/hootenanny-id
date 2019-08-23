/*******************************************************************************************************
 * File: advancedOpts.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 4/23/18
 *******************************************************************************************************/

import _cloneDeep from 'lodash-es/cloneDeep';
import _map       from 'lodash-es/map';
import _isEmpty   from 'lodash-es/isEmpty';
import _isBoolean from 'lodash-es/isBoolean';

import { d3combobox } from '../../../lib/hoot/d3.combobox';
import { svgIcon }    from '../../../svg';
import { tooltip }    from '../../../util/tooltip';
import FormFactory    from '../../tools/formFactory';

let instance = null;
export default class AdvancedOpts {
    constructor() {
        this.sidebar         = d3.select( '#hoot-sidebar' );
        this.advancedOptions = [];
        this.conflationOptions = {};
    }

    static getInstance() {
        if (instance === null) {
            instance = new AdvancedOpts();
        }
        return instance;
    }

    getFactory() {
        if (!this.hasOwnProperty( 'factory' )) {
            this.factory = new FormFactory();
        }
        return this.factory;
    }


    get isOpen() {
        return this.form.classed( 'visible' );
    }

    async init() {
        if ( _isEmpty( this.conflationOptions ) ) {
            this.conflationOptions = await Hoot.api.getAdvancedOptions('conflationOptions');
        }
        if ( !this.advancedOptions.length ) {
            this.advancedOptions = await Hoot.api.getAdvancedOptions('hoot2');
            this.advancedOptions = this.advancedOptions.reduce(function(groups, d) {
                let group;
                if (['Attribute', 'Differential'].includes(d.name)) {
                    group = 0;
                } else if (['Cleaning', 'General'].includes(d.name)) {
                    group = 1;
                } else {
                    group = 2;
                }

                groups[group].push(d);
                groups[group] = groups[group].sort(function(a, b) { return a.name > b.name; });
                return groups;
            }, [[],[],[]]).flat();
            this.render(_cloneDeep(this.advancedOptions));
        }
    }

    render(advOpts) {
        this.createContainer();
        this.createHeader();
        this.createContentDiv();
        this.createGroups(advOpts);
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
        let header = this.form
                .append( 'div' )
                .classed( 'advanced-opts-header big keyline-bottom flex justify-between align-center', true );

        header
            .append( 'div' )
            .classed( 'title', true )
            .text( 'Advanced Conflation Options' );

        // reset button
        header
            .append( 'div' )
            .append( 'button' )
            .classed( 'advanced-opts-reset button secondary strong', true )
            .text( 'Reset' )
            .on( 'click', () => this.createGroups() );
    }

    createContentDiv() {
        this.contentDiv = this.form
            .append( 'div' )
            .classed( 'advanced-opts-content', true )
            .style( 'opacity', 0 );

        this.contentDiv
            .transition()
            .duration( 400 )
            .style( 'opacity', 1 );
    }

    toggleOption(d, shouldHide) {
        let label = d3.select( `#${d.name}_label` ),
            parent = d3.select( `#${d.name}_group` );

        parent
            .select( '.group-toggle-caret-wrap' )
            .classed( 'toggle-disabled', shouldHide );

        label
            .classed( 'adv-opt-title-disabled', !label.classed( 'adv-opt-title-disabled' ) );

        if (shouldHide) {
            parent.select( '.group-body' )
                .classed( 'hidden', true );
        }
    }

    innerWrap(toggleInput, toggleOption) {
        let d = toggleInput.datum(),
            innerWrap = toggleInput.selectAll( '.adv-opts-inner-wrap' )
                .data([ 0 ]);

        innerWrap.exit().remove();

        let innerWrapEnter = innerWrap.enter()
            .append( 'div' )
            .classed( 'adv-opts-inner-wrap adv-opts-input' , true);

        innerWrap = innerWrap.merge(innerWrapEnter);

        let innerWrapLeft = innerWrap.selectAll( '.adv-opts-inner-wrap-left' )
            .data([ 0 ]);

        innerWrapLeft.exit().remove();

        let innerWrapLeftEnter = innerWrapLeft.enter()
            .append( 'div' )
            .classed( 'adv-opts-inner-wrap-left', true );


        innerWrapLeft = innerWrapLeft.merge(innerWrapLeftEnter);

        if ( d.name !== 'Cleaning' && d.name !== 'General' && d.name !== 'Attribute' ) {
            let innerInput = innerWrapLeft.selectAll( '.conflate-type-toggle' )
                .data( [ d ] );

            innerInput.exit().remove();

            let innerInputEnter = innerInput.enter()
                .append( 'input' )
                .attr( 'type', 'checkbox' )
                .attr( 'id', d => `${d.name}-toggle` )
                .classed( 'conflate-type-toggle', true );


            innerInput.merge(innerInputEnter)
                .property( 'checked', true )
                .on( 'click', toggleOption );
        }


        let innerLabelWrap = innerWrap.selectAll( '.adv-opt-title-wrap' )
            .data( [ d ] );

        innerLabelWrap.exit().remove();

        let innerLabelWrapEnter = innerLabelWrap.enter()
            .append( 'div' )
            .classed( 'adv-opt-title-wrap', true );


        innerLabelWrap = innerLabelWrap.merge(innerLabelWrapEnter);

        innerLabelWrap
            .on('click', d => {
                let toggle = d3.select( `#${d.name}-toggle`),
                    checked = toggle.property( 'checked' );

                toggle.property( 'checked', !checked );

                toggleOption( d, checked );
            } );

        let innerLabel = innerLabelWrap.selectAll( '.adv-opt-title' )
            .data([ d ]);

        innerLabel.exit().remove();

        let innerLabelEnter = innerLabel.enter()
            .append( 'span' )
            .classed( 'adv-opt-title', true );

        innerLabel.merge(innerLabelEnter)
            .attr( 'id', d => `${ d.name }_label` )
            .classed( 'adv-opt-title-disabled', false )
            .text( d => `${d.label} Options` );
    }

    caretWrap(toggleInput) {
        let d = toggleInput.datum(),
            caretWrap = toggleInput
                .selectAll( '.group-toggle-caret-wrap' )
                .data( [ d ] );

        caretWrap.exit().remove();

        let caretWrapEnter = caretWrap.enter()
            .append( 'div' )
            .classed( 'group-toggle-caret-wrap', true)
            .append( 'div' )
            .attr( 'class', 'adv-opt-toggle' )
            .classed( 'combobox-caret', d => d.members.length )
            .on( 'click', function(d) {
                if (d.members.length) {
                    let body      = d3.select( `#${ d.name }_group` ).select( '.group-body' ),
                        bodyState = body.classed( 'hidden' );

                    body.classed( 'hidden', !bodyState );
                    body.classed( 'keyline-bottom', bodyState );
                }
            });

        caretWrap.merge(caretWrapEnter);
    }

    fieldLabel(fieldContainer) {
        let d = fieldContainer.datum(),
            fieldLabelWrap = fieldContainer
                .selectAll( '.hoot-field-label-wrap' )
                .data([ d ]);

        fieldLabelWrap.exit().remove();

        let fieldLabelWrapEnter = fieldLabelWrap.enter()
            .append( 'div' )
            .classed('hoot-field-label-wrap', true);

        fieldLabelWrap = fieldLabelWrap.merge(fieldLabelWrapEnter);

        fieldLabelWrap
            .attr( 'id', d => `${d.id}-label-wrap`)
            .classed( 'adv-opts-header fill-light keyline-bottom round-top', true )
            .classed( 'keyline-bottom', d => d.input !== 'checkbox' )
            .classed( 'round-left hoot-field-title-checkbox-wrap keyline-right', d => d.input === 'checkbox' );

        let fieldLabel = fieldLabelWrap.selectAll( '.hoot-field-label' )
            .data( [ d ] );

        fieldLabel.exit().remove();

        let fieldLabelEnter = fieldLabel.enter()
            .append( 'label' )
            .classed( 'hoot-field-label', true )
            .text( d => d.label );

        fieldLabel.merge(fieldLabelEnter);
    }

    fieldInput(fieldContainer, isCleaning) {
        let d = fieldContainer.datum(),
            fieldInputWrap = fieldContainer
                .selectAll( '.hoot-field-input-wrap' )
                .data([ d ]);

        fieldInputWrap.exit().remove();

        let fieldInputWrapEnter = fieldInputWrap.enter()
            .append('div')
            .classed( 'hoot-field-input-wrap', true);

        fieldInputWrap = fieldInputWrap.merge(fieldInputWrapEnter);

        fieldInputWrap
            .classed( 'hoot-field-input-checkbox-wrap', d => d.input === 'checkbox' );

        let fieldInput = fieldInputWrap.selectAll( '.hoot-field-input' )
            .data( [ d ] );

        fieldInput.exit().remove();

        let fieldInputEnter = fieldInput.enter()
            .append( 'input' )
            .attr( 'class', 'hoot-field-input' )
            .attr( 'type', d => d.input === 'checkbox' ?  'checkbox' : 'text' ); // combobox & text get text input...

        fieldInput = fieldInput.merge(fieldInputEnter);

        fieldInput
            .attr( 'placeholder', d => d.placeholder )
            .attr( 'disabled', d => d.disabled )
            .attr( 'readonly', d => d.readonly )
            .property( 'checked', isCleaning );

        const type = fieldInput.datum().input;
        if ( type === 'checkbox' ) {
            fieldInput
                .property( 'checked', d => d.default === 'true' )
                .on( 'click', function(d) {
                    d.send = JSON.parse( d.default ) !== d3.select( this ).property( 'checked' );
                });
        } else {
            fieldInput
                .property( 'value', d => d.default );

            if ( type === 'combobox' ) {
                let d = fieldInput.datum(),
                    comboData = _map(d.data, n => {
                    const t = d.itemKey ? n[ d.itemKey ] : n,
                        v = d.valueKey ? n[ d.valueKey ] : t;
                        return { value: v, title: t };
                } );

                if ( d.sort ) {
                    comboData = comboData.sort((a, b) => {
                        let textA = a.value.toLowerCase(),
                            textB = b.value.toLowerCase();

                        return textA < textB ? -1 : textA > textB ? 1 : 0;
                    } );
                }

                fieldInput
                    .classed( 'form-field-combo-input', true )
                    .attr( 'autocomplete', 'off' )
                    .call(d3combobox().data( comboData ))
                    .on( 'change', function(d) {
                        d.send =  d3.select( this ).property( 'value' ) !== d.default;
                    })
                    .on( 'keyup', function(d) {
                        d.send =  d3.select( this ).property( 'value' ) !== d.default;
                    });

            } else { // text input...
                fieldInput
                    .classed( 'text-input', true)
                    .on( 'keyup', function(d) {
                        let value = d3.select( this ).property( 'value' );
                        d.send = value !== d.default;
                        if ([ 'double', 'int', 'long' ].indexOf ( d.type ) !== -1 ) {
                            d3.select( `#${d.id}-label-wrao` )
                                .call(self.notNumber, value);
                        }
                    });
            }

        }

    }

    notNumber(selection, value) {
        let isNumber = !isNaN( value ),
            notNumber = selection
                .selectAll( '.not-number-warning' )
                .data([ 0 ]);

        let notNumberEnter = notNumber.enter()
            .append( 'span' )
            .classed( 'not-number-warning', true );

        notNumber = notNumber.merge(notNumberEnter);
        notNumber.classed( 'hidden', isNumber );

        if ( notNumber.selectAll( '.tooltip' ).empty() ) {
            notNumber
                .call(svgIcon('#iD-icon-alert', 'deleted'))
                .call(tooltip().title('this option must be a number!'));

            notNumber.selectAll( '.tooltip-arrow' )
                .classed( 'hidden', true );

            notNumber.selectAll( '.tooltip-inner' )
                .style( 'background-color', 'rgba(0,0,0,0)')
                .style( 'border', 'none');

        }

        notNumber.dispatch( isNumber ? 'mouseleave' : 'mouseenter' );
    }

    createGroups(advOpts) {
        let self = this,
            group = this.contentDiv
                .selectAll( '.form-group' )
                .data( advOpts );

        group.exit()
            .remove();

        let groupEnter = group.enter()
            .append( 'div' )
            .classed( 'form-group', true )
            .attr( 'id', d => `${d.name}_group`);

        group = group.merge(groupEnter);

        group.each(function(d) {
            let group = d3.select( this ),
                groupToggle = group.selectAll( '.group-toggle' )
                    .data( [ 0 ] );

            groupToggle.exit().remove();

            let groupToggleEnter = groupToggle.enter()
                .append( 'div' )
                .classed( 'group-toggle', true );

            groupToggle = groupToggle.merge(groupToggleEnter);

            let toggleWrap = groupToggle.selectAll( '.inner-wrapper' )
                .data( [ d ] );

            toggleWrap.exit().remove();

            let toggleWrapEnter = toggleWrap.enter()
                .append( 'div' )
                .attr( 'class', 'inner-wrapper strong fill-light keyline-bottom adv-opts-toggle-wrap' )
                .attr( 'id', d => `${d.name}-wrap` );

            toggleWrap = toggleWrap.merge(toggleWrapEnter);

            toggleWrap
                .call(self.innerWrap, self.toggleOption)
                .call(self.caretWrap);

            if ( d.name === 'Attribute' ) {
                let isAttribute = d3.select( '#conflateType' ).property( 'value' ) === 'Attribute';
                group.select( '.adv-opt-title' )
                    .classed( 'adv-opt-title-disabled', !isAttribute );

                group.select( '.adv-opt-toggle' )
                    .classed( 'toggle-disabled', !isAttribute );
            }



            let groupBody = group.selectAll( '.group-body' )
                .data( [ d ] );

            groupBody.exit().remove();

            let groupBodyEnter = groupBody.enter()
                .append( 'div' )
                .classed( 'group-body fill-white', true );

            groupBody = groupBody.merge(groupBodyEnter);

            groupBody
                .classed( 'hidden', true );

            let fieldContainer = groupBody.selectAll( '.hoot-form-field' )
                .data( d => d.members );

            fieldContainer.exit().remove();

            let fieldContainerEnter = fieldContainer.enter()
                .append( 'div' )
                .attr( 'id', d => d.id )
                .classed( 'hoot-form-field small contain keyline-all round', true );

            fieldContainer = fieldContainer.merge(fieldContainerEnter);

            fieldContainer
                .classed( 'hoot-form-field-wrap', true )
                .classed( 'hoot-form-field-checkbox', d => d.input === 'checkbox' )
                .classed( 'hoot-form-field-input', d => d.input !== 'checkbox' );

            const isCleaning = d.name === 'Cleaning';

            fieldContainer.each(function(d) {
                let fieldContainer = d3.select( this );

                fieldContainer
                    .call(self.fieldLabel)
                    .call(self.fieldInput, isCleaning );
            });

        });
    }

    /**
     * Returns list of all conflation types with unchecked (disabled) checkboxes...
     */
    getDisabledFeatures() {
        let disabledFeatures = [];
        this.contentDiv
            .selectAll( '.conflate-type-toggle' )
            .each(function(d) {
                let selection = d3.select( this );

                if ( !selection.property( 'checked' ) ) {
                    disabledFeatures.push(selection.datum().label.replace(/ to /, ''));
                }
            } );

        return disabledFeatures;
    }

    getOptions() {
        let conflationOptions = this.conflationOptions;

        function shouldSend( d, conflateType, value ) {
            let shouldSend = true;

            if ( conflateType === 'reference' ) {
                return shouldSend;
            }

            let confOption = conflationOptions[conflateType][ d.id ];

            if ( confOption && (d.input === 'checkbox' ? JSON.parse(confOption) : confOption) === value ) {
                shouldSend = false;
            }

            return shouldSend;
        }

        function empty( value ) {
            return !_isBoolean( value ) && _isEmpty( value );
        }

        let options = { advanced: {}, cleaning: [] };
        let conflateType = d3.select( '#conflateType' ).property( 'value' ).toLowerCase();
        this.contentDiv.selectAll( '.form-group' ).each( function(d) {
            let selection = d3.select( this );
            let isCleaning = d.name === 'Cleaning';

            selection.selectAll( '.hoot-form-field' ).each( function(d) {
                if ( !d.send ) {
                    return; // if no d.send, then input value never changed from default...
                }

                const value = d3.select( this ).select( 'input' )
                    .property( d.input === 'checkbox' ? 'checked' : 'value' );

                if ( empty( value ) || !shouldSend( d, conflateType, value ) ) {
                    return; // if no value or value is equal to default in conflateOption config...
                }

                if ( !isCleaning ) {
                    options.advanced[ d.id ] = value;
                } else {
                    options.cleaning.push( d.id );
                }
            });
        });

        return options;
    }
}
