/*******************************************************************************************************
 * File: modifyFolder.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 8/31/18
 *******************************************************************************************************/

import _find from 'lodash-es/find';
import _get  from 'lodash-es/get';

import FormFactory           from '../../tools/formFactory';
import { modifyDatasetForm } from '../../config/domMetadata';

export default class ModifyFolder {
    constructor( d ) {
        this.data       = d.data;
        this.folderList = Hoot.folders._folders;
        this.form       = modifyDatasetForm.call( this );
    }

    render() {
        // remove layer name input
        this.form.splice( 2, 1 );
        this.pathName = _get( _find( this.folderList, folder => folder.id === this.data.parentId ), 'path' ) || 'root';

        // Because dataset and folder share the same settings we had to set a trigger here to tell the formFactory
        // that we want root in the path dropdown
        const pathComboboxSettings = _find( this.form, formItem => formItem.itemKey === 'path' );
        pathComboboxSettings.includeRoot = true;

        let metadata = {
            title: 'Modify Folder',
            form: this.form,
            button: {
                text: 'Modify',
                location: 'right',
                id: 'modifySubmitBtn',
                onClick: () => this.handleSubmit()
            }
        };

        this.container = new FormFactory().generateForm( 'body', 'modify-folder-form', metadata );

        this.folderNameInput       = this.container.select( '#modifyName' );
        this.pathNameInput         = this.container.select( '#modifyPathName' );
        this.folderVisibilityInput = this.container.select( '#modifyVisibility' );
        this.submitButton          = this.container.select( '#modifySubmitBtn' );

        this.folderNameInput.property( 'value', this.data.name );
        this.pathNameInput.property( 'value', this.pathName );
        this.folderVisibilityInput.property( 'checked', this.data.public );
        this.submitButton.node().disabled = false;

        return this;
    }

    validateTextInput( d ) {
        let target           = d3.select( `#${ d.id }` ),
            node             = target.node(),
            str              = node.value,

            reservedWords    = [ 'root', 'dataset', 'dataset', 'folder' ],
            unallowedPattern = new RegExp( /[~`#$%\^&*+=\-\[\]\\';\./!,/{}|\\":<>\?|]/g ),
            valid            = true;

        if ( !str.length ||
            reservedWords.indexOf( str.toLowerCase() ) > -1 ||
            unallowedPattern.test( str ) ) {
            valid = false;
        }

        target.classed( 'invalid', !valid );

        if ( this.container.selectAll( '.text-input.invalid' ).size() > 0 ) {
            valid = false;
        }

        this.submitButton.node().disabled = !valid;
    }

    async handleSubmit() {
        let folderName = this.folderNameInput.property( 'value' ),
            pathName   = this.pathNameInput.property( 'value' ),
            isPublic   = this.folderVisibilityInput.property( 'checked' ),
            folderId   = _get( _find( Hoot.folders._folders, folder => folder.path === pathName ), 'id' ) || 0;

        // We do this because if user only changes visibility
        if ( ( folderName !== this.data.name || pathName !== this.pathName ) && Hoot.folders.exists( folderName, folderId ) ) {
            let message = 'A folder already exists with this name in the destination path. Please remove the old folder or select a new name for this folder.',
                type    = 'warn';

            Hoot.message.alert( { message, type } );
            return false;
        } else if ( folderId === this.data.id ) {
            let message = 'You cannot move a folder inside of itself. Please select a different folder.',
                type    = 'warn';

            Hoot.message.alert( { message, type } );
            return false;
        }

        let modParams = {
            mapId: this.data.id,
            inputType: this.data.type,
            modName: folderName
        };

        let updateParams = {
            folderId: this.data.id,
            parentId: folderId
        };

        let visibilityParams = {
            folderId: this.data.id,
            visibility: (isPublic) ? 'public' : 'private'
        };

        let requests = [];
        let message = 'Successfully ';

        if ( folderName !== this.data.name ) {
            requests.push( Hoot.api.modify( modParams ) );
            message += 'renamed folder';
        }

        if ( pathName !== this.pathName ) {
            requests.push( Hoot.api.updateFolder( updateParams ) );
            if (message.substr(-1) !== ' ') message += ' & ';
            message += 'moved folder';
        }

        if ( this.data.public !== isPublic ) {
            requests.push( Hoot.api.updateVisibility( visibilityParams ) );
            if (message.substr(-1) !== ' ') message += ' & ';
            message += `changed visibility to ${ visibilityParams.visibility }`;
        }

        this.processRequest = Promise.all(requests)
            .then( () => Hoot.folders.refreshAll() )
            .then( () => Hoot.events.emit( 'render-dataset-table' ) )
            .then( () => {
                let type = 'success';
                Hoot.message.alert( { message, type } );
            } )
            .catch( (err) => {
                Hoot.message.alert( err );
            })
            .finally( () => {
                this.container.remove();
                Hoot.events.emit( 'modal-closed' );
            } );

    }
}
