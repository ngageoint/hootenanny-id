import Tab            from './tab';
import ProgressBar    from 'progressbar.js';
import DifferentialStats from '../modals/differentialStats';
import JobCommandInfo from '../modals/jobCommandInfo';
import { duration } from '../../tools/utilities';

const getJobTypeIcon = Symbol('getJobTypeIcon');

/**
 * Creates the jobs tab in the settings panel
 *
 * @extends Tab
 * @constructor
 */
export default class Jobs extends Tab {
    constructor( instance ) {
        super( instance );

        this.name = 'Jobs';
        this.id   = 'util-jobs';

        this.privileges = Hoot.user().privileges;
    }

    render() {
        super.render();

        this.createJobsTable();

        this.loadJobs();

        return this;
    }

    activate() {
        this.loadJobs();
        this.poller = window.setInterval( this.loadJobs.bind(this), 5000 );
    }

    deactivate() {
        window.clearInterval(this.poller);
    }

    createJobsTable() {
        this.panelWrapper
            .append( 'h3' )
            .text( 'Running Jobs' );
        this.jobsRunningTable = this.panelWrapper
            .append( 'div' )
            .classed( 'jobs-table jobs-running keyline-all fill-white', true );
        this.panelWrapper
            .append( 'h3' )
            .classed( 'jobs-history', true )
            .text( 'Jobs History' );
        this.jobsHistoryTable = this.panelWrapper
            .append( 'div' )
            .classed( 'jobs-table jobs-history keyline-all fill-white', true );
    }

    async loadJobs() {
        let jobsRunning = await Hoot.api.getJobsRunning();
        let jobsHistory = await Hoot.api.getJobsHistory();
        await Hoot.layers.refreshLayers();
        this.populateJobsHistory( jobsHistory );
        this.populateJobsRunning( jobsRunning );
    }

    [getJobTypeIcon](type) {
        let typeIcon;
        switch (type) {
            case 'import':
                typeIcon = 'publish';
                break;
            case 'export':
                typeIcon = 'get_app';
                break;
            case 'conflate':
                typeIcon = 'layers';
                break;
            case 'clip':
                typeIcon = 'crop';
                break;
            case 'attributes':
                typeIcon = 'list_alt';
                break;
            case 'basemap':
                typeIcon = 'map';
                break;
            case 'delete':
                typeIcon = 'delete';
                break;
            case 'derive_changeset':
                typeIcon = 'change_history';
                break;
            case 'upload_changeset':
                typeIcon = 'cloud_upload';
                break;
            case 'unknown':
            default:
                typeIcon = 'help';
                break;
        }
        return typeIcon;
    }

    populateJobsRunning( jobs ) {
        let table = this.jobsRunningTable
            .selectAll('table')
            .data([0]);
        let tableEnter = table.enter()
                .append('table');

        let thead = tableEnter
            .append('thead');
        thead.selectAll('tr')
            .data([0])
            .enter().append('tr')
            .selectAll('th')
            .data([
                'Job Type',
                'Owner',
                'Started',
                'Progress',
                'Actions'
                ])
            .enter().append('th')
            .text(d => d);

        table = table.merge(tableEnter);

        let tbody = table.selectAll('tbody')
            .data([0]);
        tbody.exit().remove();
        tbody = tbody.enter()
            .append('tbody')
            .merge(tbody);

        let rows = tbody
            .selectAll( 'tr.jobs-item' )
            .data( jobs, d => d.jobId );

        rows.exit().remove();

        let rowsEnter = rows
            .enter()
            .append( 'tr' )
            .classed( 'jobs-item keyline-bottom', true );

        rows = rows.merge(rowsEnter);

        let cells = rows.selectAll( 'td' )
            .data(d => {
                let props = [];

                //this data is an array of objects
                //  {
                //    i: [{/* array of icon props */ }],
                //    span: [{/* array of text props */ }]
                //  `}

                //Job Type
                props.push({
                    i: [{icon: this[getJobTypeIcon](d.jobType), action: () => {} }],
                    span: [{text: d.jobType.toUpperCase()}]
                });

                //Owner
                let owner = Hoot.users.getNameForId(d.userId);
                props.push({
                    span: [{text: owner}]
                });

                //Start
                props.push({
                    span: [{ text: duration(d.start, Date.now(), true) }]
                });

                //Progress bar
                props.push({
                    span: [{ text: Math.round(d.percentcomplete) + '%' }],
                    progress: [{ percent: d.percentcomplete }]
                });

                //Actions
                let actions = [];
                let user = JSON.parse( localStorage.getItem( 'user' ) );


                if (d.userId === user.id) {
                    //Get logging for the job
                    actions.push({
                        title: 'view log',
                        icon: 'subject',
                        action: async () => {
                            this.commandDetails = new JobCommandInfo(d.jobId, true);
                            this.commandDetails.render();

                            Hoot.events.once( 'modal-closed', () => {
                                this.commandDetails.deactivate();
                                delete this.commandDetails;
                            });
                        }
                    });

                    //Add a cancel button
                    actions.push({
                        title: 'cancel job',
                        icon: 'cancel',
                        action: async () => {
                            let message = 'Are you sure you want to cancel this job?',
                            confirm = await Hoot.message.confirm( message );

                            if ( confirm ) {
                                d3.select('#util-jobs').classed('wait', true);
                                Hoot.api.cancelJob(d.jobId)
                                    .then( resp => this.loadJobs() )
                                    .finally( () => d3.select('#util-jobs').classed('wait', false));
                            }
                        }
                    });
                }

                props.push({
                    i: actions
                });

                return props;
            });

        cells.exit().remove();

        let cellsEnter = cells
            .enter().append( 'td' )
            .classed('progress', d => d.progress);

        cells = cells.merge(cellsEnter);

        let i = cells.selectAll( 'i' )
            .data( d => (d.i) ? d.i : [] );
        i.exit().remove();
        i.enter().insert('i', 'span')
            .classed( 'material-icons', true )
            .merge(i)
            .text( d => d.icon )
            .attr('title', d => d.title )
            .on('click', d => d.action());

        let progressbar = cells.selectAll('div')
            .data( d => (d.progress) ? d.progress : [] );
        progressbar.exit().remove();
        let pgEnter = progressbar.enter().append('div')
            .classed('job-progress', true);
        pgEnter.each(function(d) {
            let pb = new ProgressBar.Line(this, {
                color: 'rgb(112, 146, 255)',
                strokeWidth: 3,
                trailWidth: 1,
            });
            pb.animate(d.percent / 100);
            //I feel yucky doing this, but need
            //the ref in the merge below
            this.pb = pb;
        });

        progressbar.merge(pgEnter)
            .each( function(d) {
                this.pb.animate(d.percent / 100);
            });


        let span = cells.selectAll('span')
            .data( d => (d.span) ? d.span : [] );
        span.exit().remove();
        span.enter().append('span')
            .merge(span)
            .text( d => d.text );

    }


    populateJobsHistory( jobs ) {
        let table = this.jobsHistoryTable
            .selectAll('table')
            .data([0]);
        let tableEnter = table.enter()
                .append('table');

        let thead = tableEnter
            .append('thead');
        thead.selectAll('tr')
            .data([0])
            .enter().append('tr')
            .selectAll('th')
            .data([
                'Job Type',
                'Output',
                'Status',
                'Started',
                'Duration',
                'Actions'
                ])
            .enter().append('th')
            .text(d => d);

        table = table.merge(tableEnter);

        let tbody = table.selectAll('tbody')
            .data([0]);
        tbody.exit().remove();
        tbody = tbody.enter()
            .append('tbody')
            .merge(tbody);

        let rows = tbody
            .selectAll( 'tr.jobs-item' )
            .data( jobs, d => d.jobId );

        rows.exit().remove();

        let rowsEnter = rows
            .enter()
            .append( 'tr' )
            .classed( 'jobs-item keyline-bottom', true );

        rows = rows.merge(rowsEnter);

        let cells = rows.selectAll( 'td' )
            .data(d => {
                let props = [];

                //this data is an array of objects
                //  {
                //    i: [{/* array of icon props */ }],
                //    span: [{/* array of text props */ }]
                //  `}

                //Job Type
                props.push({
                    i: [{icon: this[getJobTypeIcon](d.jobType), action: () => {} }],
                    span: [{text: d.jobType.toUpperCase()}]
                });

                //Output
                let map = Hoot.layers.findBy( 'id', d.mapId );

                if (map) {
                    props.push({
                        span: [{text: map.name}]
                    });
                } else {
                    props.push({
                        span: [{text: 'Map no longer exists'}]
                    });
                }

                //Status
                let statusIcon;
                switch (d.status) {
                    case 'running':
                        statusIcon = 'autorenew';
                        break;
                    case 'complete':
                        statusIcon = 'check_circle_outline';
                        break;
                    case 'failed':
                        statusIcon = 'warning';
                        break;
                    case 'cancelled':
                        statusIcon = 'cancel';
                        break;
                    case 'unknown':
                    default:
                        statusIcon = 'help';
                        break;
                }

                if (d.status === 'failed') {
                    props.push({
                        i: [{
                            icon: statusIcon,
                            title: 'show error',
                            action: () => {
                                Hoot.api.getJobError(d.jobId)
                                    .then( resp => {
                                        let type = 'error';
                                        let message = resp.errors.join('\n');
                                        Hoot.message.alert( { message, type } );
                                    } );
                            }
                        }]
                    });
                } else {
                    props.push({
                        i: [{ icon: statusIcon }]
                    });
                }

                //Start
                props.push({
                    span: [{text: duration(d.start, Date.now(), true) }]
                });

                //Duration
                props.push({
                    span: [{text: duration(d.start, d.end) }]
                });

                //Actions
                let actions = [];

                if (map) {

                    let refLayer = Hoot.layers.findLoadedBy('refType', 'primary') ? 2 : 0;
                    let secLayer = Hoot.layers.findLoadedBy('refType', 'secondary') ? 1 : 0;
                    let refType;
                    //use bitwise comparison to see which layers are already loaded
                    switch (refLayer | secLayer) {
                        case 0:
                        case 1:
                            refType = 'reference';
                            break;
                        case 2:
                            refType = 'secondary';
                            break;
                        case 3:
                        default:
                            refType = null;
                            break;
                    }

                    if (refType) {
                        //Add to map
                        actions.push({
                            title: `add to map as ${refType}`,
                            icon: 'add_circle_outline',
                            action: () => {
                                let params = {
                                    name: map.name,
                                    id: d.mapId
                                };

                                Hoot.ui.sidebar.forms[ refType ].submitLayer( params )
                                    .then( () => {
                                        let message = `${refType} layer added to map: <u>${map.name}</u>`,
                                            type    = 'info';

                                        Hoot.message.alert( { message, type } );

                                        this.loadJobs();
                                    } );
                            }
                        });
                    }
/* Comment this out for now
*  the call to map tags actually updates the last accessed datetime
*  which is not desireable as it's one of the info properties shown
                    //Get info
                    actions.push({
                        title: `show info`,
                        icon: 'info',
                        action: () => {
                            Hoot.api.getMapTags(d.mapId)
                                .then( tags => {
                                    let type = 'info';
                                    let lines = [];
                                    if (tags.lastAccessed) lines.push(`Last accessed: ${moment(tags.lastAccessed.replace( /[-:]/g, '' )).fromNow()}`);
                                    if (tags.input1Name) lines.push(`Reference: ${tags.input1Name}`);
                                    if (tags.input2Name) lines.push(`Secondary: ${tags.input2Name}`);
                                    if (tags.params) {
                                        let params = JSON.parse(tags.params.replace(/\\"/g, '"'));
                                        lines.push(`Conflation type: ${params.CONFLATION_TYPE}`);
                                    }

                                    let message = lines.join('<br>');
                                    Hoot.message.alert( { message, type } );
                                } );
                        }
                    });
*/
                }

                //Clear job
                actions.push({
                    title: 'clear job',
                    icon: 'clear',
                    action: async () => {
                        let self = this;
                        function deleteJob(id) {
                            d3.select('#util-jobs').classed('wait', true);
                            Hoot.api.deleteJobStatus(id)
                                .then( resp => self.loadJobs() )
                                .finally( () => d3.select('#util-jobs').classed('wait', false));
                        }
                        if (d3.event.shiftKey) { //omit confirm prompt
                            deleteJob(d.jobId);
                        } else {
                            let message = 'Are you sure you want to clear this job record?',
                            confirm = await Hoot.message.confirm( message );

                            if ( confirm ) {
                                deleteJob(d.jobId);
                            }
                        }

                    }
                });


                // Only advanced user may perform these
                if (this.privileges && this.privileges.advanced === 'true') {
                    if (d.jobType.toUpperCase() === 'DERIVE_CHANGESET') {
                        //Get info for the derive
                        actions.push({
                            title: 'upload changeset',
                            icon: 'cloud_upload',
                            action: async () => {
                                Hoot.api.differentialStats(d.jobId, false)
                                    .then( resp => {
                                        this.diffStats = new DifferentialStats( d.jobId, resp.data ).render();

                                        Hoot.events.once( 'modal-closed', () => delete this.diffStats );
                                    } )
                                    .catch( err => {
                                        Hoot.message.alert( err );
                                        return false;
                                    } );
                            }
                        });

                        actions.push({
                            title: 'download changeset',
                            icon: 'save_alt',
                            action: async () => {
                                Hoot.api.saveChangeset( d.jobId );
                            }
                        });
                    }

                    if (d.jobType.toUpperCase() === 'CONFLATE') {
                        let currentLayer = this.findLayer( d.mapId );

                        if (currentLayer && currentLayer.grail) {
                            //Get info for the derive
                            actions.push({
                                title: 'derive changeset',
                                icon: 'change_history',
                                action: async () => {
                                    const tagsInfo = await Hoot.api.getMapTags(currentLayer.id);

                                    const params  = {};
                                    params.input1 = parseInt(tagsInfo.input1, 10);
                                    params.input2 = d.mapId;

                                    Hoot.api.conflateDifferential( params )
                                        .then( resp => Hoot.message.alert( resp ) );
                                }
                            });
                        }
                    }
                }

                //Get logging for the job
                actions.push({
                    title: 'view log',
                    icon: 'subject',
                    action: async () => {
                        this.commandDetails = new JobCommandInfo(d.jobId);
                        this.commandDetails.render();

                        Hoot.events.once( 'modal-closed', () => delete this.commandDetails );
                    }
                });

                props.push({
                    i: actions
                });

                return props;
            });

        cells.exit().remove();

        let cellsEnter = cells
            .enter().append( 'td' );

        cells = cells.merge(cellsEnter);

        let i = cells.selectAll( 'i' )
            .data( d => (d.i) ? d.i : [] );
        i.exit().remove();
        i.enter().insert('i', 'span')
            .classed( 'material-icons', true )
            .merge(i)
            .text( d => d.icon )
            .attr('title', d => d.title )
            .on('click', d => {
                if ( d.action ) {
                    d.action();
                }
            });

        let span = cells.selectAll('span')
            .data( d => (d.span) ? d.span : [] );
        span.exit().remove();
        span.enter().append('span')
            .merge(span)
            .text( d => d.text );

    }

    findLayer( layerId ) {
        return Hoot.layers.allLayers.find( layer => {
            return layer.id === layerId;
        });
    }

}
