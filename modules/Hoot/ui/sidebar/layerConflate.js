/*******************************************************************************************************
 * File: layerConflate.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 4/5/18
 *******************************************************************************************************/

import _find    from 'lodash-es/find';
import _forEach from 'lodash-es/forEach';

import SidebarForm                from './sidebarForm';
import AdvancedOpts               from './advancedOpts/advancedOpts';
import FormFactory                from '../../tools/formFactory';
import { layerConflateForm }      from '../../config/domMetadata';

class LayerConflate extends SidebarForm {
    constructor( container, d ) {
        super( container, d );
    }

    render( layers ) {
        this.folderList = Hoot.folders.folderPaths;

        this.selectedLayers = {
            primary: _find( layers, layer => layer.refType === 'primary' ),
            secondary: _find( layers, layer => layer.refType === 'secondary' )
        };

        this.formData = layerConflateForm.call( this, layers );

        super.render();

        this.createFieldset();
        this.createLayerRefThumbnails( layers );
        this.createAdvancedOptions();
        this.createButtons();

        this.saveAsInput         = d3.select( '#conflateSaveAs' );
        this.folderPathInput     = d3.select( '#conflateFolderPath' );
        this.newFolderNameInput  = d3.select( '#conflateNewFolderName' );
        this.typeInput           = d3.select( '#conflateType' );
        this.refLayerInput       = d3.select( '#conflateRefLayer' );
        this.collectStatsInput   = d3.select( '#conflateCollectStats' );
        this.generateReportInput = d3.select( '#conflateGenerateReport' );
    }

    createFieldset() {
        this.fieldset = new FormFactory().createFieldSets( this.innerWrapper, this.formData );
    }

    createLayerRefThumbnails( layers ) {
        this.fieldset.insert( 'div', ':first-child' )
            .classed( 'conflate-ref center contain', true )
            .selectAll( '.thumb' )
            .data( layers ).enter()
            .append( 'div' )
            .attr( 'class', d => `thumb round _icon data light contain inline fill-${ d.color }` );
    }

    createButtons() {
        let actions = this.fieldset.append( 'div' )
            .classed( 'hoot-form-field action-container pill', true );

        actions.append( 'button' )
            .classed( 'button secondary round small strong', true )
            .text( 'Cancel' )
            .on( 'click', async () => {
                let message = 'All changes will be undone. Are you sure you want to cancel?',
                    confirm = await Hoot.message.confirm( message );

                if ( confirm ) {
                    this.toggle();
                }
            } );

        this.submitButton = actions.append( 'button' )
            .classed( 'button dark text-light round small strong', true )
            .text( 'Conflate' )
            .on( 'click', () => this.handleSubmit() );
    }

    createAdvancedOptions() {
        this.advancedOptions = new AdvancedOpts();
        this.advancedOptions.init();

        let advancedOptionsToggle = d3.select( '#advanced-opts-toggle' );

        advancedOptionsToggle.on( 'click', () => {
            if ( this.advancedOptions.isOpen ) {
                this.advancedOptions.control.saveOrCancel();
            } else {
                this.advancedOptions.toggle();
            }
        } );
    }


    changeAdvancedOptions() {
        this.advancedOptions.clear();
    }

    getSaveName( data ) {
        let newName = this.subCompare( data, 4 );

        if ( !newName.found ) {
            return 'Merged_' + Math.random().toString( 16 ).substring( 7 );
        }
        else {
            return 'Merged_' + newName.substring + '_' + Math.random().toString( 16 ).substring( 7 );
        }
    }

    subCompare( words, min_substring_length ) {
        let needle   = words[ 0 ].name,
            haystack = words[ 1 ].name;

        min_substring_length = min_substring_length || 1;

        for ( let i = needle.length; i >= min_substring_length; i-- ) {
            for ( let j = 0; j <= (needle.length - i); j++ ) {
                let substring = needle.substr( j, i ),
                    k         = haystack.indexOf( substring );

                if ( k !== -1 ) {
                    return {
                        found: 1,
                        substring: substring,
                        needleIndex: j,
                        haystackIndex: k
                    };
                }
            }
        }

        return {
            found: 0
        };
    }

    validateTextInput( d ) {
        let target           = d3.select( `#${ d.id }` ),
            node             = target.node(),
            str              = node.value,

            reservedWords    = [ 'root', 'dataset', 'dataset', 'folder' ],
            unallowedPattern = new RegExp( /[~`#$%\^&*+=\-\[\]\\';\./!,/{}|\\":<>\?|]/g ),
            valid            = true;

        if ( reservedWords.indexOf( str.toLowerCase() ) > -1 || unallowedPattern.test( str ) ) {
            valid = false;
        }

        if ( node.id === 'conflateSaveAs' && !str.length ) {
            valid = false;
        }

        target.classed( 'invalid', !valid );
        this.formValid = valid;
        this.updateButtonState();
    }

    updateButtonState() {
        let self = this;

        this.form.selectAll( '.text-input' )
            .each( function() {
                let classes = d3.select( this ).attr( 'class' ).split( ' ' );

                if ( classes.indexOf( 'invalid' ) > -1 ) {
                    self.formValid = false;
                }
            } );

        this.submitButton.node().disabled = !this.formValid;
    }

    preConflation() {
        let data = {};

        data.TIME_STAMP         = '' + new Date().getTime();
        data.CONFLATION_COMMAND = 'conflate';
        data.INPUT1             = Hoot.layers.findLoadedBy( 'refType', 'primary' ).id;
        data.INPUT2             = Hoot.layers.findLoadedBy( 'refType', 'secondary' ).id;
        data.INPUT1_TYPE        = 'DB';
        data.INPUT2_TYPE        = 'DB';
        data.OUTPUT_NAME        = this.saveAsInput.node().value;
        data.CONFLATION_TYPE    = this.typeInput.node().value;
        data.REFERENCE_LAYER    = '1';
        data.GENERATE_REPORT    = this.generateReportInput.node().value;
        data.COLLECT_STATS      = this.collectStatsInput.node().value;
        data.ADV_OPTIONS        = this.advancedOptions.data.getParsedValues();
        data.USER_EMAIL         = 'test@test.com';
        
        return data;
    }

    postConflation( params ) {
        let layers = Hoot.layers.loadedLayers;


        _forEach( layers, d => Hoot.layers.hideLayer( d.id ) );

        params.id     = Hoot.layers.findBy( 'name', params.name ).id;
        params.merged = true;
        params.layers = layers;

        Hoot.layers.loadLayer( params )
            .then( () => Hoot.folders.updateFolders( this.innerWrapper ) );
    }

    handleSubmit() {
        d3.event.stopPropagation();
        d3.event.preventDefault();

        let data   = this.preConflation(),
            params = {
                name: data.OUTPUT_NAME,
                color: 'green',
                isConflate: true
            };

        // remove reference layer controllers
        d3.selectAll( '.add-controller' ).remove();

        if ( this.advancedOptions.isOpen ) {
            this.advancedOptions.toggle();
        }

        this.loadingState( params );

        return Hoot.api.conflate( data )
            .then( resp => Hoot.message.alert( resp ) )
            .catch( err => {
                Hoot.ui.sidebar.reset();
                Hoot.message.alert( err );

                return false;
            } )
            .then( () => Hoot.layers.refreshLayers() )
            .then( () => this.postConflation( params ) );
    }

    forceAdd( params ) {
        this.createForm();
        this.loadingState( params );
    }
}

export default LayerConflate;
