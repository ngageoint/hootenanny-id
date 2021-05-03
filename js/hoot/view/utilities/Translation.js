/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.view.utilities.translation is translations view in Manage tab where user can perform CURD operations.
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      03 Feb. 2016
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
Hoot.view.utilities.translation = function(context) {
    var hoot_view_utilities_translation = {};


    hoot_view_utilities_translation.createContainer = function(form){

        form.append('div')
            .classed('pad1y col12', true)
            .append('a')
            .attr('href', '#')
            .text('Add New Translation')
            .classed('dark fl button loud pad2x big _icon plus', true)
            .on('click', function () {
                context.hoot().control.utilities.translation.newTranslationPopup();
            });
        hoot_view_utilities_translation.datasetcontainer = form.append('div')
            .classed('col12 fill-white small  row10 overflow keyline-all', true)
            .call(hoot_view_utilities_translation.populateTranslations);
    };

    hoot_view_utilities_translation.populateTranslations = function(container) {
            if(!container){
                container = hoot_view_utilities_translation.datasetcontainer;
            }
            Hoot.model.REST('getTranslations', function (d) {
                if(d.error){
                    window.console.error(d.error);
                    return;
                }

                container.selectAll('div').remove();
                var tla = container.selectAll('div')
                    .data(d)
                    .enter();
                var tla2 = tla.append('div')
                    .classed('col12 fill-white small keyline-bottom', true);
                var tla3 = tla2.append('span')
                    .classed('text-left big col12 fill-white small hoverDiv2', true);

                tla3.append('a')
                    .classed('transl pad1x', true)
                    .style('position', 'relative')
                    .style('top', '20px')
                    .text(function (d) {
                        if(d.DEFAULT){
                            if(d.DEFAULT === true){
                                return d.NAME + '*';
                            }
                        }
                        return d.NAME || d.name;
                    })
                    .on('click',function(d){
                        d3.event.stopPropagation();
                        d3.event.preventDefault();
                        context.hoot().control.utilities.translation.translationPopup(d);
                    });
                var tooltip = bootstrap.tooltip()
                    .placement('right')
                    .html('true')
                    .title(function (d) {
                        if(d.DEFAULT === true){
                            return d.DESCRIPTION + ' (Hootenanny Default Translation)';
                        }
                        return d.DESCRIPTION;
                    });

                    d3.selectAll('a.transl').call(tooltip);

                tla3.append('button')
                .style('height', '100%')
                .on('click', function (n) {
                    d3.event.stopPropagation();
                    d3.event.preventDefault();

                    var r = confirm('Are you sure you want to delete selected translaton?');
                    if (!r) { return; }


                    d3.select(this).classed('keyline-left fr _icon trash pad2 col1',false);
                    d3.select(this).classed('keyline-left fr pad1 row1 col1',true).call(iD.ui.Spinner(context));


                    var transTrashBtn = this;
                    var name = n.NAME || n.name;
                    var btnIdName = name.replace(/[&\/\\#,+()$~%.'':*?<>{}]/g,'_');
                    btnIdName = btnIdName.replace(/ /g, '_');
                    transTrashBtn.id = 'a' + btnIdName;
                    Hoot.model.REST('deleteTranslation', name, function (res) {
                        if(res.error){
                            window.console.error(res.error);
                            hoot_view_utilities_translation.populateTranslations();
                            return;
                        }
                        var resp = JSON.parse(res);
                        var respName = resp[0].NAME || resp[0].name;
                        var idName = respName.replace(/[&\/\\#,+()$~%.'':*?<>{}]/g,'_');
                        idName = idName.replace(/ /g, '_');
                        var curBtn = d3.select('#a' + idName)[0];
                        d3.select(curBtn[0].parentNode.parentNode)
                        .remove();
                        hoot_view_utilities_translation.populateTranslations();
                    });

                })
                .select(function (sel) {
                    if(sel.DEFAULT === true){

                        d3.select(this).classed('keyline-left fr _icon x pad2 col1', true);
                        d3.select(this).on('click', function () {
                            d3.event.stopPropagation();
                            d3.event.preventDefault();
                            iD.ui.Alert('Can not delete default translation.','warning',new Error().stack);
                        });
                    }
                    else {
                        d3.select(this).classed('keyline-left fr _icon trash pad2 col1', true);
                    }

                });

                tla3.append('button')
                .classed('keyline-left fr _icon export pad2 col1', true)
                .style('height', '100%')
                .on('click', function (d) {
                    // Export translation to new .js file
                    d3.event.stopPropagation();
                    d3.event.preventDefault();
                    context.hoot().control.utilities.translation.exportTranslation(d);
                });





            });
        };


    return hoot_view_utilities_translation;
};