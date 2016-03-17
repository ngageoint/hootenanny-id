/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.control.import is sidebar control for loading ingested Hootenanny layer into map pane.
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      03 Feb. 2016
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
Hoot.control.import = function (context,selection) {
    var event = d3.dispatch('addLayer', 'finished');
    var ETL = {};

    ETL.createTree = function(a){
    	hoot.control.utilities.folder.createFolderTree(a);
    }

    ETL.renderTree = function(a) {
        if(a.tree){
    		ETL.createTree(d3.select(this));
    	}
    }


    ETL.render = function (colors, isPrimary) {
    	context.map().on("maxImportZoomChanged", function(){
            var imp = d3.selectAll('.hootImport')[0];
            if(imp.length){
                for(i=0; i<imp.length; i++){
                    var n = d3.select(d3.selectAll('.hootImport')[0][i]).select('.button').node();
                    if(n){
                        hideForm(n);
                    }
                }
            }
        })

        var palette = _.filter(context.hoot().palette(), function(d){return d.name!=='green';});
        var d_form = [{
            label: 'Layers',
            type: 'fileImport',
            placeholder: 'Select Layer From Database',
            combobox: _.map(context.hoot().model.layers
                .getAvailLayers(), function (n) {
                    return n.name;
                }),
            tree: context.hoot().model.folders
            		.getAvailFoldersWithLayers()
        }];

        var sels = selection.selectAll('forms');
        var sidebar = selection.selectAll('forms')
            .data(colors)
            .enter();
        var _form = null;
        if(isPrimary){
            _form = sidebar.insert('form',":first-child");
        } else {
            _form = sidebar.append('form');
        }

        _form.classed('hootImport round space-bottom1 importableLayer fill-white strong', true)
            .on('submit', function () {
                submitLayer(this);
            })
            .append('a')
            .classed('button dark animate strong block _icon big plus pad2x pad1y js-toggle', true)
            .attr('href', '#')
            .text(function(){
            	var pnode = d3.select(d3.select(this).node().parentNode);
            	if(isPrimary || pnode.node().nextSibling){return 'Add Reference Dataset';}
                else {return 'Add Secondary Dataset';}
                })
            .on('click', function () {toggleForm(this);});
        var fieldset = _form.append('fieldset');
        fieldset.classed('pad1 keyline-left keyline-right keyline-bottom round-bottom hidden', true)
            .selectAll('.form-field')
            .data(d_form)
            .enter()
            .append('div')
            .classed('overflow',true)
            .style({'height':'150px','margin':'0 0 15px','resize':'vertical'})
            .select(ETL.renderTree);
        
        // Recently Used Layers
        var recentLayersDiv = fieldset.append('div')
        	.classed('form-field fill-white small keyline-all round space-bottom1',true);
        recentLayersDiv.append('label')
        	.classed('pad1x pad0y strong fill-light round-top keyline-bottom',true)
        	.text('Recently Used Layers');
        recentLayersDiv.append('div').classed('contain',true).append('input')
        	.attr('type','text')
        	.attr('placeholder','Recently Used Layers')
        	.classed('reset usedLayersInput combobox-input',true)
        	.attr('readonly',true)
        	.select(function(){
        		/*if(hoot.model.layers.getRecentlyUsedLayers().length==0){
        			d3.select(this.parentNode.parentNode).attr('hidden',true);
        			return;
        		}*/
        		var comboData = hoot.model.layers.getRecentlyUsedLayers();
        		var combo = d3.combobox()
	            	.data(_.map(comboData, function (n) {
	            		return {
	                         value: n,
	                         title: n
	                     };
	                 }));
	             d3.select(this)
	                 .style('width', '100%')
	                 .call(combo)
	                 .on('change',function(){
	                	 d3.select(this.parentNode.parentNode.parentNode).selectAll('svg').selectAll('rect').classed('sel',false);
	                 });
        	})	

        // Symbology control for selecting layer color
        fieldset
            .append('div')
            .classed('keyline-all form-field palette clearfix round', true)
            .style('width', 'auto')
            .selectAll('a')
            .data(palette)
            .enter()
            .append('a')
            .attr('class', function (p) {
                var active = (d3.select(this.parentNode)
                    .datum() === p.name) ? ' active _icon check' : '';
                var osm = '';
                if(p.name === 'osm'){
                    osm = ' _osm';
                }
                return 'block fl keyline-right' + active + osm;
            })
            .attr('href', '#')
            .attr('data-color', function (p) {
                return p.name;
            })
            .style('background', function (p) {
                return p.hex;
            })
            .on('click', function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                d3.select(this.parentNode)
                    .selectAll('a')
                    .classed('active _icon check', false);
                d3.select(this)
                    .classed('active _icon check', true);
                d3.select(this.parentNode)
                    .datum(d3.select(this)
                        .datum()
                        .name);
            });
        fieldset
            .append('div')
            .classed('form-field col12', true)
            .append('input')
            .attr('type', 'submit')
            .attr('value', 'Add Layer')
            .classed('fill-dark pad0y pad2x dark small strong round', true)
            .attr('border-radius','4px');


        // Add Layer click handler
        var submitLayer = function (a) {
            if(context.hoot().model.layers.isLayerLoading() === true){
            	iD.ui.Alert('Please wait utill loading first layer is done!','notice');
                return;
            }

            d3.event.stopPropagation();
            d3.event.preventDefault();

            var self = d3.select(a);
            var color = self.select('.palette .active')
                .attr('data-color');

            var name,
            	lyrid;
            try{
                // make sure something has been selected
                if(self.select('.sel').empty()){
                	//Check to see if one is selected in Recently Used
                	if(self.selectAll('.usedLayersInput').value()==''){
                    	iD.ui.Alert('Please select a dataset to add to the map!','warning');
                        return;            		
                	} else {
                		name = self.selectAll('.usedLayersInput').value();
                    	lyrid = hoot.model.layers.getmapIdByName(name);
                    	if(lyrid==null){throw new Error("Invalid layer selected");}
                	}
                } else {
                	var gNode = d3.select(self.select('.sel').node().parentNode);
                    if(!gNode.selectAll('title').empty()){name = gNode.select('title').text();}
                    else{name = gNode.select('.dnameTxt').text();}
                	lyrid = gNode.select('.dnameTxt').attr('lyr-id');
                }
            } catch(e) {
            	iD.ui.Alert('There was an error adding this layer to the map!','warning');
                return;
            }
            if(!name || !lyrid){iD.ui.Alert('Select Layer to Add','warning');return;}
            if(context.hoot().model.layers.getLayers()[name]){iD.ui.Alert('A layer with this name has already been added to the map!','warning');return;}
            var key = {
                'name': name,
                'id':lyrid,
                color: color
            };

            context.hoot().model.layers.addLayer(key, function(res){
                hoot.model.layers.setRecentlyUsedLayers(key.name);
                //update combo boxes
                var comboData = hoot.model.layers.getRecentlyUsedLayers();
        		var combo = d3.combobox().data(_.map(comboData, function (n) {return {value: n,title: n};}));
        		d3.selectAll('.usedLayersInput').each(function(){
        			d3.select(this).call(combo);
        		});
            	
            	if(res == 'showprogress'){
                    self
                    .attr('class', function () {
                        if(color == 'osm'){
                            return 'round space-bottom1 loadingLayer _osm'
                        }
                        return 'round space-bottom1 loadingLayer ' + color;
                    })
                    .select('a')
                    .remove();

                    self.append('div')
                    .classed('contain keyline-all round controller', true)
                    .html('<div class="pad1 inline _loading"><span></span></div>' +
                        '<span class="strong pad1x">Loading &#8230;</span>' +
                        '<button class="keyline-left action round-right inline _icon trash"></button>')
                    .select('button')
                    .on('click', function () {
                        d3.event.stopPropagation();
                        d3.event.preventDefault();
                        if (window.confirm('Are you sure you want to delete?')) {
                            resetForm(self);
                            return;
                        }

                    });
                    context.background().addSource(getNodeMapnikSource(key));
                }
                function getNodeMapnikSource(d) {
                    var source = {
                            name: d.name,
                            id: d.id,
                            type: 'tms',
                            description: d.name,
                            template: window.location.protocol + '//' + window.location.hostname + ':'
                                + iD.data.hootConfig.nodeMapnikServerPort
                                + '/?z={zoom}&x={x}&y={y}&color='
                                + encodeURIComponent(context.hoot().palette(d.color))
                                + '&name=' + d.name,
                            scaleExtent: [0,18],
                            overlay: true,
                            projection: 'mercator',
                            subtype: 'density_raster'
                        };
                    return source;
                }
                context.hoot().control.view.on('layerColor.background', function(name, color, mapid) {
                    var updateSource = getNodeMapnikSource({
                        name: name,
                        color: color,
                        id: mapid
                    });
                    context.background().updateSource(updateSource)
                });
                context.hoot().control.view.on('layerRemove.background', function (layerName, isPrimary, mapId) {
                    context.background().removeSource(getNodeMapnikSource({
                        name: layerName,
                        id: mapId
                    }));
                });
            });////////////////////////

        };
        var resetForm = function (self) {
            self.select('.controller')
                .remove();
            self
                .insert('a', 'fieldset')
                .attr('href', '#')
                .text('Add dataset')
                .classed('button dark animate strong block js-toggle _icon big plus pad2x pad1y', true)
                .on('click', function () {
                    if(context.map().zoom() >= iD.data.hootConfig.hootMaxImportZoom){
                        toggleForm(this);
                    }
                });
        };

        function toggleForm(selection) {
            d3.event.stopPropagation();
            d3.event.preventDefault();
            var text = (d3.select(selection)
                .classed('active')) ? false : true;
            d3.select(selection)
                .classed('active', text);
        }


        function hideForm(selection) {
           d3.select(selection)
                .classed('active', false);
        }
    };



    ETL.forceAddLayer = function(key, self, color, name) {
                    context.hoot().model.layers.addLayer(key, function(res){
                hoot.model.layers.setRecentlyUsedLayers(key.name);
                //update combo boxes
                var comboData = hoot.model.layers.getRecentlyUsedLayers();
                var combo = d3.combobox().data(_.map(comboData, function (n) {return {value: n,title: n};}));
                d3.selectAll('.usedLayersInput').each(function(){
                    d3.select(this).call(combo);
                });
                
                if(res == 'showprogress'){
                    self
                    .attr('class', function () {
                        if(color == 'osm'){
                            return 'round space-bottom1 loadingLayer _osm'
                        }
                        return 'round space-bottom1 loadingLayer ' + color;
                    })
                    .select('a')
                    .remove();

                    self.append('div')
                    .classed('contain keyline-all round controller', true)
                    .html('<div class="pad1 inline _loading"><span></span></div>' +
                        '<span class="strong pad1x">Loading &#8230;</span>' +
                        '<button class="keyline-left action round-right inline _icon trash"></button>')
                    .select('button')
                    .on('click', function () {
                        d3.event.stopPropagation();
                        d3.event.preventDefault();
                        if (window.confirm('Are you sure you want to delete?')) {
                            resetForm(self);
                            return;
                        }

                    });
                    context.background().addSource(getNodeMapnikSource(key));
                }
                function getNodeMapnikSource(d) {
                    var source = {
                            name: d.name,
                            id: d.id,
                            type: 'tms',
                            description: d.name,
                            template: window.location.protocol + '//' + window.location.hostname + ':'
                                + iD.data.hootConfig.nodeMapnikServerPort
                                + '/?z={zoom}&x={x}&y={y}&color='
                                + encodeURIComponent(context.hoot().palette(d.color))
                                + '&name=' + d.name,
                            scaleExtent: [0,18],
                            overlay: true,
                            projection: 'mercator',
                            subtype: 'density_raster'
                        };
                    return source;
                }
                context.hoot().control.view.on('layerColor.background', function(name, color, mapid) {
                    var updateSource = getNodeMapnikSource({
                        name: name,
                        color: color,
                        id: mapid
                    });
                    context.background().updateSource(updateSource)
                });
                context.hoot().control.view.on('layerRemove.background', function (layerName, isPrimary, mapId) {
                    context.background().removeSource(getNodeMapnikSource({
                        name: layerName,
                        id: mapId
                    }));
                });
            });////////////////////////

    }

    return d3.rebind(ETL, event, 'on');

};
