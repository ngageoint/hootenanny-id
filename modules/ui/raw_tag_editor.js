import _map from 'lodash-es/map';
import _includes from 'lodash-es/includes';

import { ascending as d3_ascending } from 'd3-array';
import { dispatch as d3_dispatch } from 'd3-dispatch';

import {
    event as d3_event,
    select as d3_select
} from 'd3-selection';

import { d3combobox as d3_combobox } from '../lib/d3.combobox.js';

import { t } from '../util/locale';
import { services } from '../services';
import { svgIcon } from '../svg';
import { uiDisclosure } from './disclosure';
import { uiTagSelectCopy } from './tag_select_copy';
import { uiTagLinkUrl } from './tag_link_url';
import { uiTagReference } from './tag_reference';
import {
    utilGetSetValue,
    utilNoAuto,
    utilRebind
} from '../util';

export function uiRawTagEditor(context) {
    var taginfo = services.taginfo;
    var dispatch = d3_dispatch('change');
    var _readOnlyTags = [];
    var _showBlank = false;
    var _updatePreference = true;
    var _expanded = false;
    var _newRow;
    var _state;
    var _preset;
    var _tags;
    var _entityID;


    function rawTagEditor(selection) {
        var count = Object.keys(_tags).filter(function(d) { return d; }).length;

        var disclosure = uiDisclosure(context, 'raw_tag_editor', false)
            .title(t('inspector.all_tags') + ' (' + count + ')')
            .on('toggled', toggled)
            .updatePreference(_updatePreference)
            .content(content);

        // Sometimes we want to force the raw_tag_editor to be opened/closed..
        // When undefined, uiDisclosure will use the user's stored preference.
        if (_expanded !== undefined) {
            disclosure.expanded(_expanded);
        }

        selection.call(disclosure);

        function toggled(expanded) {
            _expanded = expanded;
            if (expanded) {
                selection.node().parentNode.scrollTop += 200;
            }
        }
    }


    function content(wrap) {
        var entries = _map(_tags, function(v, k) {
            return { key: k, value: v };
        });

        if (!entries.length || _showBlank) {
            _showBlank = false;
            entries.push({key: '', value: ''});
            _newRow = '';
        }

        var selectAllRow = wrap
            .selectAll('.select-all-row')
            .data([0]);
            // .selectAll('.select-all-button')
            // .data([0]);

        selectAllRow
            .enter()
            .append('div')
            .classed('select-all-row', true)
            .append('button')
            .attr('tab-index', -1)
            .classed('select-all-button', true)
            .on('click', selectAllTags)
            .call(svgIcon('#iD-icon-apply'));

        var list = wrap.selectAll('.tag-list')
            .data([0]);

        list = list.enter()
            .append('ul')
            .attr('class', 'tag-list')
            .merge(list);

        var newTag = wrap.selectAll('.add-tag')
            .data([0]);

        newTag.enter()
            .append('button')
            .attr('class', 'add-tag')
            .on('click', addTag)
            .call(svgIcon('#iD-icon-plus', 'light'));


        var items = list.selectAll('.tag-row')
            .data(entries, function(d) { return d.key; });

        items.exit()
            .each(unbind)
            .remove();

        // Enter

        var enter = items.enter()
            .append('li')
            .attr('class', 'tag-row')
            .classed('readonly', isReadOnly);

        var innerWrap = enter.append('div')
            .attr('class', 'inner-wrap');

        innerWrap
            .append('div')
            .attr('class', 'key-wrap')
            .append('input')
            .property('type', 'text')
            .attr('class', 'key')
            .attr('maxlength', 255)
            .call(utilNoAuto)
            .on('blur', keyChange)
            .on('change', keyChange);

        innerWrap
            .append('div')
            .attr('class', 'value-wrap')
            .append('input')
            .property('type', 'text')
            .attr('class', 'value')
            .attr('xlink:href', function(d) { return '#' + d.value; })
            .attr('maxlength', 255)
            .call(utilNoAuto)
            .on('blur', valueChange)
            .on('change', valueChange)
            .on('keydown.push-more', pushMore);

        innerWrap
            .append('button')
            .attr('tabindex', -1)
            .attr('class', 'form-field-button remove')
            .call(svgIcon('#iD-operation-delete'));

        // Update
        items = items
            .merge(enter)
            .sort(function(a, b) {
                return (a.key === _newRow && b.key !== _newRow) ? 1
                    : (a.key !== _newRow && b.key === _newRow) ? -1
                    : d3_ascending(a.key, b.key);
            });

        items
            .each(function(d) {
                var row = d3_select(this);
                var key = row.select('input.key');      // propagate bound data to child
                var value = row.select('input.value');  // propagate bound data to child

                if (_entityID && taginfo) {
                    bindTypeahead(key, value);
                }

                var isRelation = (_entityID && context.entity(_entityID).type === 'relation');
                var reference;

                if (isRelation && d.key === 'type') {
                    reference = uiTagReference({ rtype: d.value }, context);
                } else if (isNaN(d.value) && typeof (d.value) === 'string' && d.value.indexOf('http') === 0) {
                    reference = uiTagLinkUrl({ url: d.value });
                } else {
                    var tag;
                    if (Hoot.translations.activeTranslation !== 'OSM') {
                        tag = { key: d.key === Hoot.translations.fcode() ? d.value : d.key };
                    } else {
                        tag = { key: d.key, value: d.value };
                    }
                    reference = uiTagReference(tag, context);
                }

                row.select('.inner-wrap')      // propagate bound data
                .call(reference.button);

                row.call(reference.body);

                row.select('button.remove');   // propagate bound data

                // Hoot: Override tag reference with tag copy
                var select = uiTagSelectCopy(context);
                row.call( select );

            });

        items.selectAll('input.key')
            .attr('title', function(d) { return Hoot.translations.decodeSchemaKey(d.key); })
            .call(utilGetSetValue, function(d) { return d.key; })
            .property('disabled', isReadOnly);

        items.selectAll('input.value')
            .attr('title', function(d) {
                // when multi-value, show new line delimited so you can see each value
                // when translated w/enumerated value, get title of enumerated value
                // all other cases what's in the input has all the info user needs.
                return Array.isArray(d.value) ? d.value.filter(Boolean).join('\n') : Hoot.translations.decodeSchemaValue(d);
            })
            .call(utilGetSetValue, function(d) { return d.value; })
            .property('disabled', isReadOnly);

        items.selectAll('button.remove')
            .on('click', removeTag);



        function isReadOnly(d) {
            for (var i = 0; i < _readOnlyTags.length; i++) {
                if (d.key.match(_readOnlyTags[i]) !== null) {
                    return true;
                }
            }
            return false;
        }


        function pushMore() {
            if (d3_event.keyCode === 9 && !d3_event.shiftKey &&
                list.selectAll('li:last-child input.value').node() === this) {
                addTag();
            }
        }


        function bindTypeahead(key, value) {
            if (isReadOnly(key.datum())) return;

            var geometry = context.geometry(_entityID);

            key.call(d3_combobox()
                .container(context.container())
                .fetcher(function(value, callback) {
                    if (Hoot.translations.activeTranslation === 'OSM') {
                        taginfo.keys({
                            debounce: true,
                            geometry: geometry,
                            query: value
                        }, function(err, data) {
                            if (!err) callback(sort(value, data));
                        });
                    } else {
                        var keys = Object.keys(_tags);
                        var data = Hoot.translations.filterSchemaKeys(value).filter((d) =>
                            keys.indexOf(d.value) === -1
                        );
                        callback(sort(value, data));
                    }
                }));

            value.call(d3_combobox()
                .container(context.container())
                .fetcher(function(value, callback) {
                    if (Hoot.translations.activeTranslation === 'OSM') {
                        taginfo.values({
                            debounce: true,
                            key: utilGetSetValue(key),
                            geometry: geometry,
                            query: value
                        }, function(err, data) {
                            if (!err) callback(sort(value, data));
                        });
                    } else {
                        var data = Hoot.translations.filterSchemaValues(key.property('value'));
                        callback(sort(value, data));
                    }
                }));



            function sort(value, data) {
                var sameletter = [];
                var other = [];

                data.sort(function(a,b) {
                    var textA = a.value.toUpperCase();
                    var textB = b.value.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });

                for (var i = 0; i < data.length; i++) {
                    if (data[i].value.substring(0, value.length) === value) {
                        sameletter.push(data[i]);
                    } else {
                        other.push(data[i]);
                    }
                }
                return sameletter.concat(other);
            }
        }


        function unbind() {
            var row = d3_select(this);

            row.selectAll('input.key')
                .call(d3_combobox.off);

            row.selectAll('input.value')
                .call(d3_combobox.off);
        }


        function keyChange(d) {
            var kOld = d.key;
            var kNew = this.value.trim();
            var tag = {};

            if (isReadOnly({ key: kNew })) {
                this.value = kOld;
                return;
            }

            if (kNew && kNew !== kOld) {
                var match = kNew.match(/^(.*?)(?:_(\d+))?$/);
                var base = match[1];
                var suffix = +(match[2] || 1);
                while (_tags[kNew]) {  // rename key if already in use
                    kNew = base + '_' + suffix++;
                }

                if (_includes(kNew, '=')) {
                    var splitStr = kNew.split('=').map(function(str) { return str.trim(); });
                    var key = splitStr[0];
                    var value = splitStr[1];

                    kNew = key;
                    d.value = value;
                }
            }
            tag[kOld] = undefined;
            tag[kNew] = d.value;

            d.key = kNew;  // Maintain DOM identity through the subsequent update.

            if (_newRow === kOld) {   // see if this row is still a new row
                _newRow = ((d.value === '' || kNew === '') ? kNew : undefined);
            }

            this.value = kNew;
            dispatch.call('change', this, tag);
        }


        function valueChange(d) {
            if (isReadOnly(d)) return;
            var tag = {};
            tag[d.key] = this.value;

            if (_newRow === d.key && d.key !== '' && this.value !== '') {   // not a new row anymore
                _newRow = undefined;
            }

            dispatch.call('change', this, tag);
        }


        function removeTag(d) {
            if (isReadOnly(d)) return;
            var tag = {};
            tag[d.key] = undefined;
            dispatch.call('change', this, tag);
            d3_select(this.parentNode).remove();
        }


        function addTag() {
            // Wrapped in a setTimeout in case it's being called from a blur
            // handler. Without the setTimeout, the call to `content` would
            // wipe out the pending value change.
            window.setTimeout(function() {
                _showBlank = true;
                content(wrap);
                list.selectAll('li:last-child input.key').node().focus();
            }, 1);
        }


        function selectAllTags() {
            d3.event.stopPropagation();
            d3.event.preventDefault();

            var buttons = d3.selectAll('.tag-row .tag-select-button svg');

            // Determine if we are selecting all or unselecting all
            if (d3.selectAll('.tag-row .tag-select-button svg.visible').size() > 0){
                buttons.classed('visible',false);
            } else {
                buttons.classed('visible',true);
            }

            var seltags = d3.selectAll('li.tag-row').filter(function() {
                return d3.select(this).selectAll('svg.icon.checked.visible').size() === 1;
            }).data().reduce(function(m, d) {
                m[d.key] = d.value;
                return m;
            }, {});

            context.copyTags(seltags);
        }
    }

    rawTagEditor.state = function(_) {
        if (!arguments.length) return _state;
        _state = _;
        return rawTagEditor;
    };


    rawTagEditor.preset = function(_) {
        if (!arguments.length) return _preset;
        _preset = _;
        if (_preset.isFallback()) {
            _expanded = true;
            _updatePreference = false;
        } else {
            _expanded = undefined;
            _updatePreference = true;
        }
        return rawTagEditor;
    };


    rawTagEditor.tags = function(_) {
        if (!arguments.length) return _tags;
        _tags = _;
        return rawTagEditor;
    };


    rawTagEditor.entityID = function(_) {
        if (!arguments.length) return _entityID;
        _entityID = _;
        return rawTagEditor;
    };


    rawTagEditor.expanded = function(_) {
        if (!arguments.length) return _expanded;
        _expanded = _;
        _updatePreference = false;
        return rawTagEditor;
    };


    rawTagEditor.readOnlyTags = function(_) {
        if (!arguments.length) return _readOnlyTags;
        _readOnlyTags = _;
        return rawTagEditor;
    };


    return utilRebind(rawTagEditor, dispatch, 'on');
}
