iD.ui.Help = function(context) {
    var key = 'H';

    var docKeys = [
        'help.help',
        'help.background',
        'help.adding_layers',
        'help.editing',
        'help.adding_features',
        'help.copying',
        'help.tools',
        'help.shortcuts',
        'help.options',
        'help.review',
        'help.manage'];

    var docs = docKeys.map(function(key) {
        var text = t(key);
        return {
            title: text.split('\n')[0].replace('#', '').trim(),
            html: marked(text.split('\n').slice(1).join('\n'))
        };
    });

    function help(selection) {

        function hide() {
            setVisible(false);
        }

        function toggle() {
            if (d3.event) d3.event.preventDefault();
            tooltip.hide(button);
            setVisible(!button.classed('active'));
        }

        function setVisible(show) {
            if (show !== shown) {
                button.classed('active', show);
                shown = show;

                if (show) {
                    selection.on('mousedown.help-inside', function() {
                        return d3.event.stopPropagation();
                    });
                    pane.style('display', 'block')
                        .style('right', '-500px')
                        .transition()
                        .duration(200)
                        .style('right', '0px');
                } else {
                    pane.style('right', '0px')
                        .transition()
                        .duration(200)
                        .style('right', '-500px')
                        .each('end', function() {
                            d3.select(this).style('display', 'none');
                        });
                    selection.on('mousedown.help-inside', null);
                }
            }
        }

        function clickHelp(d, i) {
            pane.property('scrollTop', 0);
            doctitle.text(d.title);
            body.html(d.html);
            body.selectAll('a')
                .attr('target', '_blank');
            menuItems.classed('selected', function(m) {
                return m.title === d.title;
            });

            nav.html('');

            if (i > 0) {
                var prevLink = nav.append('a')
                    .attr('class', 'previous')
                    .on('click', function() {
                        clickHelp(docs[i - 1], i - 1);
                    });
                prevLink.append('span').attr('class', 'icon back blue');
                prevLink.append('span').text(docs[i - 1].title);
            }
            if (i < docs.length - 1) {
                var nextLink = nav.append('a')
                    .attr('class', 'next')
                    .on('click', function() {
                        clickHelp(docs[i + 1], i + 1);
                    });
                nextLink.append('span').text(docs[i + 1].title);
                nextLink.append('span').attr('class', 'icon forward blue');
            }
        }

        function clickWalkthrough() {
            d3.select(document.body).call(iD.ui.intro(context));
            setVisible(false);
        }


        var pane = selection.append('div')
                .attr('class', 'help-wrap map-overlay fillL col5 content hide'),
            tooltip = bootstrap.tooltip()
            .placement('left')
            .html(true)
                .title(iD.ui.tooltipHtml(t('help.title'), key)),
            button = selection.append('button')
            .attr('tabindex', -1)
            .on('click', toggle)
                .call(tooltip),
            shown = false;

        button.append('span')
            .attr('class', 'icon help light');


        var toc = pane.append('ul')
            .attr('class', 'toc');

        var menuItems = toc.selectAll('li')
            .data(docs)
            .enter()
            .append('li')
            .append('a')
            .text(function(d) { return d.title; })
            .on('click', clickHelp);

       /* toc.append('li')
            .attr('class','walkthrough')
            .append('a')
            .text(t('splash.walkthrough'))
            .on('click', clickWalkthrough);*/

        toc.append('div')
            .classed('contain',true)
            .append('label')
                .text('Enable Test Mode')
            .append('input')
                .attr('type','checkbox')
                .attr('id','enable_test_mode')
                .on('change',function(){
                	if(this.checked){
                		d3.selectAll('#confGetValuesBtn').style('display','inline-block');
                		d3.selectAll('#confViewValuesSpan').style('display','inline-block');
                		d3.selectAll('#containerofisGenerateReport').style('display','block');
                	} else {
                		d3.selectAll('#confGetValuesBtn').style('display','none');
                		d3.selectAll('#confViewValuesSpan').style('display','none');
                		d3.selectAll('#containerofisGenerateReport').style('display','none');
                	}
                });

        var content = pane.append('div')
            .attr('class', 'left-content');

        var doctitle = content.append('h2')
            .text(t('help.title'));

        var body = content.append('div')
            .attr('class', 'body');

        var nav = content.append('div')
            .attr('class', 'nav');

        clickHelp(docs[0], 0);

        var keybinding = d3.keybinding('help')
            .on(key, toggle)
            .on('B', hide)
            .on('F', hide);

        d3.select(document)
            .call(keybinding);

        context.surface().on('mousedown.help-outside', hide);
        context.container().on('mousedown.help-outside', hide);
    }

    return help;
};
