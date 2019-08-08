import FormFactory from './formFactory';

import { formatBbox } from './utilities';

export default class GrailPull {
    constructor( instance ) {
        this.instance = instance;
        this.maxFeatureCount = 80000;
    }

    render() {
        let titleText = this.instance.bboxSelectType === 'visualExtent'
            ? 'Pull Remote Data to Visual Extent'
            : this.instance.bboxSelectType === 'boundingBox'
                ? 'Pull Remote Data to Bounding Box'
                : 'Pull Remote Data';

        let metadata = {
            title: titleText,
            button: {
                text: 'Submit',
                id: 'SubmitBtn',
                onClick: () => this.handleSubmit()
            }
        };

        let formId = 'grailPullTable';

        this.form         = new FormFactory().generateForm( 'body', formId, metadata );
        this.submitButton = d3.select( `#${ metadata.button.id }` );

        this.submitButton.property( 'disabled', false );

        this.loadingState(true);

        Hoot.api.overpassStatsQuery(this.instance.bbox)
            .then(queryData => {
                Hoot.api.getOverpassStats(queryData.data.overpassQuery)
                    .then(queryResult => {
                    this.createTable(queryResult);
                });
            });
    }

    createTable(data) {
        this.loadingState(false);

        const csvValues = data.split('\n')[1],
              arrayValues = csvValues.split('\t');
        const rowData = [
            {label: 'node', count: +arrayValues[1]},
            {label: 'way', count: +arrayValues[2]},
            {label: 'relation', count: +arrayValues[3]},
            {label: 'total', count: +arrayValues[0]}
        ];

        let table = this.form
            .select( '.wrapper div' )
            .insert( 'table', '.modal-footer' )
            .classed( 'pullStatsInfo', true );

        let tbody = table.append('tbody');

        let rows = tbody.selectAll('tr')
            .data(rowData)
            .enter()
            .append('tr');

        rows.append('td')
            .text( data => data.label );

        rows.append('td')
            .classed( 'strong', data => data.count > 0 )
            .classed( 'badData', data => data.label === 'total' && data.count > this.maxFeatureCount )
            .text( data => data.count );

        if (+arrayValues[0] > this.maxFeatureCount) {
            this.form.select( '.hoot-menu' )
                .insert( 'div', '.modal-footer' )
                .classed( 'badData', true )
                .text( `Max feature count of ${this.maxFeatureCount} exceeded` );

            this.submitButton.node().disabled = true;
        }
    }

    handleSubmit() {
        const bbox   = this.instance.bbox,
              params = {};

        if ( !bbox ) {
            Hoot.message.alert( 'Need a bounding box!' );
            return;
        }

        let osmData     = this.form.select( '.osmName' ),
            mapEditData = this.form.select( '.mapeditName' );

        params.BBOX     = formatBbox( bbox );

        Promise.all([
                Hoot.api.grailPullOverpassToDb( params ),
                Hoot.api.grailPullRailsPortToDb( params )
            ])
            .then( ( resp ) => {
                resp.forEach( jobResp => {
                    Hoot.message.alert( jobResp );
                });
            } )
            .then( () => Hoot.folders.refreshAll() )
            .then( () => Hoot.events.emit( 'render-dataset-table' ) );

        this.form.remove();
    }

    loadingState(isLoading) {

        this.submitButton
            .select( 'span' )
            .text( isLoading ? 'Loading Stats' : 'Submit' );


        if (isLoading){
            this.submitButton
                .append( 'div' )
                .classed( '_icon _loading float-right', true )
                .attr( 'id', 'importSpin' );
        } else {
            this.submitButton.select('div').remove();
        }
    }
}
