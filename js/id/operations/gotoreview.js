iD.operations.Gotoreview = function(selectedIDs, context) {
    var entityId = selectedIDs[0],
        entity = context.entity(entityId),
        extent = entity.extent(context.graph()),
        geometry = context.geometry(entityId),
        action = iD.actions.Review(entityId, context.projection),
        rectMargin=30;

    var operation = function() {
        var annotation = 'Go to related review item';

        _selectReview(context.graph());
    };

    operation.available = function() {
        return context.hoot().control.conflicts.isConflictReviewExist();
    };

    operation.disabled = function() {
        
        return false;
    };

    operation.tooltip = function() {
        return 'Go to related review item.';
    };

    var _selectReview = function(graph) {
        d3.selectAll('.gotoreview').remove();

        // Create a label above all POIs in relation
        var svg = d3.select('.layer-label');

        var currentAlpha = 97,
        endingAlpha = 122,
        doubleLetter = false;

        var feature = context.hasEntity(entityId);
        graph.parentRelations(feature)
            .forEach(function(parent) {
                _.each(parent.members, function(mem){
                    var mid = mem.id;

                    var mFeature = context.hasEntity(mid);
                    if(mFeature && (entityId != mid)) {
                        //take this coord, convert to SVG, add to map
                        var c = context.projection(mFeature.loc);
                        var transform = 'translate('.concat(c[0],',',c[1]-50,')');
                        var g = svg.append('g').attr('transform',transform).attr('loc',mFeature.loc).classed('gotoreview',true);
                        g.append('circle').attr('r','20')
                            .attr('stroke','white').attr('stroke-width','3')
                            .attr('fill','green').attr('fill-opacity','0.5');
                        g.append('text').attr('dx','-6').attr('dy','6')
                            .style('fill','white').style('font-size','16px').attr('font-weight','bold')
                            .text(function(){
                                if(!doubleLetter){return String.fromCharCode(currentAlpha).toUpperCase();}
                                else{return String.fromCharCode(currentAlpha).toUpperCase().concat(String.fromCharCode(currentAlpha).toUpperCase());}
                            });
                        
                        var reqParam = {
                            'mapId':this.mapId,
                            'sequence':this.tags['hoot:review:sort_order']
                        };

                        var _parent = function() {return context.hoot().control.conflicts;};

                        g.on('click',function(){
                            Hoot.model.REST('reviewGetReviewItem', reqParam, function (resp) {  
                                if(resp.error){
                                    context.hoot().view.utilities.errorlog.reportUIError(d.error);
                                    return;
                                } 

                                if(resp.resultCount < 1){
                                  alert('The review item already has been resolved. Can not go to review item.');
                                } else {
                                    context.background().updateArrowLayer({});
                                    _parent().actions.idgraphsynch.getRelationFeature(resp.mapId, resp.relationId, 
                                    function(newReviewItem){
                                        _parent().map.featurehighlighter.highlightLayer(newReviewItem.members[0], 
                                            newReviewItem.members[1]);
                                    });                              
                                }
                            });
                        });

                        currentAlpha += 1;
                        if(currentAlpha > 122){currentAlpha = 97; doubleLetter = true;}                      
                    }  
                },parent);
            });
    }
    

    operation.id = 'gotoreview';
    operation.keys = ['G'];
    operation.title = 'Go to Review';

    return operation;
};
