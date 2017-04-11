import _ from 'lodash';
import * as d3 from 'd3';
import { d3combobox } from '../lib/d3.combobox.js';
import { t } from '../util/locale';
import { svgIcon } from '../svg/index';
import { rendererBackgroundSource } from '../renderer/background_source';
import { services } from '../services/index';

export function uiLayerMenu(context) {

    return function(selection) {

        var data = [
            {id: 'reference', text: 'Add Reference Dataset', color: 'violet'},
            {id: 'secondary', text: 'Add Secondary Dataset', color: 'orange'}
        ];
        //t('geocoder.no_results_worldwide')

        var layerMenu = selection.append('div')
            .classed('col12 pad2',true)
            .call(renderLayerMenu);

        function renderLayerMenu(container) {
            services.hoot.availableLayers(function(layers) {

                function loadLayer(d) {
                    var lyrdiv = d3.select('#' + d.source);
                    var color = lyrdiv.attr('data-color');
                    //Adds the vector and node-mapnik layers to the map
                    services.hoot.loadLayer(d.mapid, d.source, color, renderLayer);
                    //Set the layer combobox to disabled/readonly
                    lyrdiv.select('input')
                        .call(d3combobox.off)
                        .attr('readonly', true);
                    //Add the layer remove button
                    lyrdiv.insert('button', '.menu-layers')
                        .attr('class', 'inline fr contain map-button keyline-left round-right _icon trash')
                        .on('click', function() {
                            //Remove the layer
                            removeLayer(d.mapid);
                            //Reset the layer menu ui element
                            this.remove();
                            //Reinitialize the layer combobox
                            lyrdiv.select('input')
                                .property('value', '')
                                .attr('readonly', null)
                                .call(d3combobox()
                                    .data(layers.map(function (n) {
                                        return {
                                            value: n.name,
                                            mapid: n.id,
                                            source: d.source
                                        };
                                    }))
                                    .on('accept.combobox', loadLayer)
                                );
                        });
                }


                function renderLayer(extent, mapnik_source) {
                    //Zoom to the layer extent if not global
                    if (extent.toParam() !== '-180,-90,180,90') {
                        if (!context.extent().intersects(extent)) {
                            context.extent(extent);
                        } else {
                            context.redraw();
                        }

                        //Add the node-mapnik overlay
                        context.background().addSource(mapnik_source);

                        //Load layer extent into hoot overlay
                        var hootOverlay = context.layers().layer('hoot');
                        if (hootOverlay) {
                            hootOverlay.geojson(hootOverlay.geojson().concat([{
                                type: 'FeatureCollection',
                                features: [{
                                    type: 'Feature',
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: extent.polygon(),
                                    }
                                }],
                                properties: {
                                    name: mapnik_source.name,
                                    mapid: mapnik_source.id
                                }
                            }]));
                        }
                    } else {
                        context.redraw();
                    }
                }

                //Remove the vector and node-mapnik layers
                function removeLayer(mapid) {
                    //Remove internal tracking data
                    services.hoot.removeLayer(mapid);
                    //Remove osm vector data
                    services.osm.loadedDataRemove(mapid);
                    //Remove node-mapnik layer
                    context.background().removeSource(mapid);
                    //Remove hoot bbox layer
                    var hootOverlay = context.layers().layer('hoot');
                    if (hootOverlay) {
                        hootOverlay.geojson(hootOverlay.geojson().filter(function(d) {
                            return d.properties.mapid !== mapid;
                        }));
                    }

                    context.flush();
                }

                function changeLayerColor(lyrmenu) {
                    services.hoot.changeLayerColor(lyrmenu, function(mapnik_source) {
                        context.background().updateSource(mapnik_source);
                    });
                }

                //Add ui elements for each layer menu type
                data.forEach(function(lyrmenu) {

                    //Layer menu elements
                    var menus = container
                        .append('div');
                    menus.attr('class', function(d) { return lyrmenu.color; })
                        .classed('fill-white round keyline-all contain space-bottom1', true)
                        .attr('id',function(d){
                            return lyrmenu.id;
                        })
                        .attr('data-color', function(d) { return lyrmenu.color; });

                    menus.append('div')
                        .attr('class','pad1 inline thumbnail dark big _icon data')
                        .on('click', function(d) {
                            d3.select('#palette-' + lyrmenu.id)
                                .classed('hidden', function() { return !d3.select(this).classed('hidden'); });
                        });

                    var layersection = menus.append('div')
                        .classed('inline menu-layers', true);

                    //Initialize the layer combobox
                    layersection.append('input')
                        .attr('type', 'text')
                        .attr('placeholder', function (d) {
                            return lyrmenu.text;
                        })
                        .attr('id', function (d) {
                            return 'input-'+ lyrmenu.id;
                        })
                        .classed('combobox-input inline', true)
                        .call(d3combobox()
                            .data(layers.map(function (n) {
                                return {
                                    value: n.name,
                                    mapid: n.id,
                                    source: lyrmenu.id
                                };
                            }))
                            .on('accept.combobox', loadLayer)
                        );

                    //Build the layer color palette
                    function buildPalette(container, lyrmenu) {
                        // console.log(container);
                        // console.log(color);
                        var swatches = container.selectAll('a')
                            .data(services.hoot.palette());
                        swatches.exit().remove();
                        swatches.enter().append('a')
                            .merge(swatches)
                            .attr('class', function (p) {
                                var active = (lyrmenu.color === p.name) ? ' active _icon check' : '';
                                return 'block fl keyline-right' + active;
                            })
                            .style('background', function (p) {
                                return p.hex;
                            })
                            .on('click', function(p) {
                                var oldColor = lyrmenu.color;
                                var newColor = p.name;
                                lyrmenu.color = p.name;
                                //highlight the new selected color swatch
                                buildPalette(container, lyrmenu);
                                //update the layer icon color
                                d3.select('#' + lyrmenu.id)
                                    .classed(oldColor, false)
                                    .classed(newColor, true)
                                    .attr('data-color', newColor);
                                //update the node-mapnik layer &
                                //update the vector data color classes
                                changeLayerColor(lyrmenu);
                            });

                    }
                    //Palette elements
                    menus.append('div')
                        .classed('pad1 keyline-top header hidden', true)
                        .attr('id', function() { return 'palette-' + lyrmenu.id; })
                        .append('div')
                        .classed('keyline-all palette inline round space-bottom1', true)
                        .call(buildPalette, lyrmenu);
                });
            });

        }

     };
}
