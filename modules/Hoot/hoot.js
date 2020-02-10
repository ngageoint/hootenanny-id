/*******************************************************************************************************
 * File: hoot.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 8/16/18
 *******************************************************************************************************/

import '../../css/hoot/hoot.scss';

import _forEach from 'lodash-es/forEach';

import API                from './managers/api';
import MessageManager     from './managers/messages/messageManager';
import FolderManager      from './managers/folderManager';
import LayerManager       from './managers/layerManager';
import TranslationManager from './managers/translationManager';
import UserManager        from './managers/userManager';
import EventManager       from './managers/eventManager';
import UI                 from './ui/init';
import { tagInfo }        from '../../data/index';
import buildInfo          from './config/buildInfo.json';
import { duration }       from './tools/utilities';
import { utilStringQs }   from '../util';

class Hoot {
    constructor() {
        this.api          = new API( this );
        this.message      = new MessageManager( this );
        this.layers       = new LayerManager( this );
        this.folders      = new FolderManager( this );
        this.translations = new TranslationManager( this );
        this.users        = new UserManager( this );
        this.events       = new EventManager();
        this.duration     = duration;
        // this.user
        this.config = {
            tagInfo,
            appInfo: [],
            users: [],
            exportSizeThreshold: null,
            ingestSizeThreshold: null,
            conflateSizeThreshold: null,
            presetMaxDisplayNum: 12,
            privilegeIcons: {
                admin: 'how_to_reg',
                advanced: 'star'
            }
        };
    }

    async getAboutData() {
        try {
            let info = await Promise.all( [
                this.api.getCoreVersionInfo(),
                this.api.getServicesVersionInfo()
            ] );

            _forEach( info, d => this.config.appInfo.push( d ) );
        } catch ( err ) {
            // this.message.alert( err );
            return Promise.reject( err );
        }

        // build info will always be available
        this.config.appInfo.push( buildInfo );
    }

    async getAllUsers() {
        try {
            let resp = await this.api.getAllUsers();

            this.config.users = {};

            _forEach( resp, user => {
                this.config.users[ user.id ] = user;
            } );
        } catch ( err ) {
            // this.message.alert( err );
            return Promise.reject( err );
        }
    }

    async getMapSizeThresholds() {
        try {
            let thresholds = await this.api.getMapSizeThresholds();

            this.config.exportSizeThreshold   = thresholds.export_threshold;
            this.config.ingestSizeThreshold   = thresholds.ingest_threshold;
            this.config.conflateSizeThreshold = thresholds.conflate_threshold;
        } catch ( err ) {
            // this.message.alert( err );
            return Promise.reject( err );
        }
    }

    async getGrailMetadata() {
        const privileges = this.user().privileges;

        if ( privileges && privileges.advanced && privileges.advanced === 'true' ) {
            const { data } = await this.api.grailMetadataQuery();
            this.config.referenceLabel = data.railsLabel;
            this.config.secondaryLabel = data.overpassLabel;
            this.config.maxFeatureCount = Number(data.maxFeatureCount);
        }
    }

    init( context ) {
        let user;

        this.context = context;
        this.user = function () {
            if (!user) {
                user = JSON.parse( context.storage( 'user' ) );
            }

            return user;
        };

        if (!this.context.storage('history')) {
            this.context.storage('history', JSON.stringify({
                'bboxHistory':[]
            }));
        }

        let queryStringMap = utilStringQs(window.location.href);
        if (queryStringMap.hasOwnProperty('gpx') && queryStringMap.gpx.includes('task_gpx_geom')) {
            let [project, task] = new URL(queryStringMap.gpx).pathname.match(/\d+/g);
            this.context.storage('tm:project', 'memt_project_' + project);
            this.context.storage('tm:task', 'task_' + task);
        }

        Promise.all( [
            this.getAboutData(),
            this.getAllUsers(),
            this.getMapSizeThresholds(),
            this.getGrailMetadata(),
            this.translations.getTranslations(),
            this.users.init()
        ] );

        this.ui = new UI();
        this.ui.render();

        // prevent this class from being modified in any way.
        // this does not affect children objects
        Object.freeze( this );
    }
}

// Export this class as a "Singleton". When it is imported the very first time,
// it will create a new instance of the object and store it in memory. Every other
// import afterwards will receive this cached object instead of creating a new instance.

// * Note: This is not a true Singleton, but it mimics the Singleton pattern
// because of Node's module caching behavior.
export default new Hoot();
