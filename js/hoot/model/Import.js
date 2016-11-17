/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.model.import connects UI to Hoot REST end point for ETL processing.
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      03 Feb. 2016
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
Hoot.model.import = function (context)
{
    var import_layer = {};
    var importCallback;
    var jobIdsArr;
    var mapIdsArr;

    import_layer.updateTrees = function()
    {
        //This function updates the SVG folder/dataset collapsable tree
        var datasettable = d3.select('#datasettable');
        context.hoot().view.utilities.dataset.populateDatasetsSVG(datasettable);

        _.each(d3.select('#sidebar2').node().childNodes,function(f){
            if(f.classList.contains('hootImport')){
                var _svg = d3.select(f).select('svg');
                if(!_svg.empty()){
                    var container = _svg.node().parentNode;
                    _svg.remove();
                    context.hoot().control.utilities.folder.createFolderTree(d3.select(container));
                }
            }
        });
    };

    import_layer.importDirectory = function (container, schemaElemId, typeElemId, newLayerName,
        ingestFiles, newfolderElemId, callback) {
        _initVariables();
        importCallback = callback;

        jobIdsArr = [];
        mapIdsArr = [];
        var transType = container.select(schemaElemId).value();

        var comboData = container.select(schemaElemId).datum();
        var transName = transType;
        var oTrans = null;
        for(var i=0; i<comboData.combobox.length; i++){
            var o = comboData.combobox[i];
            if(o.DESCRIPTION === transType){
                transName = o.NAME;
                oTrans = o;
                break;
            }

        }

        // Checks to see if it is default translation and if so use the path specified
        var transcriptName = iD.data.hootConfig.defaultScript;
        var isDefTrans = false;
        if(oTrans && oTrans.DEFAULT === true) {
            if(oTrans.IMPORTPATH){
                oTrans.PATH = oTrans.IMPORTPATH;
            }
            if(oTrans.PATH && oTrans.PATH.length > 0){
                transcriptName = oTrans.PATH;
                isDefTrans = true;
            }
        }

        if(isDefTrans === false && transName != null && transName !== ''){
            transcriptName = 'customscript/' + transName + '.js';
        }

        var selType = container.select(typeElemId).value();

        comboData = container.select(typeElemId).datum();
        var typeName = '';
        for(i=0; i<comboData.combobox.data.length; i++){
            o = comboData.combobox.data[i];
            if(o.title === selType){
                typeName = o.value;
                break;
            }

        }

        if(newfolderElemId) {
            // Check new folder name
            //try{
                var newfoldername = container.select(newfolderElemId).value();
                if(newfoldername !==''){
                    var resp = context.hoot().checkForUnallowedChar(newfoldername);
                    if(resp !== true){
                        iD.ui.Alert(resp,'warning',new Error().stack);
                        return;
                    }
                }
            // } catch (e) {
            //     // TODO: handle exception
            // }
        }

        var data = {};
        if(oTrans && oTrans.NONE === 'true'){
            data.NONE_TRANSLATION = true;
        } else {
            data.NONE_TRANSLATION = false;
        }

        data.INPUT_TYPE = typeName;
        data.TRANSLATION = transcriptName;//(transType === 'LTDS 4.0' || !transType) ? 'NFDD.js' : transType + '.js';
        data.INPUT_NAME = newLayerName;

        if(!container.attr('id')){
            data.formData = import_layer.getFormData(ingestFiles);
        }

        Hoot.model.REST('Upload', data, _importResultHandler);
    };

    import_layer.importData = function (container, schemaElemId, typeElemId,
        newfolderElemId, layerNameElemId, FgdbFeatureClassElemId, callback) {
        _initVariables();
        importCallback = callback;

        jobIdsArr = [];
        mapIdsArr = [];
        var transType = container.select(schemaElemId).value();

        var comboData = container.select(schemaElemId).datum();
        var transName = transType;
        var oTrans = null;
        for(var i=0; i<comboData.combobox.length; i++){
            var o = comboData.combobox[i];
            if(o.DESCRIPTION === transType){
                transName = o.NAME;
                oTrans = o;
                break;
            }

        }

        // Checks to see if it is default translation and if so use the path specified
        var transcriptName = iD.data.hootConfig.defaultScript;
        var isDefTrans = false;
        if(oTrans && oTrans.DEFAULT === true) {
            if(oTrans.IMPORTPATH){
                oTrans.PATH = oTrans.IMPORTPATH;
            }
            if(oTrans.PATH && oTrans.PATH.length > 0){
                transcriptName = oTrans.PATH;
                isDefTrans = true;
            }
        }

        if(isDefTrans === false && transName != null && transName !== ''){
            transcriptName = 'customscript/' + transName + '.js';
        }

        var selType = container.select(typeElemId).value();

        comboData = container.select(typeElemId).datum();
        var typeName = '';
        for(i=0; i<comboData.combobox.data.length; i++){
            o = comboData.combobox.data[i];
            if(o.title === selType){
                typeName = o.value;
                break;
            }

        }

        if(newfolderElemId) {
            // Check new folder name
            //try{
                var newfoldername = container.select(newfolderElemId).value();
                if(newfoldername !==''){
                    var resp = context.hoot().checkForUnallowedChar(newfoldername);
                    if(resp !== true){
                        iD.ui.Alert(resp,'warning',new Error().stack);
                        return;
                    }
                }
            // } catch (e) {
            //     // TODO: handle exception
            // }
        }

        var fgdbFCList;
        if(FgdbFeatureClassElemId && !container.select(FgdbFeatureClassElemId).empty()) {
            fgdbFCList = container.select(FgdbFeatureClassElemId).value();
        }

        var data = {};
        if(oTrans && oTrans.NONE === 'true'){
            data.NONE_TRANSLATION = true;
        } else {
            data.NONE_TRANSLATION = false;
        }

        data.INPUT_TYPE = typeName;
        data.TRANSLATION = transcriptName;//(transType === 'LTDS 4.0' || !transType) ? 'NFDD.js' : transType + '.js';
        
        if(layerNameElemId.charAt(0) === '.' || layerNameElemId.charAt(0) === '#'){
            data.INPUT_NAME = container.select(layerNameElemId).value();
        } else {
            data.INPUT_NAME = layerNameElemId;
        }

        if(fgdbFCList && fgdbFCList.length > 0) {
            data.FGDB_FC = fgdbFCList;
        }

        if(!container.attr('id')){
            data.formData = import_layer.getFormData(document.getElementById('ingestfileuploader').files);
        } else if(container.attr('id').substring(0,3)==='row'){
            data.formData = import_layer.getFormData(document.getElementById('ingestfileuploader'+container.attr('id').substring(3)).files);
        }

        Hoot.model.REST('Upload', data, _importResultHandler);
    };

    import_layer.getFormData = function(files)
    {
        var formData = new FormData();
        //var files = document.getElementById('ingestfileuploader').files;

        _.each(files, function(d,l){
            formData.append('eltuploadfile' + l, d);
        });
        return formData;
    };

    var _importResultHandler = function (resp) {
        var status;
        if (!resp || resp.responseText.length === 0 || resp.response==='[]') {
            if(importCallback){
                status = {};
                status.info = 'failed';
                status.error=resp.errorMessage || '';
                importCallback(status);
             }
            return;
        }

        var imprtProg = d3.select('#importprogress');

        var jobStatus = resp.responseText;
        var jobStatusArr = JSON.parse(jobStatus);
        for (var ii = 0; ii < jobStatusArr.length; ii++) {
            var o = jobStatusArr[ii];
            jobIdsArr.push(o.jobid);
            mapIdsArr.push(o.output);
        }

        if(importCallback){
            status = {};
            status.info = 'uploaded';
            status.jobids = jobIdsArr;
            status.mapids = mapIdsArr;
            importCallback(status);
        }

        var stat = function (curJobId) {
            Hoot.model.REST('jobStatusLegacy', curJobId, function (a) {
                if (a.status !== 'running' || !a.status) {
                    if (_.contains(jobIdsArr, a.jobId)) {
                        jobIdsArr = _.without(jobIdsArr, a.jobId);
                    }
                    if (jobIdsArr.length === 0) {
                        clearInterval(uploadJobStatusTimer);
                    }

                    Hoot.model.REST.WarningHandler(a);
                    uploadJobStatusStopTimer(a);
                }
                var truncatedLastText = a.lasttext;
                    if(truncatedLastText){
                        // Removed truncation per #5565
                        /*var truncatelen = 70;
                        if(truncatedLastText.length > truncatelen){
                            truncatedLastText = truncatedLastText.substring(0, truncatelen) + ' ...';
                        }*/

                        d3.select('#importprogdiv').append('br');
                        d3.select('#importprogdiv').append('text').text(truncatedLastText);
                    }

                    imprtProg.value(a.percentcomplete);
            });
        };
        var getstatus = function () {
            for (var j = 0; j < jobIdsArr.length; j++) {
                var curJobId = jobIdsArr[j];
                stat(curJobId);
            }
        };
        var uploadJobStatusTimer = setInterval(function () {
            getstatus();
        }, iD.data.hootConfig.JobStatusQueryInterval);
        var uploadJobStatusStopTimer = function (uploadJobStat) {
            context.hoot().model.layers.refresh(
                function() {
                    _uploadHandler(uploadJobStat);
                }
            );
        };
    };

    var _uploadHandler = function (uploadJobStat)
    {
        //context.hoot().model.import.updateTrees(); //moved to when links are refreshed
        if(importCallback){
            var status = {};
            status.info = uploadJobStat.status;
            if(status.info==='failed'){
                try{
                    status.error = JSON.parse(uploadJobStat.statusDetail).children[0].detail || undefined;
                } catch(e) {
                    status.error = undefined;
                }
            }
            importCallback(status);
            }
    };

    var _initVariables = function()
    {
        importCallback = null;
        jobIdsArr = null;
        mapIdsArr = null;
    };
    return import_layer;
};
