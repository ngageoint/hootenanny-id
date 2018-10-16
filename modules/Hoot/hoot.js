/*******************************************************************************************************
 * File: hoot.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 8/16/18
 *******************************************************************************************************/

import _forEach from 'lodash-es/forEach';

import API                from './managers/api';
import MessageManager     from './managers/messages/messageManager';
import FolderManager      from './managers/folderManager';
import LayerManager       from './managers/layerManager';
import TranslationManager from './managers/translationManager';
import EventManager       from './managers/eventManager';
import UI                 from './ui/init';
import buildInfo          from './config/buildInfo.json';
import { tagInfo }        from '../../data/index';

class Hoot {
    constructor() {
        this.api          = new API( this );
        this.message      = new MessageManager( this );
        this.layers       = new LayerManager( this );
        this.folders      = new FolderManager( this );
        this.translations = new TranslationManager( this );
        this.events       = new EventManager();

        this.config = {
            urlroot: 'http://52.23.188.104:8080/hoot-services/osm',
            tagInfo,
            appInfo: [],
            users: [],
            exportSizeThreshold: null,
            ingestSizeThreshold: null,
            conflateSizeThreshold: null,
            presetMaxDisplayNum: 12
        };
    }

    init( context ) {
        if ( this.ui && this.ui instanceof UI ) return;

        this.context = context;

        Promise.all( [
            this.getAboutData(),
            this.getAllUsers(),
            this.getMapSizeThresholds(),
            this.translations.getTranslations()
        ] );

        this.ui = new UI();
        this.ui.render();

        // prevent this class from being modified in any way.
        // this does not affect children objects
        Object.freeze( this );
    }

    async getAboutData() {
        try {
            let info = await Promise.all( [
                this.api.getCoreVersionInfo(),
                this.api.getServicesVersionInfo()
            ] );

            _forEach( info, d => this.config.appInfo.push( d ) );
        } catch ( err ) {
            this.message.alert( err );
        }

        // build info will always be available
        this.config.appInfo.push( buildInfo );
    }

    async getAllUsers() {
        try {
            let resp = await this.api.getAllUsers();

            this.config.users = {};

            _forEach( resp.users, user => {
                this.config.users[ user.id ] = user;
            } );
        } catch ( err ) {
            this.message.alert( err );
        }
    }

    async getMapSizeThresholds() {
        try {
            let thresholds = await this.api.getMapSizeThresholds();

            this.config.exportSizeThreshold   = thresholds.export_threshold;
            this.config.ingestSizeThreshold   = thresholds.ingest_threshold;
            this.config.conflateSizeThreshold = thresholds.conflate_threshold;
        } catch ( err ) {
            this.message.alert( err );
        }
    }
}

// Export this class as a "Singleton". When it is imported the very first time,
// it will create a new instance of the object and store it in memory. Every other
// import afterwards will receive this cached object, and not create a new instance.

// * Note: This is not a true Singleton, but it mimics the Singleton pattern
// because of Node's module caching behavior.
export default new Hoot();
