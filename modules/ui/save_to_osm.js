import { interpolateRgb as d3_interpolateRgb } from 'd3-interpolate';
import { event as d3_event } from 'd3-selection';
import { d3keybinding } from '../lib/d3.keybinding.js';
import { t } from '../util/locale';
import { modeSave } from '../modes/index';
import { uiCmd } from './cmd';
import { uiTooltipHtml } from './tooltipHtml';
import { tooltip } from '../util/tooltip';
import { services } from '../services/index';


export function uiSaveToOsm(context) {
    var history = context.history(),
        key = uiCmd('⌘P');


    function saving() {
        return context.mode().id === 'save';
    }


    function save() {
        d3_event.preventDefault();
        var changes = services.hoot.changes();
        console.log(changes);
        // if (!context.inIntro() && !saving() && services.hoot.hasChanges()) {
        //     context.enter(modeSave(context));
        // }
    }


    function getBackground(numChanges) {
        var step;
        if (numChanges === 0) {
            return null;
        } else if (numChanges <= 50) {
            step = numChanges / 50;
            return d3_interpolateRgb('#fff', '#ff8')(step);  // white -> yellow
        } else {
            step = Math.min((numChanges - 50) / 50, 1.0);
            return d3_interpolateRgb('#ff8', '#f88')(step);  // yellow -> red
        }
    }


    return function(selection) {
        var tooltipBehavior = tooltip()
            .placement('bottom')
            .html(true)
            .title(uiTooltipHtml(t('save_to_osm.no_changes'), key));

        var button = selection
            .classed('save-to-osm', true)
            .append('button')
            .attr('class', 'save col12 disabled')
            .attr('tabindex', -1)
            .on('click', save)
            .call(tooltipBehavior);

        button
            .append('span')
            .attr('class', 'label')
            .text(t('save_to_osm.title'));

        button
            .append('span')
            .attr('class', 'count save-to-osm')
            .text('0');

        // var keybinding = d3keybinding('undo-redo')
        //     .on(key, save, true);

        // d3.select(document)
        //     .call(keybinding);

        var numChanges = 0;

        context
            .on('exit.save-to-osm', function() {
                //derive the changeset between hoot conflated layer
                //and osm api source

                var _ = services.hoot.changesLength();//history.difference().summary().length;
                if (_ === numChanges)
                    return;
                numChanges = _;

                tooltipBehavior.title(uiTooltipHtml(
                    t(numChanges > 0 ? 'save_to_osm.help' : 'save_to_osm.no_changes'), key));

                var background = getBackground(numChanges);

                button
                    .classed('disabled', numChanges === 0)
                    .classed('has-count', numChanges > 0)
                    .style('background', background);

                button.select('span.count')
                    .text(numChanges)
                    .style('background', background)
                    .style('border-color', background);
            });

        context
            .on('enter.save-to-osm', function() {
                button.property('disabled', saving());
                if (saving()) button.call(tooltipBehavior.hide);
            });
    };
}
