/** ****************************************************************************************************
 * File: conflateLayer.js
 * Project: hootenanny-ui
 * @author Jack Grossman on 11/22/18 jack.grossman@radiantsolutions.com
 *******************************************************************************************************/

const _map = require( 'lodash/map' );

const { retrieveFile } = require( '../../helpers' );

describe( 'Conflate button interaction', () => {

        let datasets,
        importModal;

    after( async () => {
        if ( Hoot.layers.findBy( 'name', 'UnitTestImportMulti' ) && Hoot.layers.findBy( 'name', 'UndividedHighway') ) {
            console.log( 'Deleting layer: "UnitTestImportMulti" & "Undivided Highway" ');
            await Hoot.api.deleteLayer( 'UnitTestImportMulti' );
            Hoot.api.deleteLayer( 'UndividedHighway' );
        }
    } );

    it( 'opens import multi modal', done => {
        d3.select( '.dataset-action-button:nth-child(2)' ).dispatch( 'click' );

        setTimeout( () => {
            expect( d3.select( '#datasets-import-form' ).size() ).to.equal( 1 );
            done();
        }, 200 );
    } );

    it( 'validates form fields', async () => {
        datasets    = Hoot.ui.managePanel.datasets;
        importModal = datasets.importMultiModal;

        let typeInput         = importModal.typeInput,
            fileInput         = importModal.fileInput,
            fileListInput     = importModal.fileListInput,
            folderNameInput   = importModal.newFolderNameInput,
            customSuffixInput = importModal.customSuffixInput,
            fileIngest        = importModal.fileIngest,
            submitButton      = importModal.submitButton;

        expect( typeInput.property( 'value' ) ).to.be.empty;
        expect( fileInput.property( 'disabled' ) ).to.be.true;
        expect( customSuffixInput.property( 'disabled' ) ).to.be.false;

        typeInput
            .property( 'value', 'Shapefile' )
            .dispatch( 'change' );

        expect( fileInput.property( 'disabled' ) ).to.be.false;
        expect( customSuffixInput.property( 'disabled' ) ).to.be.false;
        expect( submitButton.property( 'disabled' ) ).to.be.true;

        let dT = new ClipboardEvent( '' ).clipboardData || new DataTransfer();

        let fileNames = [
            'base/test/data/UnitTestImportMulti.dbf',
            'base/test/data/UnitTestImportMulti.shp',
            'base/test/data/UnitTestImportMulti.shx',
            'base/test/data/UndividedHighway.osm'
        ];

        await Promise.all( _map( fileNames, async name => {
            let file = await retrieveFile( name );

            dT.items.add( file );

            fileIngest.node().files = dT.files;
        } ) );

        await fileIngest.dispatch( 'change' );

        expect( fileInput.property( 'value' ) ).to.have.string( 'UnitTestImportMulti.dbf' );
        expect( fileInput.property( 'value' ) ).to.have.string( 'UnitTestImportMulti.shp' );
        expect( fileInput.property( 'value' ) ).to.have.string( 'UnitTestImportMulti.shx' );
        expect( fileListInput.select( 'option' ).property( 'value' ) ).to.equal( 'UnitTestImportMulti' );
        expect( submitButton.property( 'disabled' ) ).to.be.false;

        // check for invalid character in text field
        folderNameInput
            .property( 'value', '!' )
            .dispatch( 'keyup' );

        expect( folderNameInput.classed( 'invalid' ) ).to.be.true;
        expect( submitButton.property( 'disabled' ) ).to.be.true;

        // check for proper values in all fields
        folderNameInput
            .property( 'value', '' )
            .dispatch( 'keyup' );

        expect( customSuffixInput.classed( 'invalid' ) ).to.be.false;
        expect( folderNameInput.classed( 'invalid' ) ).to.be.false;
        expect( submitButton.property( 'disabled' ) ).to.be.false;
    } );

    it( 'imports a new layer from Shapefile', async () => {
        let importSubmit = importModal.submitButton;

        expect( importSubmit.select( 'span' ).text() ).to.equal( 'Import' );
        expect( Hoot.layers.findBy( 'name', 'UnitTestImportMulti' ) ).to.be.undefined;

        importSubmit.dispatch( 'click' );

        expect( importSubmit.select( 'span' ).text() ).to.equal( 'Uploading...' );

        await importModal.processRequest;

        setTimeout( () => {

        expect( datasets.importMultiModal ).to.be.undefined;
        expect( Hoot.layers.findBy( 'name', 'UnitTestImportMulti' ) ).to.be.ok;
        expect( d3.select( '#dataset-table' ).select( 'g[data-name="UnitTestImportMulti"]' ).size() ).to.equal( 1 );
        }, 10000 );
        
    } );


    it( 'Selects a Primary Layer', done => {
        d3.select('#reference a.toggle-button').dispatch('click');
        setTimeout(() => {
            var availableLayers = d3.select('div.inner-wrapper').attr('class');
            expect(availableLayers).to.include( 'visible' );
            done();
        }, 1000);
    } );
    it( 'Selects Primary dataset dataset', done => {
        d3.select('#add-ref-table g[data-name="UndividedHighway"]').dispatch('click');
        d3.select('#add-ref-table').dispatch('click');
        d3.select('button.add-layer').dispatch('click');
        setTimeout(() => {
            var primaryData = d3.select('#reference').attr('data-name');
            expect(primaryData).to.be.eql('UndividedHighway');
            done();
        }, 2500);
    } );
    it ( 'Conflate button IS NOT visible ' , done => {
        setTimeout( () => {
            expect( d3.select('#conflate').size() ).to.be.eql( 0 );
            done();
        }, 1000 );

    } );
    it( 'Selects Reference dataset', done => {
        d3.select('#secondary a.toggle-button').dispatch('click');
        d3.select('#add-secondary-table g[data-name="UnitTestImportMulti"]').dispatch('click');
        d3.select('#add-secondary-table').dispatch('click');
        d3.select('button.add-layer').dispatch('click');
        setTimeout(() => {
            var secondaryData = d3.select('#secondary').attr('data-name');
            expect(secondaryData).to.be.eql('UnitTestImportMulti');
            done();
        }, 6000);
    });
    it ( 'Conflate button IS visible ' , done => {
        setTimeout( () => {
            expect( d3.select('#conflate').size() ).to.be.eql( 1 );
            done();
        }, 1000 );

    } );
    it ( 'Deletes a layer', done => {

        d3.select( '#secondary button.delete-button' ).dispatch( 'click' );
        d3.select( 'div.confirm-actions button.primary' ).dispatch( 'click' );
        setTimeout( () => {
            expect(d3.select( '#secondary' ).text() ).to.include( 'Add Secondary Datasets' );
            done();
        }, 1000 );
    } );
    it ( 'Conflate button IS NOT visible ' , done => {
        setTimeout( () => {
            expect( d3.select('#conflate').size() ).to.be.eql( 0 );
            done();
        }, 1000 );
    } );
} );