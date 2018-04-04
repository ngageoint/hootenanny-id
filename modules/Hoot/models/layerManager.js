/** ****************************************************************************************************
 * File: LayerManager.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 3/8/18
 *******************************************************************************************************/

import _ from 'lodash-es';
import API from '../util/api';
import Events from '../util/events';

class LayerManager {
    constructor() {
        this.context          = null;
        this._layers          = [];
        this._availableLayers = [];
        this._loadedLayers    = {};
        this._selectedLayers  = [];
    }

    /**
     * Retrieve layers from database
     */
    refreshLayers() {
        return API.getLayers()
            .then( data => {
                this._layers = data;

                return data;
            } );
    }

    set ctx( context ) {
        this.context = context;
    }

    set selectedLayers( layers ) {
        this._selectedLayers = layers;
    }

    get selectedLayers() {
        return this._selectedLayers;
    }

    get availableLayers() {
        return _.reduce( this._layers, ( layers, layer ) => {
            layers[ layer.id.toString() ] = layer.name;
            return layers;
        }, {} );
    }

    setLoadedLayer( layer ) {
        this._loadedLayers[ layer.name ] = layer;
    }

    removeLoadedLayer( layerName ) {
        delete this._loadedLayers[ layerName ];
    }

    getLoadedLayers( layerName ) {
        if ( !layerName ) {
            return this._loadedLayers;
        }

        return this._loadedLayers[ layerName ];
    }
}

export default new LayerManager();