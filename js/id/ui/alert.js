iD.ui.Alert = function(message,type,stack) {
    var alerts = d3.select("#alerts");
    var alertDiv = alerts.append('div')
    	.classed('fillD alertDiv',true)
    	.on('click',function(){
			clearTimeout(uniqueTimeout);
    		d3.select(this).transition().duration(0).style("opacity",1);
		})
		;
    
    type = type.toLowerCase();
    
    var displayTime = 10000;
    var fadeTime = 5000;
    var uniqueTimeout = setTimeout(function(){fadeOut(alertDiv);}, displayTime);
    
    if(type==undefined){type='notice';}
    
    if(type=='warning'||type=='error'){alertDiv.classed('red',true);}
    if(type=='notice'){alertDiv.classed('blue',true);}
    if(type=='success'){alertDiv.classed('green',true);}
    
    alertDiv.append('div')
		.classed('fr _icon x dark point', true)
		.on('click',function() {this.parentNode.remove();});
	
	alertDiv.append('h3').text(message);

	var d = new Date().toLocaleString();
	try{
		hoot.view.utilities.errorlog.reportUIError(d + ": " + message,stack);
	} catch(e){
		alert(message);
	}
	
	function fadeOut(selection){
		selection.style("opacity",1).transition().duration(fadeTime).style("opacity",0).remove();
	}

    ////// ALERT TYPES //////
    /*
     * warning
     * error
     * notice
     * success
     */
    
    // Colors: Red, Yellow, Green, Blue
	
    return;
};

