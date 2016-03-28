/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.ui.checkcombobox is a helper class where it provides combobox with checkbox in each combobox item.
//  This is rehashing of d3.combobox with checkbox.
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      03 Feb. 2016
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
Hoot.ui.checkcombobox = function() {
    var event = d3.dispatch('accept'),
        data = [],
        suggestions = [],
        selectionMap = {},
        minItems = 1;//2;

    var fetcher = function(val, cb) {
        cb(data.filter(function(d) {
            return d.value
                .toString()
                .toLowerCase()
                .indexOf(val.toLowerCase()) !== -1;
        }));
    };

    var checkcombobox = function(input) {
        var idx = -1,
            container = d3.select(document.body)
                .selectAll('div.combobox')
                .filter(function(d) { return d === input.node(); }),
            shown = !container.empty();

        input
            .classed('combobox-input', true)
            .on('focus.typeahead', focus)
            .on('blur.typeahead', blur)
            .on('keydown.typeahead', keydown)
            .on('keyup.typeahead', keyup)
            .on('input.typeahead', change)
            .each(function() {
                var parent = this.parentNode,
                    sibling = this.nextSibling;

                var caret = d3.select(parent).selectAll('.combobox-caret')
                    .filter(function(d) { return d === input.node(); })
                    .data([input.node()]);

                caret.enter().insert('div', function() { return sibling; })
                    .attr('class', 'combobox-caret');

                caret
                    .on('mousedown', function () {
                        // prevent the form element from blurring. it blurs
                        // on mousedown
                        d3.event.stopPropagation();
                        d3.event.preventDefault();
                        if (!shown) {
                            input.node().focus();
                            fetch('', render);
                        } else {
                            hide();
                        }
                    });
            });

        function focus() {
            fetch(value(), render);
        }

        function blur() {
            window.setTimeout(hide, 150);
        }

        function show() {
            if (!shown) {
                container = d3.select(document.body)
                    .insert('div', ':first-child')
                    .datum(input.node())
                    .attr('class', 'combobox')
                    .style({
                        position: 'absolute',
                        display: 'block',
                        left: '0px'
                    })
                    .on('mousedown', function () {
                        // prevent moving focus out of the text field
                        d3.event.preventDefault();
                    });

                d3.select(document.body)
                    .on('scroll.combobox', render, true);

                shown = true;
            }
        }

        function hide() {
            if (shown) {
                idx = -1;
                container.remove();

                d3.select(document.body)
                    .on('scroll.combobox', null);

                shown = false;
            }
        }

        function keydown() {
           switch (d3.event.keyCode) {
               // backspace, delete
               case 8:
               case 46:
                   input.on('input.typeahead', function() {
                       idx = -1;
                       render();
                       var start = input.property('selectionStart');
                       input.node().setSelectionRange(start, start);
                       input.on('input.typeahead', change);
                   });
                   break;
               // tab
               case 9:
                   container.selectAll('a.selected').each(event.accept);
                   break;
               // return
               case 13:
                   d3.event.preventDefault();
                   break;
               // up arrow
               case 38:
                   nav(-1);
                   d3.event.preventDefault();
                   break;
               // down arrow
               case 40:
                   nav(+1);
                   d3.event.preventDefault();
                   break;
           }
           d3.event.stopPropagation();
        }

        function keyup() {
            switch (d3.event.keyCode) {
                // escape
                case 27:
                    hide();
                    break;
                // return
                case 13:
                    container.selectAll('a.selected').each(event.accept);
                    hide();
                    break;
            }
        }

        function change() {
            fetch(value(), function() {
                autocomplete();
                render();
            });
        }

        function nav(dir) {
            idx = Math.max(Math.min(idx + dir, suggestions.length - 1), 0);
            input.property('value', suggestions[idx].value);
            render();
            ensureVisible();
        }

        function value() {
            var value = input.property('value'),
                start = input.property('selectionStart'),
                end = input.property('selectionEnd');

            if (start && end) {
                value = value.substring(0, start);
            }

            return value;
        }

        function fetch(v, cb) {
            fetcher.call(input, v, function(_) {
                suggestions = _;
                cb();
            });
        }

        function autocomplete() {
            var v = value();

            idx = -1;

            if (!v) return;

            for (var i = 0; i < suggestions.length; i++) {
                if (suggestions[i].value.toLowerCase().indexOf(v.toLowerCase()) === 0) {
                    var completion = v + suggestions[i].value.substr(v.length);
                    idx = i;
                    input.property('value', completion);
                    input.node().setSelectionRange(v.length, completion.length);
                    return;
                }
            }
        }

        function render() {
            if (suggestions.length >= minItems && document.activeElement === input.node()) {
                show();
            } else {
                hide();
                return;
            }

            var options = container
                .selectAll('a.combobox-option')
                .data(suggestions, function(d) { return d.value; });

            
            options.enter().append('a')
                .attr('class', 'combobox-option')
                .html(function(d){
                    var chkHtml = '<label class="pad1x pad0y round-top " style="opacity: 1;">';
                    chkHtml += '<input type="checkbox" class="reset checkbox" style="opacity: 1;">' + d.value + '</label>';
                    return chkHtml;
                });
                /*.text(function(d) { return d.value; });*/


            options.select(function(d){
                if(selectionMap[d.value] !== undefined){
                    d3.select(this).select('input').property('checked', true);
                }
                
            });

            options
                .attr('title', function(d) { return d.title; })
                .classed('selected', function(d, i) { return i == idx; })
                .on('mouseover', select)
                .on('click', accept)
                .order();

            options.exit()
                .remove();

            var rect = input.node().getBoundingClientRect();
            
            //If the height of the menu is going to go off the screen, have it go towards the top of the screen instead
            var dropDownHeight = (d3.select('.combobox-option').node().getBoundingClientRect().height * suggestions.length) + rect.height;
            if((window.innerHeight-rect.top)<dropDownHeight){
                container.style({
                    'left': rect.left + 'px',
                    'width': rect.width + 'px',
                    'bottom': window.innerHeight-rect.top + 'px'
                });            	
            } else {
                container.style({
                    'left': rect.left + 'px',
                    'width': rect.width + 'px',
                    'top': rect.height + rect.top + 'px'
                });            	
            }
        }

        function select(d, i) {
            idx = i;
            render();
        }

        function ensureVisible() {
            var node = container.selectAll('a.selected').node();
            if (node) node.scrollIntoViewIfNeeded();//scrollIntoView();
        }

        function accept(d) {
            if (!shown) return;

            var isChecked = d3.select(this).select('input').property('checked');
            if(isChecked === true) {
                selectionMap[d.value] = true;
            } else {
                delete selectionMap[d.value];
            }
            inputList = Object.keys(selectionMap).join();
            input
                .property('value', inputList)
                .trigger('change');
            event.accept(d);
        }
    };

    checkcombobox.fetcher = function(_) {
        if (!arguments.length) return fetcher;
        fetcher = _;
        return checkcombobox;
    };

    checkcombobox.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return checkcombobox;
    };

    checkcombobox.minItems = function(_) {
        if (!arguments.length) return minItems;
        minItems = _;
        return checkcombobox;
    };

    return d3.rebind(checkcombobox, event, 'on');
};
