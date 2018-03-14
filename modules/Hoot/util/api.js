/** ****************************************************************************************************
 * File: api.js
 * Project: hootenanny-ui
 * @author Matt Putipong on 3/2/18
 *******************************************************************************************************/

import _ from 'lodash-es';
import axios from 'axios/dist/axios';
import config from '../config/apiConfig';

class API {
    constructor() {
        this.config  = config;
        this.baseUrl = `${ this.config.host }:${ this.config.port }`;
    }

    request( params ) {
        return axios( {
            url: `${ this.baseUrl }${ params.path }`,
            method: params.method || 'GET',
            data: params.data,
            params: params.params
        } );
    }

    upload( data ) {
        if ( !data.TRANSLATION || !data.INPUT_TYPE || !data.formData || !data.INPUT_NAME ) {
            return false;
        }

        let url = '/hoot-services/ingest/ingest/upload' +
            `?TRANSLATION=${ data.TRANSLATION }` +
            `&INPUT_TYPE=${ data.INPUT_TYPE }` +
            `&INPUT_NAME=${ data.INPUT_NAME }` +
            '&USER_EMAIL=null' +
            `&NONE_TRANSLATION=${ data.NONE_TRANSLATION }`;

        const params = {
            path: '/hoot-services/ingest/ingest/upload',
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

        return this.request( params );
    }

    getFolders() {
        const params = {
            path: '/hoot-services/osm/api/0.6/map/folders',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getLayers() {
        const params = {
            path: '/hoot-services/osm/api/0.6/map/layers',
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
            } );
    }

    getLinks() {
        const params = {
            path: '/hoot-services/osm/api/0.6/map/links',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getTranslations() {
        const params = {
            path: '/hoot-services/ingest/customscript/getlist',
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }

    getMapSizes( mapIds ) {
        if ( !mapIds ) {
            return null;
        }
        const params = {
            path: `/hoot-services/info/map/sizes?mapid=${ mapIds }`,
            method: 'GET'
        };

        return this.request( params )
            .then( resp => resp.data );
    }
}

export default new API();