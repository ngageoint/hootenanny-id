import { selectAll as d3_selectAll } from 'd3-selection';

import {
    osmEntity,
    osmNote
} from '../osm';

import {
    uiDataEditor,
    uiFeatureList,
    uiInspector,
    uiNoteEditor
} from './index';


export function uiSidebar(context) {
    var inspector = uiInspector(context);
    var dataEditor = uiDataEditor(context);
    var noteEditor = uiNoteEditor(context);
    var _current;
    var _wasData = false;
    var _wasNote = false;


    function sidebar(selection) {
        var featureListWrap = selection
            .append('div')
            .attr('class', 'feature-list-pane')
            .call(uiFeatureList(context));

        var inspectorWrap = selection
            .append('div')
            .attr('class', 'inspector-hidden inspector-wrap');

        //var layerMenuWrap = selection
        //    .append('div')
        //    .attr('class', 'add-datasets-pane sidebar-component')
        //    .call(uiLayerMenu(context));

        function hover(datum) {
            if (datum && datum.__featurehash__) {   // hovering on data
                _wasData = true;
                sidebar
                    .show(dataEditor.datum(datum));

                selection.selectAll('.sidebar-component')
                    .classed('inspector-hover', true);

            } else if (datum instanceof osmNote) {
                if (context.mode().id === 'drag-note') return;
                _wasNote = true;

                sidebar
                    .show(noteEditor.note(datum));

                selection.selectAll('.sidebar-component')
                    .classed('inspector-hover', true);

            } else if (!_current && (datum instanceof osmEntity)) {
                featureListWrap
                    .classed('inspector-hidden', true);

                inspectorWrap
                    .classed('inspector-hidden', false)
                    .classed('inspector-hover', true);

                if (inspector.entityID() !== datum.id || inspector.state() !== 'hover') {
                    inspector
                        .state('hover')
                        .entityID(datum.id);

                    inspectorWrap
                        .call(inspector);
                }

            } else if (!_current) {
                featureListWrap
                    .classed('inspector-hidden', false);
                inspectorWrap
                    .classed('inspector-hidden', true);
                inspector
                    .state('hide');

            } else if (_wasData || _wasNote) {
                _wasNote = false;
                _wasData = false;
                d3_selectAll('.note').classed('hover', false);
                sidebar.hide();
            }
        }


        // disable hover behavior
        //sidebar.hover = _throttle(hover, 200);


        sidebar.select = function(id, newFeature) {
            if (!_current && id) {
                featureListWrap
                    .classed('inspector-hidden', true);

                inspectorWrap
                    .classed('inspector-hidden', false)
                    .classed('inspector-hover', false);

                if (inspector.entityID() !== id || inspector.state() !== 'select') {
                    inspector
                        .state('select')
                        .entityID(id)
                        .newFeature(newFeature);

                    inspectorWrap
                        .call(inspector);
                }

            } else if (!_current) {
                featureListWrap
                    .classed('inspector-hidden', false);
                inspectorWrap
                    .classed('inspector-hidden', true);
                inspector
                    .state('hide');
            }
        };


        sidebar.show = function(component, element) {
            featureListWrap
                .classed('inspector-hidden', true);
            inspectorWrap
                .classed('inspector-hidden', true);
            d3.select( '.hoot-sidebar' )
                .classed( 'hidden', true );

            if (_current) _current.remove();
            _current = selection
                .append('div')
                .attr('class', 'sidebar-component')
                .call(component, element);
        };


        sidebar.hide = function() {
            featureListWrap
                .classed('inspector-hidden', false);
            inspectorWrap
                .classed('inspector-hidden', true);
            d3.select( '.hoot-sidebar' )
                .classed( 'hidden', false );

            if (_current) _current.remove();
            _current = null;
        };
    }


    sidebar.hover = function() {};
    sidebar.hover.cancel = function() {};
    sidebar.select = function() {};
    sidebar.show = function() {};
    sidebar.hide = function() {};

    return sidebar;
}
