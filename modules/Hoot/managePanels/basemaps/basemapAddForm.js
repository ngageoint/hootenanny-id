/*******************************************************************************************************
 * File: basemapAddForm.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 7/6/18
 *******************************************************************************************************/

import API                from '../../control/api';
import FormFactory        from '../../models/formFactory';
import { basemapAddForm } from '../../config/formMetadata';

export default class BasemapAddForm {
    constructor( instance ) {
        this.instance = instance;
        this.form     = basemapAddForm.call( this );
    }

    render() {
        let metadata = {
            title: 'Publish New Basemap',
            form: this.form,
            button: {
                text: 'Publish',
                id: 'basemapAddBtn',
                onClick: () => this.handleSubmit()
            }
        };

        this.container = new FormFactory().generateForm( 'body', 'basemap-add-form', metadata );

        this.fileInput    = d3.select( '#basemapFileImport' );
        this.fileIngest   = d3.select( '#ingestFileUploader' );
        this.nameInput    = d3.select( '#basemapName' );
        this.submitButton = d3.select( '#basemapAddBtn' );
    }

    handleMultipartChange() {
        let fileName = this.fileIngest.node().files[ 0 ].name,
            saveName = fileName.indexOf( '.' ) ? fileName.substring( 0, fileName.indexOf( '.' ) ) : fileName;

        this.fileInput.property( 'value', saveName );

        if ( !this.nameInput.property( 'value' ).length ) {
            this.nameInput.property( 'value', saveName );
        }

        this.updateButtonState();
    }

    validateTextInput( d ) {
        let target     = d3.select( `#${ d.id }` ),
            fieldValid = target.property( 'value' );

        target.classed( 'invalid', !fieldValid );
        this.updateButtonState();
    }

    updateButtonState() {
        let fileVal = this.fileInput.property( 'value' ),
            nameVal = this.nameInput.property( 'value' );

        let formValid = fileVal.length && nameVal.length;

        this.submitButton.node().disabled = !formValid;
    }

    handleSubmit() {

    }
}