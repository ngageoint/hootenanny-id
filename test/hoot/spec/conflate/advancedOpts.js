import { expect } from 'chai';
import AdvancedOpts  from '../../../../modules/Hoot/ui/sidebar/advancedOpts';

const { generateAdvOptsLayerParams } = require( '../../helpers' );


describe( 'Advanced Options', () => {
        let layerParams;
        const className = 'advancedOptsTest';

        before( async () => { // upload 2 datasets and have conflate ui showing...
            try {
                let generateCount = 2;
                layerParams = await generateAdvOptsLayerParams( [ ...Array( generateCount ).keys() ] );

                await Promise.all(layerParams.map(params => Hoot.api.uploadDataset( params )
                    .then( resp => {
                        let jobId = resp.data[ 0 ].jobid;
                        return Hoot.api.statusInterval( jobId ); //wait for import job to complete
                    } )
                    .then( async () => {
                        await Hoot.folders.refreshAll();

                        expect(Hoot.layers.allLayers
                            .filter(lyr => lyr.name.startsWith('advOpts_')).length,
                            'there are two adv opts layers')
                            .to.be.equal( 2 );

                        let layerNames = Hoot.layers.allLayers
                            .filter(lyr => lyr.name.startsWith('advOpts_'))
                            .map(lyr => lyr.name);
                        expect(layerParams.map( lyr => lyr.INPUT_NAME).every( lyrName => layerNames.includes(lyrName) ),
                            'the layer names match what was uploaded').to.be.true;
                    } )
                ));

                await Hoot.events.emit( 'render-dataset-table' );

                await new Promise(res => {
                    d3.select( '#reference a' ).dispatch( 'click' ); // open add ref layer...
                    Hoot.events.listen( className, 'load-layer', () => res());

                    setTimeout(() => {
                        let reference = d3.select( '#reference' );
                        expect(reference.size(), 'there is a reference layer section').to.be.equal(1);

                        reference // set desired ref dataset...
                            .select( '.recently-used-input' )
                            .property( 'value', layerParams[0].INPUT_NAME )
                            .dispatch( 'change' );

                        setTimeout(() => {
                            reference // add layer
                                .select( '.add-layer' )
                                .dispatch( 'click' );
                        }, 100);
                    }, 100);
                })
                .then(() => { // same logic as above, just for secondary...
                    return new Promise(res => {
                        d3.select( '#secondary a' ).dispatch( 'click' );
                        Hoot.events.listen( className, 'load-layer', () => res());

                        setTimeout(() => {
                            let secondary = d3.select( '#secondary' );
                            expect(secondary.size(), 'there is a secondary layer section').to.be.equal(1);

                            secondary
                                .select( '.recently-used-input' )
                                .property( 'value', layerParams[1].INPUT_NAME )
                                .dispatch( 'change' );

                            setTimeout(() => {
                                secondary
                                    .select( '.add-layer' )
                                    .dispatch( 'click' );
                            }, 100);
                        }, 100);
                    });
                })
                .then(() => {
                    return new Promise(res => {
                        setTimeout(() => {
                            let conButton = d3.select( '#conflate .toggle-button' );
                            expect( conButton.size(), 'there is a conflate button' ).to.be.equal(1);
                            conButton.dispatch( 'click' );
                            setTimeout(() => {
                                res();
                            }, 500);
                        }, 500);
                    });
                });
            } catch (e) {
                console.error(e);
            } finally { /* eslint-disable */
                return Promise.resolve();
            }
        } );

        after( async () => {
            let reference = d3.select( '#reference' ),
                secondary = d3.select( '#secondary' );

            Hoot.layers.removeLoadedLayer( reference.attr('data-id') );
            Hoot.ui.sidebar.layerRemoved( reference.datum() );

            Hoot.layers.removeLoadedLayer( secondary.attr( 'data-id') );
            Hoot.ui.sidebar.layerRemoved( secondary.datum() );

            await Promise.all(layerParams.map(lyr => Hoot.api.deleteLayer(lyr.INPUT_NAME)));
        } );

        it( 'has all conflation types toggled initially', (done) => {
            let advOptsToggle = d3.select( '#advanced-opts-toggle' );
            expect( advOptsToggle.size(), 'there is an adv opts toggle' ).to.be.equal(1);
            advOptsToggle.dispatch( 'click' );

            setTimeout(() => {
                let adv_panel =  d3.selectAll( '#advanced-opts-panel' );
                expect( adv_panel.size(), 'there is an adv opts panel' ).to.be.equal(1);

                let adv_opts_groups = d3.selectAll( '#advanced-opts-panel .advanced-opts-content .form-group');
                expect( adv_opts_groups.size(), 'adv opt groups' ).to.be.equal(17);

                adv_opts_groups.selectAll( 'input[type=checkbox].conflate-type-toggle' ).each(function() {
                    expect( d3.select(this).property( 'checked' ), 'all conflate types to be enabled' ).to.be.true;
                });

                setTimeout(() => {
                    let { advanced, cleaning } = AdvancedOpts.getInstance().getOptions();
                    expect( Object.keys(advanced).length === 0, 'adv opts to be empty' ).to.be.true;
                    let disabled = AdvancedOpts.getInstance().getDisabledFeatures();
                    expect( disabled.length === 0, 'disabled features to be empty' ).to.be.true;
                    done();
                }, 500);
            }, 500);
        } );

        it ( 'disables features when relevant conflation types are unchecked', (done) => {
            d3.select( '#Roads-toggle' ).property( 'checked', false );

            let disabled = AdvancedOpts.getInstance().getDisabledFeatures();
            expect( disabled.includes( 'Roads', 'roads are disabled' ) ).to.be.true;
            done();
        } );

        function checkGroupState(group, disabled) {
            expect(
                d3.select('#' + group + '_group span')
                .attr('class').includes('disabled'),
                group + ' group span is ' + (disabled ? 'disabled' : 'enabled')
                ).to.equal(disabled);
            expect(
                d3.select('#' + group + '_group .adv-opt-toggle')
                .attr('class').includes('disabled'),
                group + ' group toggle is ' + (disabled ? 'disabled' : 'enabled')
            ).to.equal(disabled);
        }

        it ( 'makes Differential adv opts enabled for Differential', (done) => {
            d3.select( '#conflateType')
                .property( 'value', 'Differential')
                .dispatch( 'change' );

            setTimeout(() => {
                //assert Differential enabled
                checkGroupState('Differential', false);
                //assert Attribute disabled
                checkGroupState('Attribute', true);
                done();
            }, 500);
        } );

        it ( 'makes Differential adv opts enabled for Differential w/Tags', (done) => {
            d3.select( '#conflateType')
                .property( 'value', 'Differential w/Tags')
                .dispatch( 'change' );

            setTimeout(() => {
                //assert Differential enabled
                checkGroupState('Differential', false);
                //assert Attribute disabled
                checkGroupState('Attribute', true);
                done();
            }, 500);
        } );

        it ( 'makes Attribute adv opts enabled to Attribute', (done) => {
            d3.select( '#conflateType')
                .property( 'value', 'Attribute')
                .dispatch( 'change' );

            setTimeout(() => {
                //assert Differential disabled
                checkGroupState('Differential', true);
                //assert Attribute enabled
                checkGroupState('Attribute', false);
                //assert Building param defaults overridden
                expect(
                    d3.select('#BuildingMergeManyToManyMatches')
                    .select('input[type=checkbox]').property('checked')
                ).to.be.true;
                expect(
                    d3.select('#BuildingForceContainedMatch')
                    .select('input[type=checkbox]').property('checked')
                ).to.be.true;
                expect(
                    d3.select('#BuildingKeepMoreComplexGeometryWhenAutoMerging')
                    .select('input[type=checkbox]').property('checked')
                ).to.be.false;
                done();
            }, 500);
        } );

        it ( 'makes Attribute/Differential adv opts disabled for Reference', (done) => {
            d3.select( '#conflateType')
                .property( 'value', 'Reference')
                .dispatch( 'change' );

            setTimeout(() => {
                //assert Differential disabled
                checkGroupState('Differential', true);
                //assert Attribute disabled
                checkGroupState('Attribute', true);
                //assert Building param defaults are set
                expect(
                    d3.select('#BuildingMergeManyToManyMatches')
                    .select('input[type=checkbox]').property('checked')
                ).to.be.false;
                expect(
                    d3.select('#BuildingForceContainedMatch')
                    .select('input[type=checkbox]').property('checked')
                ).to.be.false;
                expect(
                    d3.select('#BuildingKeepMoreComplexGeometryWhenAutoMerging')
                    .select('input[type=checkbox]').property('checked')
                ).to.be.true;
                done();
            }, 500);
        } );

        it ( 'makes Attribute/Differential adv opts disabled for Horizontal', (done) => {
            d3.select( '#conflateType')
                .property( 'value', 'Horizontal')
                .dispatch( 'change' );

            setTimeout(() => {
                //assert Differential disabled
                checkGroupState('Differential', true);
                //assert Attribute disabled
                checkGroupState('Attribute', true);
                done();
            }, 500);
        } );

        it ( 'makes Attribute/Differential adv opts disabled for Network', (done) => {
            d3.select( '#conflateType')
                .property( 'value', 'Network')
                .dispatch( 'change' );

            setTimeout(() => {
                //assert Differential disabled
                checkGroupState('Differential', true);
                //assert Attribute disabled
                checkGroupState('Attribute', true);
                done();
            }, 500);
        } );

} );