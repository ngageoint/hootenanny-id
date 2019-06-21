/*******************************************************************************************************
 * File: exportData.js
 * Project: hootenanny-ui
 * @author Max Grossman - max.grossman@radiantsolutions.com on 2/12/19
 *******************************************************************************************************/

import FormFactory       from '../../tools/formFactory';
import { exportDataForm } from '../../config/domMetadata';

import _flattenDeep from 'lodash-es/flattenDeep';
import _isEmpty from 'lodash-es/isEmpty';

export default class ExportData {
    constructor( translations, d, type ) {
        const isDatasets = type === 'Datasets';
        this.translations = translations;
        this.input = isDatasets ? d.map(n => n.name).join(',') : d.data.name;
        this.id = isDatasets ? d.map(n => n.id).join(',') : d.data.id;
        this.type = type;
        this.form = exportDataForm.call(this, isDatasets );
    }

    render() {
        let metadata = {
            title: `Export ${this.type}: ${this.input}`,
            form: this.form,
            button: {
                text: 'Export',
                location: 'right',
                id: 'exportDatasetBtn',
                onClick: () => this.handleSubmit()
            }
        };

        this.formFactory = new FormFactory();
        this.container = this.formFactory.generateForm( 'body', 'export-data-form', metadata );
        this.translationSchemaCombo = this.container.select( '#exportTranslationCombo' );
        this.exportFormatCombo = this.container.select( '#exportFormatCombo' );
        this.appendToFgdbCheckbox = this.container.select( '#exportAppendFgdb' );
        this.includeHootTagsCheckbox = this.container.select( '#exportHootTags' );
        this.dataExportNameTextInput = this.container.select( '#dataExportNameTextInput' );
        this.submitButton = this.container.select( '#exportDatasetBtn' );
        this.submitButton.attr('disabled', null);

        if ( this.type === 'Datasets' ) {
            this.dataExportNameTextInput.attr( 'placeholder', this.input.split(',').join('_') );
        }

        let container = this.container;
        Hoot.events.once( 'modal-closed', () => {
            container.remove();
        });

        return this;
    }

    validate ( name ) {
        this.formValid = this.validateFields( this.translationSchemaCombo.node(), name ) &&
            this.validateFields( this.exportFormatCombo.node(), name );

        this.updateButtonState();
    }

    validateFields( d, name ) {
        let id              = d.id,
            target          = d3.select( `#${id}` ),
            invalid         = !target.property( 'value' ).length;

        if ( id === name ) {
            target.classed( 'invalid', invalid );
        }

        return !invalid;
    }

    validateTextInput ( d, name ) {
        let id               = d.id,
            target           = d3.select( `#${id}` ),
            node             = target.node(),
            str              = node.value,

            unallowedPattern = new RegExp( /[~`#$%\^&*+=\-\[\]\\';\./!,/{}|\\":<>\?|]/g ),
            valid            = true;

        if ( !str.length || unallowedPattern.test( str )) {
            valid = false;
        }
        if ( id === name ) {
            target.classed( 'invalid', !valid );
        }

        return valid;
    }

    updateButtonState() {
        this.submitButton.node().disabled = !this.formValid;
    }

    getTranslationPath() {
        const selectedTranslation = this.translationSchemaCombo.node().value;
        const translation = this.translations.find( t => t.NAME === selectedTranslation );
        return !translation.hasOwnProperty('PATH')  ? translation.EXPORTPATH : translation.PATH;
    }

    getOutputType() {
        return {
            'Shapefile': 'shp',
            'File Geodatabase': 'gdb',
            'OpenStreetMap (OSM)': 'osm',
            'OpenStreetMap (PBF)': 'osm.pbf',
            'GeoPackage (GPKG)': 'gpkg'
        }[this.exportFormatCombo.node().value];
    }

    loadingState() {
        this.submitButton
            .select( 'span' )
            .text( 'Cancel Export' );

        // overwrite the submit click action with a cancel action
        this.submitButton.on( 'click', () => {
            Hoot.api.cancelJob(this.jobId);
        } );

        this.submitButton
            .append( 'div' )
            .classed( '_icon _loading float-right', true )
            .attr( 'id', 'importSpin' );

        this.container.selectAll( 'input' )
            .each( function() {
                d3.select( this ).node().disabled = true;
            } );
    }

    getInputType() {
        let type;
        switch ( this.type ) {
            case 'Dataset': {
                type = 'db';
                break;
            }
            case 'Datasets': {
                type = 'dbs';
                break;
            }
            case 'Folder' : {
                type = 'folder';
                break;
            }
            default: break;
        }
        return type;
    }

    getOutputName() {
        let output;
        switch (this.type) {
            case 'Datasets': {
                let input = this.dataExportNameTextInput.property( 'value' );
                output = _isEmpty( input ) ? this.dataExportNameTextInput.attr( 'placeholder' ) : input;
                break;
            }
            default: {
                output = this.input;
                break;
            }
        }
        return output;
    }

    handleSubmit() {
        let self = this,
            data = {
                input: self.id,
                inputtype: self.getInputType(),
                append: self.appendToFgdbCheckbox.property( 'checked' ),
                includehoottags: self.includeHootTagsCheckbox.property( 'checked' ),
                outputname: self.getOutputName(),
                outputtype: self.getOutputType(),
                tagoverrides: {},
                textstatus: false,
                translation: self.getTranslationPath()
            };

        this.loadingState();

        this.processRequest = Hoot.api.exportDataset(data)
            .then( resp => {
                this.jobId = resp.data.jobid;

                return Hoot.api.statusInterval( this.jobId );
            } )
            .then( async resp => {
                if (resp.data && resp.data.status !== 'cancelled') {
                    await Hoot.api.saveDataset( this.jobId, data.outputname );
                }
                return resp;
            } )
            .then( resp => {
                Hoot.events.emit( 'modal-closed' );

                return resp;
            })
            .then( resp => {
                let message;
                if (resp.data && resp.data.status === 'cancelled') {
                    message = 'Export job cancelled';
                } else {
                    const dataType = data.inputType === 'Folder' ? 'folder' : 'Dataset';
                    message = `'${data.outputname}' ${dataType} Exported`;
                }

                Hoot.message.alert( {
                    data: resp.data,
                    message: message,
                    status: 200,
                    type: resp.type
                } );

                return resp;
            } )
            .catch( (err) => {
                console.error(err);
                let message = 'Error running export',
                    type = err.type,
                    keepOpen = true;

                Hoot.message.alert( { message, type, keepOpen } );
            } );
        }

}
