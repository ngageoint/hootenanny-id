/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.model.export connects UI to Hoot REST end point for export request.
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      03 Feb. 2016
//      31 May  2016 OSM API Database export type -- bwitham
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
Hoot.model.export = function (context)
{

    var model_export = {};
    var statusTimer;
    var outputname;
    var selectedInput;
    var selExportTypeDesc;
    //var removeConflationRes;
    var selectedOutType;
    var exportCallback;
    //var mapId;

    model_export.exportData = function (container, data, callback) {
        _initVariables();
        exportCallback = callback;
        if (container.outputname) { outputname = container.outputname; }
        else {
            outputname = container.select('#fileExportOutputName').value() ||
                        container.select('#fileExportOutputName').attr('placeholder');
        }
        selectedInput = data.id || outputname;

        if (container.exporttype) { selExportTypeDesc = container.exporttype; }
        else {
            selExportTypeDesc = container.select('#fileExportFileType')
            .value() || container.select('#fileExportFileType').attr('placeholder');
        }

        var _expType = {
            'File Geodatabase': 'gdb',
            'Shapefile': 'shp',
            /*'Web Feature Service (WFS)':'wfs',*/
            'OpenStreetMap (OSM)':'osm',
            'OpenStreetMap (PBF)':'osm.pbf',
            'OSM API Database':'osm_api_db'
        };
        selectedOutType = _expType[selExportTypeDesc] || selExportTypeDesc;

        var transName = null;
        var oTrans = null;

        if (container.trans) {
            transName = container.transName;
            oTrans = container.oTrans;
        } else {
            var transType = container.select('#fileExportTranslation').value();

            var comboData = container.select('#fileExportTranslation').datum();

            for(var i=0; i<comboData.combobox.data.length; i++){
                var o = comboData.combobox.data[i];
                if(o.DESCRIPTION === transType){
                    transName = o.NAME;
                    oTrans = o;
                    break;
                }
            }
        }

        var selectedTranslation = iD.data.hootConfig.defaultScript;

     // Checks to see if it is default translation and if so use the path specified

        var isDefTrans = false;
        if(oTrans && oTrans.DEFAULT === true) {
            if(oTrans.EXPORTPATH){
                oTrans.PATH = oTrans.EXPORTPATH;
            }
            if(oTrans.PATH && oTrans.PATH.length > 0){
                selectedTranslation = oTrans.PATH;
                isDefTrans = true;
            }
        }

        if(isDefTrans === false && transName != null && transName !== '' ){
            selectedTranslation = transName + '.js';
        }

        if (!selectedInput || !selectedOutType) {
            iD.ui.Alert('Please enter valid values.','error',new Error().stack);
            return;
        }

        // Check to see if we are appending to FGDB Template
        var appendTemplate= '';
        if (container.appendTemplate) { appendTemplate = container.appendTemplate; }
        else {
            try{
                appendTemplate=container.select('.cboxAppendFGDBTemplate').select('input').property('checked');
            } catch (e) {
                appendTemplate=true;
            }
        }

        // Check to see if we are exporting hoot tags, including "status" as text
        var exportHootTags= '';
        if (container.exportHootTags) {
            exportHootTags = container.exportHootTags;
        } else {
            try {
                exportHootTags = container.select('.cboxExportHootTags').select('input').property('checked');
            } catch (e) {
                exportHootTags = false;
            }
        }

        var tagoverrides = '';
        tagoverrides = context.hoot().control.utilities.exportdataset.getOverrideList();

        var param = {};
        param.translation = selectedTranslation;
        //OSM API db override - Datasets are written to an OSM API database as OSM, so translation
        //is ignored here.
        if (selectedOutType === 'osm_api_db')
        {
            param.translation = 'NONE';

            //If a Tasking Manager grid is present, provide this bbox to the conflate job
            //We will need to write the task grid to the map dataset metadata, so that
            //the "export" back to osm api db can occur in a later session without the
            //gpx layer
            var gj = context.layers().layer('gpx');
            if (gj.hasGpx()) {
                //get the task grid feature extent
                var extent = iD.geo.Extent(d3.geo.bounds(gj.geojson()));
                param.TASK_BBOX = extent.toParam();
            }
            var hash = iD.behavior.Hash(context);
            hash();
            if (hash.userid) {
                param.USER_ID = hash.userid;
            }

        }

        param.inputtype = 'db';
        param.input = selectedInput;
        param.outputtype = selectedOutType;
        param.outputname = outputname;
        param.append = appendTemplate.toString();
        param.textstatus = false;
        param.includehoottags = exportHootTags.toString();
        param.tagoverrides = (exportHootTags) ? JSON.stringify(tagoverrides) : JSON.stringify(Object.assign(context.hoot().control.utilities.settagoverrides.getHootTagList, tagoverrides));

        d3.json('../hoot-services/job/export/execute')
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(param), function (error, data) {
                if(error){
                if(callback){callback(false);}
                iD.ui.Alert('Data Download Fail','warning',new Error().stack);
                return;}


                var exportJobId = data.jobid;
                var statusUrl = '../hoot-services/job/status/' + exportJobId;
                statusTimer = setInterval(function () {
                    d3.json(statusUrl, _exportResultHandler);
                }, iD.data.hootConfig.JobStatusQueryInterval);
            });
    };

    var _exportResultHandler = function(error, result)
    {

        if (result.status !== 'running') {
            Hoot.model.REST.WarningHandler(result);
            clearInterval(statusTimer);
            var outNameParam = '';
            if (outputname !== null) {
                outNameParam = 'outputname=' + outputname;
            }
            if (exportCallback) {
                exportCallback(result.status);
            }

            if(result.status !== 'failed'){
                //Huh?
                // if(removeConflationRes === 'true'){
                //     d3.json('../hoot-services/osm/api/0.6/map/delete/' + mapId)
                //     .header('Content-Type', 'text/plain')
                //     .post('', function (error, data) {

                //     });
                // }

/*                if(selectedOutType === 'wfs'){
                    // var capaUrl = location.origin + '../hoot-services/ogc/' + result.jobId +
                    //     '?service=WFS&version=1.1.0&request=GetCapabilities';
                    //alert('WFS Resource URL:\n' + capaUrl);
                    var param = {};
                    param.id = result.jobId;
                    context.hoot().control.utilities.wfsdataset.wfsDetailPopup(param);
                }
                else */
                if (selectedOutType === 'osm_api_db')
                {
                    //OSM API db export writes directly to an osm api database and involves no file
                    //download for export.
                    var summaryStartIndex = result.statusDetail.indexOf('Changeset(s)');
                    var summary = result.statusDetail.substring(summaryStartIndex);
                    //This reset has to occur here or successively run tests will fail.
                    context.hoot().reset();
                    //having difficulty accessing the iD alerts in cucumber tests, so using a regular
                    //alert instead
                    alert('Successful export to an OSM API database:\n\n' + summary);
                }
                else {
                    var sUrl = '../hoot-services/job/export/' + result.jobId + '?' + outNameParam + '&removecache=true';
                    if (selectedOutType === 'osm.pbf') {
                        // specify the file ext since the default is zip and there is no need to zip a pbf file
                        sUrl = sUrl + '&ext=osm.pbf';
                    }
                    var link = document.createElement('a');
                    link.href = sUrl;
                    if (link.download !== undefined) {
                        //Set HTML5 download attribute. This will prevent file from opening if supported.
                        var fileName = sUrl.substring(sUrl.lastIndexOf('/') + 1, sUrl.length);
                        link.download = fileName;
                    }
                    //Dispatching click event.
                    if (document.createEvent) {
                        var e = document.createEvent('MouseEvents');
                        e.initEvent('click', true, true);
                        link.dispatchEvent(e);
                        return true;
                    }
                }
            }
            else if (selectedOutType === 'osm_api_db')
            {
                //This reset has to occur here or successively run tests will fail.
                context.hoot().reset();

                //having difficulty accessing the iD alerts in cucumber tests, so using a regular
                //alert instead

                // This is at odds with how exception messages are handled in the rest of the app,
                // however, I want to explicitly show the export failure as being due to an OSM API
                // database conflict here instead of requiring a user to sift through an error log
                // to find that error message.  Unfortunately, the callback will show the iD alert
                // to check the logs after this message is shown.
                alert(result.statusDetail);
            }

        }
    };

    var _initVariables = function()
    {
        statusTimer = null;
        outputname = null;
        selectedInput = null;
        selExportTypeDesc = null;
        //removeConflationRes = null;
        selectedOutType = null;
        exportCallback = null;
        //mapId = null;
    };

    return model_export;
};
