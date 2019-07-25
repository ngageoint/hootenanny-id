/*******************************************************************************************************
 * File: tools.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 7/19/18
 *******************************************************************************************************/

import {
    modeAddMeasureArea,
    modeAddMeasureLine
} from '../modes';

import { svgIcon } from '../svg';

import selectBbox       from '../Hoot/tools/selectBbox';
import { tooltip }      from '../util/tooltip';

export function uiTools( context ) {
    let isAdvancedUser = false;
    if ( localStorage ) {
        const user = JSON.parse( localStorage.getItem( 'user' ) );

        if (user && user.privileges) {
            isAdvancedUser = user.privileges.advanced === 'true';
        }
    }

    let menuItemMeta = [
        {
            title: 'Measurement Tools',
            icon: 'line',
            group: 'measure',
            items: [
                {
                    title: 'Measure Length',
                    tooltip: 'Shortcut: 6',
                    group: 'measure',
                    type: 'line',
                    icon: 'iD-icon-line',
                    mode: modeAddMeasureLine( context )
                },
                {
                    title: 'Measure Area',
                    tooltip: 'Shortcut: 7',
                    group: 'measure',
                    type: 'area',
                    icon: 'iD-icon-area',
                    mode: modeAddMeasureArea( context )
                }
            ]
        },
        {
            title: 'Clip Tools',
            icon: 'clip',
            group: 'clip',
            items: [
                {
                    title: 'Clip Dataset',
                    tooltip: 'Shortcut: 8',
                    group: 'clip',
                    type: 'area',
                    icon: 'iD-operation-split',
                    action: 'clipData'
                }
            ]
        }
    ];

    if (isAdvancedUser) {
        const grailMenuItem = {
            title: 'Grail Tools',
            icon: 'line',
            group: 'grail',
            items: [
                {
                    title: 'Pull Remote Data',
                    tooltip: 'Pull data for a bounding box from public Overpass and a private Rails Port into Hootenanny datasets',
                    placement: 'right',
                    group: 'grail',
                    type: 'area',
                    icon: 'iD-icon-load',
                    action: 'grailPull'
                },
                {
                    title: 'Derive Differential Changeset',
                    tooltip: 'Derives a differential conflation changeset for a bounding box between public Overpass and a private Rails Port',
                    placement: 'right',
                    group: 'grail',
                    type: 'area',
                    icon: 'iD-icon-layers',
                    action: 'createDifferential'
                }
            ]
        };

        menuItemMeta.push(grailMenuItem);
    }

    let toolsToggle,
        toolsMenu,
        menuItems,
        subMenu,
        subItems;

    function renderMenu( selection ) {
        toolsToggle = selection
            .append( 'button' )
            .classed( 'tools-toggle', true )
            .call( svgIcon( '#iD-icon-tools', 'pre-text' ) );

        toolsToggle
            .append( 'span' )
            .classed( 'label', true )
            .text( 'Tools' );

        toolsMenu = d3.select( '.hoot-tools' )
            .append( 'ul' )
            .classed( 'tools-menu dropdown-content round', true );

        menuItems = toolsMenu
            .selectAll( 'li' )
            .data( menuItemMeta )
            .enter();

        let item = menuItems
            .append( 'li' )
            .attr( 'class', d => `menu-item tools-${ d.group }` )
            .on( 'click', () => d3.event.stopPropagation() )
            .on( 'mouseenter', function( d ) {
                renderSubMenu( this, d.items );
            } );

        item.append( 'span' )
            .text( d => d.title );

        item.append( 'i' )
            .classed( 'material-icons', true )
            .text( 'arrow_right' );

        initDropdown();
    }

    function renderSubMenu( node, items ) {
        let selected = d3.select( node );

        if ( !selected.select( '.sub-menu' ).empty() ) return;

        destroySubMenu();

        selected.classed( 'highlight', true );

        subMenu = d3.select( node.parentNode )
            .append( 'ul' )
            .classed( 'sub-menu round', true )
            .style( 'left', () => {
                let menuWidth  = Math.ceil( toolsMenu.node().getBoundingClientRect().width ),
                    marginLeft = 5;

                return menuWidth + marginLeft + 'px';
            } )
            .style( 'top', selected.node().offsetTop + 'px' );

        subItems = subMenu
            .selectAll( '.sub-items' )
            .data( items )
            .enter();

        let item = subItems
            .append( 'li' )
            .attr( 'class', d => `${ d.icon } tools-${ d.group }` )
            .style( 'height', selected.node().getBoundingClientRect().height + 'px' )
            .on( 'click', d => {
                if ( d.mode ) {
                    context.enter( d.mode );
                } else if ( d.action === 'clipData' ) {
                    if ( Object.keys( Hoot.layers.loadedLayers ).length ) {
                        let clipSelectBbox = new selectBbox( context );

                        clipSelectBbox.render( 'clipData' );
                    } else {
                        let message = 'Add a layer before clipping',
                            type    = 'warn';

                        Hoot.message.alert( { message, type } );
                    }
                } else if ( d.action === 'grailPull' || d.action === 'createDifferential' ) {
                    let grailSelectBbox = new selectBbox( context );

                    grailSelectBbox.render( d.action );
                }
            } );

        item.each( function( d ) {
            d3.select( this )
                .call( svgIcon( `#${ d.icon }`, 'pre-text' ) )
                .call( tooltip()
                    .title( d.tooltip )
                    .placement( d.placement || 'right' ) );
        } );

        item.append( 'span' )
            .text( d => d.title );
    }

    function destroySubMenu() {
        toolsMenu.selectAll( 'li' ).classed( 'highlight', false );
        toolsMenu.selectAll( '.sub-menu' ).remove();
    }

    function initDropdown() {
        let duration     = 50,
            toolsToggle = d3.select( '.tools-toggle' );

        toolsToggle.on( 'click', () => {
            if ( toolsToggle.text() === 'Clear' ) {
                d3.select( '.data-layer.measure' ).selectAll( 'g' ).remove();
                toolsToggle
                    .text( '' )
                    .call( svgIcon( '#iD-icon-tools', 'pre-text' ) )
                    .append( 'span' )
                    .classed( 'label', true )
                    .text( 'Tools' );

                initDropdown();
            } else {
                toggle();
            }
        } );

        function toggle( cb ) {
            d3.select('.hoot-tools').selectAll('.tools-menu')
                .style('display', function(d) {
                    if ( cb ) cb();
                    if ( d3.select(this).style( 'display' ) === 'none' ) {
                        setTimeout(bindSingleBodyClick, 100);
                        return 'block';
                    } else {
                        setTimeout(destroySubMenu, 100);
                        return 'none';
                    }
                });
        }

        function bindSingleBodyClick() {
            d3.select( 'body' ).on( 'click', () => {
                toggle( () => initDropdown() );
                d3.select( 'body' ).on('click', null);
            });
        }
    }

    return renderMenu;
}
