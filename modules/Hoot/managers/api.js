/** ****************************************************************************************************
 * File: api.js
 * Project: hootenanny-ui
 * @author Matt Putipong on 3/2/18
 *******************************************************************************************************/

import _             from 'lodash-es';
import axios         from 'axios/dist/axios';
import { apiConfig } from '../config/apiConfig';

/**
 * API calls to backend services
 *
 * @returns {class} - API
 * @constructor
 */
export default class API {
    constructor() {
        this.config        = apiConfig;
        this.baseUrl       = `${ this.config.host }:${ this.config.port }/${ this.config.basePath }`;
        this.queryInterval = this.config.queryInterval;
        this.intervals     = {};
    }

    /**
     * Submit a request
     *
     * @param params - request data
     * @returns {Promise} - request
     */
    request( params ) {
        return axios( {
            url: params.url || `${ this.baseUrl }${ params.path }`,
            method: params.method || 'GET',
            headers: params.headers,
            data: params.data,
            params: params.params
        } );
    }

    internalError( { response } ) {
        if ( response.status > 500 ) {
            return 'API is not responding. Please try again later.';
        } else {
            return false;
        }
    }

    is404( { response } ) {
        return response.status >= 400;
    }

    /**
     * Recursively poll the backend to check the status of a job
     *
     * @param jobId
     * @returns {Promise<any>}
     */
    statusInterval( jobId ) {
        return new Promise( ( res, rej ) => {
            this.intervals[ jobId ] = setInterval( async () => {
                let { status } = await this.getJobStatus( jobId );

                // TODO: error handling
                if ( status !== 'running' ) {
                    clearInterval( this.intervals[ jobId ] );
                    res( { status, jobId } );
                }
            }, this.queryInterval );
        } );
    }

    /**
     * Get the status of an ongoing backend job
     *
     * @param id - job id
     * @returns {Promise} - job status
     */
    getJobStatus( id ) {
        const params = {
            path: `/job/status/${ id }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getCoreVersionInfo() {
        const params = {
            path: '/info/about/coreVersionInfo',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data )
            .catch( err => {
                const message = this.internalError( err ) || 'Unable to get Hootenanny core info';

                return Promise.reject( message );
            } );
    }

    getServicesVersionInfo() {
        const params = {
            path: '/info/about/servicesVersionInfo',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data )
            .catch( err => {
                const message = this.internalError( err ) || 'Unable to get Hootenanny services info';

                return Promise.reject( message );
            } );
    }

    /**
     * Get all layers from the database
     *
     * @returns {Promise|array} - layers
     */
    getLayers() {
        const params = {
            path: '/osm/api/0.6/map/layers',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => {
                let layers    = resp.data.layers,
                    layerList = [];

                if ( !layers || !layers.length )
                    return resp.data;

                return this.getMapSizes( _.map( layers, 'id' ) ).then( sizeInfo => {
                    _.map( layers, layer => {
                        _.assign( layer, _.find( sizeInfo.layers, { id: layer.id } ) );
                    } );

                    return layers;
                } );
            } )
            .catch( err => {
                const message = this.internalError( err ) || 'Unable to retrieve layers';

                return Promise.reject( message );
            } );
    }

    /**
     * Get all layer links from the database
     *
     * @returns {Promise|array} - links
     */
    getLinks() {
        const params = {
            path: '/osm/api/0.6/map/links',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data )
            .catch( err => {
                const message = this.internalError( err ) || 'Unable to retrieve layer links';

                return Promise.reject( message );
            } );
    }

    /**
     * Get all translations
     *
     * @returns {Promise|array} - translations
     */
    getTranslations() {
        const params = {
            path: '/ingest/customscript/getlist',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getTranslation( name ) {
        const params = {
            path: `/ingest/customscript/getscript?SCRIPT_NAME=${ name }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getDefaultTranslation( path ) {
        const params = {
            path: `/ingest/customscript/getdefaultscript?SCRIPT_PATH=${ path }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getBasemaps() {
        const params = {
            path: '/ingest/basemap/getlist',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    // TODO: remove this if not needed
    getTileNodesCount( data ) {
        const params = {
            path: '/osm/api/0.6/map/nodescount',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            data
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Get map tags using map ID
     *
     * @param mapId
     * @returns {Promise<any>}
     */
    getTags( mapId ) {
        const params = {
            path: `/osm/api/0.6/map/tags?mapid=${ mapId }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getMbr( mapId ) {
        const params = {
            path: `/osm/api/0.6/map/mbr?mapId=${ mapId }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data )
            .catch( err => {
                return {
                    'minlon': -180,
                    'minlat': -90,
                    'maxlon': 180,
                    'maxlat': 90,
                    'nodescount': 0
                };
            } );
    }

    getMapSizes( mapIds ) {
        if ( !mapIds ) {
            return null;
        }
        const params = {
            path: `/info/map/sizes?mapid=${ mapIds }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getMapSizeThresholds() {
        const params = {
            path: '/info/map/thresholds',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Get statistics on conflicts review process to see how many reviews are left
     * and how many have already been resolved
     *
     * @param mapId
     * @returns {Promise<any>}
     */
    getReviewStatistics( mapId ) {
        const params = {
            path: `/job/review/statistics?mapId=${ mapId }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getReviewRefs( queryElements ) {
        const params = {
            path: '/job/review/refs',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                queryElements
            }
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Get next review item in current conflicts review process
     *
     * @param mapId
     * @param sequence
     * @param direction
     * @returns {Promise<any>}
     */
    getNextReview( { mapId, sequence, direction } ) {
        const params = {
            path: `/job/review/next?mapid=${ mapId }&offsetseqid=${ sequence }&direction=${ direction }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getSchemaAttrValues( jobId ) {
        const params = {
            path: `/ogr/info/${ jobId }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Upload imported files to the database
     *
     * @param data - upload data
     * @returns {Promise} - request
     */
    uploadDataset( data ) {
        if ( !data.TRANSLATION || !data.INPUT_TYPE || !data.formData || !data.INPUT_NAME ) {
            return false;
        }

        const params = {
            path: '/ingest/ingest/upload',
            method: 'POST',
            params: {
                TRANSLATION: data.TRANSLATION,
                INPUT_TYPE: data.INPUT_TYPE,
                INPUT_NAME: data.INPUT_NAME,
                USER_EMAIL: 'test@test.com',
                NONE_TRANSLATION: data.NONE_TRANSLATION
            },
            data: data.formData
        };

        return this.request( params )
            .then( resp => this.statusInterval( resp.data[ 0 ].jobid ) );
    }

    /**
     * Upload imported schema files to the database for processing
     *
     * @param type - FILE | DIR
     * @param data - form data
     */
    uploadSchemaData( type, data ) {
        const params = {
            path: `/ogr/info/upload?INPUT_TYPE=${ type }`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data
        };

        return this.request( params )
            .then( resp => this.statusInterval( resp.data.jobId ) )
            .then( resp => resp.jobId );
    }

    uploadBasemap( data ) {
        const params = {
            path: `/ingest/basemap/upload?INPUT_NAME=${ data.INPUT_NAME }`,
            method: 'POST',
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            data: data.formData
        };

        return this.request( params )
            .then( resp => this.statusInterval( resp.data.jobId ) );
    }

    enableBasemap( data ) {
        const params = {
            path: `/ingest/basemap/enable?NAME=${ data.name }&ENABLE=true`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    disableBasemap( data ) {
        const params = {
            path: `/ingest/basemap/enable?NAME=${ data.name }&ENABLE=false`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    postTranslation( data ) {
        let payload = data.data;

        const params = {
            path: `/ingest/customscript/save?SCRIPT_NAME=${ data.NAME }&SCRIPT_DESCRIPTION=${ data.DESCRIPTION }`,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            data: payload
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Add a new folder to the database
     *
     * @param data - folder data
     * @returns {Promise} - request
     */
    addFolder( { folderName, parentId } ) {
        if ( !folderName || parentId < 0 ) {
            return false;
        }

        const params = {
            path: '/osm/api/0.6/map/addfolder',
            method: 'POST',
            params: {
                folderName,
                parentId
            }
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    updateMapFolderLinks( { mapId, folderId, updateType } ) {
        if ( !mapId || folderId < 0 ) return;

        const params = {
            path: '/osm/api/0.6/map/linkMapFolder',
            method: 'POST',
            params: {
                mapId,
                folderId,
                updateType
            }
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Get all folders from the database
     *
     * @returns {Promise|array} - folders
     */
    getFolders() {
        const params = {
            path: '/osm/api/0.6/map/folders',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Get missing features
     *
     * @param type - feature type (node | way | relation)
     * @param mapId - map ID
     * @param featIds - list of feature IDs to retrieve
     * @returns {Promise<any>}
     */
    getFeatures( type, mapId, featIds ) {
        const params = {
            path: `/osm/api/0.6/${ type }?mapId=${ mapId }&elementIds=${ featIds.join() }`,
            method: 'GET',
            headers: {
                'Content-Type': 'text/xml'
            }
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getAdvancedOptions( confType = 'custom' ) {
        const params = {
            path: `/info/advancedopts/getoptions?conftype=${ confType }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Delete a layer from the database
     *
     * @param layerName - name of layer to delete
     * @returns {Promise<any>}
     */
    deleteLayer( layerName ) {
        const params = {
            path: `/osm/api/0.6/map/delete?mapId=${ layerName }`,
            method: 'POST'
        };

        return this.request( params )
            .then( resp => this.statusInterval( resp.data.jobid ) );
    }

    deleteTranslation( name ) {
        const params = {
            path: `/ingest/customscript/deletescript?SCRIPT_NAME=${ name }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    deleteBasemap( name ) {
        const params = {
            path: `/ingest/basemap/delete?NAME=${ name }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    /**
     * Conflate layers together
     *
     * @param data
     * @returns {Promise<string>}
     */
    conflate( data ) {
        const params = {
            path: '/job/conflation/execute',
            method: 'POST',
            data
        };

        this.getAdvancedOptions();

        return this.request( params )
            .then( resp => this.statusInterval( resp.data.jobid ) )
            .then( () => data )
            .then( () => 'Conflation job complete' )
            .catch( err => {
                const message = this.internalError( err ) || 'Error during conflation! Please try again later.';

                return Promise.reject( message );
            } );
    }

    clipDataset( data ) {
        const params = {
            path: '/job/clipdataset/execute',
            method: 'POST',
            data
        };

        return this.request( params )
            .then( resp => this.statusInterval( resp.data.jobid ) );
    }

    /**
     * Merge POI nodes together
     *
     * @param data
     * @returns {Promise<any>}
     */
    poiMerge( data ) {
        let baseUrl = `${ this.config.host }:${ this.config.elementMergeServerPort }`;

        const params = {
            url: `${ baseUrl }/elementmerge`,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            data
        };

        return this.request( params )
            .then( resp => resp.data );
    }
}