/*******************************************************************************************************
 * File: layerConflate.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 4/5/18
 *******************************************************************************************************/

import _find    from 'lodash-es/find';
import _forEach from 'lodash-es/forEach';

import SidebarForm                from './sidebarForm';
import AdvancedOpts               from './advancedOpts';
import FormFactory                from '../../tools/formFactory';
import { layerConflateForm }      from '../../config/domMetadata';

class LayerConflate extends SidebarForm {
    constructor( container, d ) {
        super( container, d );
    }

    async getData() {
        let that = this;
        await Hoot.api
            .getConflateTypes()
            .then(conflateTypes => that.conflateTypes = conflateTypes);
    }

    render( layers ) {
        this.folderList = Hoot.folders.folderPaths;

        this.selectedLayers = {
            primary: _find( layers, layer => layer.refType === 'primary' ),
            secondary: _find( layers, layer => layer.refType === 'secondary' )
        };

        this.defaultFolderId = Hoot.layers.findBy('id', parseInt(this.selectedLayers.primary.id, 10)).folderId
                    || Hoot.layers.findBy('id', parseInt(this.selectedLayers.secondary.id, 10)).folderId;

        this.defaultFolder = _find( this.folderList, folder => folder.id === this.defaultFolderId);

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
        this.algorithmInput      = d3.select( '#conflateAlgorithm' );
        this.refLayerInput       = d3.select( '#conflateRefLayer' );
        this.collectStatsInput   = d3.select( '#conflateCollectStats' );
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

    async createAdvancedOptions() {
        this.advancedOptions = AdvancedOpts.getInstance();
        await this.advancedOptions.init();

        d3.select( '#advanced-opts-toggle' )
            .on( 'click', () => this.advancedOptions.toggle() );
    }

    getSaveName( data ) {
        let newName = this.subCompare( data, 4 );

        if ( !newName.found ) {
            return 'Merged_' + Math.random().toString( 16 ).substring( 7 );
        }
        else {
            return Hoot.layers.checkLayerName('Merged_' + newName.substring);
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

        data.INPUT1             = Hoot.layers.findLoadedBy( 'refType', 'primary' ).id;
        data.INPUT2             = Hoot.layers.findLoadedBy( 'refType', 'secondary' ).id;
        data.INPUT1_TYPE        = 'DB';
        data.INPUT2_TYPE        = 'DB';
        data.OUTPUT_NAME        = Hoot.layers.checkLayerName(this.saveAsInput.property( 'value' ));
        data.OUTPUT_FOLDER      = parseInt(this.folderPathInput.attr( '_value' ), 10);
        data.REFERENCE_LAYER    = (Hoot.layers.findLoadedBy( 'name', this.refLayerInput.node().value).refType === 'primary') ? '1' : '2';
        data.COLLECT_STATS      = this.collectStatsInput.property( 'value' );
        data.DISABLED_FEATURES  = this.advancedOptions.getDisabledFeatures();
        data.CONFLATION_TYPE    = this.typeInput.property( 'value' ).replace( /(Cookie Cutter & | w\/ Tags)/, '' );
        data.HOOT_2             = true;

        let { advanced, cleaning } = this.advancedOptions.getOptions();
        data.HOOT2_ADV_OPTIONS = advanced;
        data.CLEANING_OPTIONS = cleaning;

        switch ( data.CONFLATION_TYPE ) {
            case 'Differential': {
                data.CONFLATION_COMMAND = 'conflate-differential';
                break;
            }
            case 'Differential w/Tags': {
                data.CONFLATION_TYPE = 'Differential';
                data.CONFLATION_COMMAND = 'conflate-differential-tags';
                break;
            }
            default: {
                data.CONFLATION_COMMAND = 'conflate';
            }
        }

        if ( data.HOOT2_ADV_OPTIONS.hasOwnProperty( 'RoadEngines' ) && data.HOOT2_ADV_OPTIONS.RoadEngines === 'Network' ) {
            data.CONFLATION_ALGORITHM = 'Network';
            delete data.HOOT2_ADV_OPTIONS.RoadEngines;
        }

        return data;
    }

    updateAttributeReferenceLayer() {
        if ( this.typeInput.property('value') === 'Attribute' ) {
            this.refLayerInput.property('value' , Hoot.layers.findLoadedBy( 'refType', 'secondary' ).name);
        } else {
            this.refLayerInput.property('value' , Hoot.layers.findLoadedBy( 'refType', 'primary' ).name);
        }
    }


    postConflation( params ) {
        let layers = Hoot.layers.loadedLayers;


        _forEach( layers, d => Hoot.layers.hideLayer( d.id ) );
//handle layer not found here
        params.id     = Hoot.layers.findBy( 'name', params.name ).id;
        params.refType = 'merged';
        params.isMerged = true;
        params.layers = layers;
        Hoot.layers.loadLayer( params );
    }

    handleSubmit() {
        d3.event.stopPropagation();
        d3.event.preventDefault();

        let data   = this.preConflation(),
            params = {
                name: data.OUTPUT_NAME,
                color: 'green',
                isConflating: true,
                isMerged: true
            };

        if ( this.advancedOptions.isOpen ) {
            this.advancedOptions.toggle();
        }


        return Hoot.api.conflate( data )
            .then( resp => {
                params.jobId = resp.data.jobid;

                this.loadingState( params );

                // hide input layer controllers
                this.controller.hideInputs();

                return Hoot.api.statusInterval( resp.data.jobid );
            })
            .then( resp => {
                let message;
                if (resp.data && resp.data.status === 'cancelled') {
                    message = 'Conflation job cancelled';
                } else {
                    message = 'Conflation job complete';
                }

                Hoot.message.alert( {
                    data: resp.data,
                    message: message,
                    status: 200,
                    type: resp.type
                } );

                return resp;
            } )
            .then( async (resp) => {
                if (resp.data && resp.data.status !== 'cancelled') {
                    await Hoot.folders.refreshAll();
                    Hoot.events.emit( 'render-dataset-table' );
                }
                return resp;
            } )
            .then( (resp) => {
                if (resp.data && resp.data.status !== 'cancelled') {
                    // remove input layer controllers
                    d3.selectAll( '.add-controller' ).remove();

                    this.postConflation( params );
                }
            } )
            .catch( err => {
                console.error(err);
                let message, status, type, keepOpen = true;

                status = err.status;
                type   = err.type;

                // check for services error
                if (status >= 400 && status < 500) {
                    message = err.data.split('\n')[0];
                } else if (status >= 500) { // check for command line error
                    message = err.data.commandDetail[0].stderr;
                } else {
                    message = 'Error running conflation';
                }

                // restore input layer controllers
                this.controller.restoreInputs();

                Hoot.message.alert( { message, type, keepOpen } );

            } );
    }

    forceAdd( params ) {
        this.createForm();
        this.loadingState( params );
    }
}

export default LayerConflate;
