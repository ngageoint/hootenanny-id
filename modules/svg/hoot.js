import { geoPath as d3_geoPath } from 'd3-geo';
import _isEmpty from 'lodash-es/isEmpty';
import { geoExtent, geoPolygonIntersectsPolygon } from '../geo/index';
import { utilDetect } from '../util/detect';
import toGeoJSON from 'togeojson';


export function svgHoot(projection, context, dispatch) {
    var showLabels = true,
        detected = utilDetect(),
        layer;


    function init() {
        if (svgHoot.initialized) return;  // run once

        svgHoot.geojson = [];
        svgHoot.enabled = true;

        svgHoot.initialized = true;
    }


    function drawHoot(selection) {
        var geojson = svgHoot.geojson,
            enabled = svgHoot.enabled;

        layer = selection.selectAll('.layer-hoot')
            .data(enabled ? [0] : []);

        layer.exit()
            .remove();

        layer = layer.enter()
            .append('g')
            .attr('class', 'layer-hoot')
            .merge(layer);

        var paths = layer
            .selectAll('path')
            .data(geojson);

        paths.exit()
            .remove();

        paths = paths.enter()
            .append('path')
            .merge(paths)
            .attr('class', function(d) {
                if (!(_isEmpty(d))) {
                    return 'way line stroke tag-hoot-' + d.properties.mapid;
                }
            });


        var path = d3_geoPath(projection);

        paths
            .attr('d', path);

    }


    drawHoot.showLabels = function(_) {
        if (!arguments.length) return showLabels;
        showLabels = _;
        return this;
    };


    drawHoot.enabled = function(_) {
        if (!arguments.length) return svgHoot.enabled;
        svgHoot.enabled = _;
        dispatch.call('change');
        return this;
    };


    drawHoot.hasHoot = function() {
        var geojson = svgHoot.geojson;
        return (!(_isEmpty(geojson)));
    };


    drawHoot.geojson = function(gj) {
        if (!arguments.length) return svgHoot.geojson;
        svgHoot.geojson = gj;
        dispatch.call('change');
        return this;
    };


    init();
    return drawHoot;
}
