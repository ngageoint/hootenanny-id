/*******************************************************************************************************
 * File: paste_tags.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 8/13/18
 *******************************************************************************************************/

import _                                 from 'lodash-es';
import { d3keybinding as d3_keybinding } from '../lib/d3.keybinding';
import { t }                             from '../util/locale';
import { tooltip }                       from '../util/tooltip';
import { tooltipHtml }                   from '../Hoot/tools/utilities';
import { svgIcon }                       from '../svg';
import { modeSelect }                    from '../modes';
import { actionChangeTags }              from '../actions';
import { uiCmd }                         from './cmd';

export function uiPasteTags( context ) {
    let commands = [ {
        id: 'overwrite',
        icon: 'iD-icon-paste-tags-overwrite',
        cmd: uiCmd( '⌘⇧V' ),
        action: () => doPasteTags( true ),
        annotation: () => 'Overwrite Tags'
    }, {
        id: 'append',
        icon: 'iD-icon-paste-tags-append',
        cmd: uiCmd( '⌘⌥V' ),
        action: () => doPasteTags( false ),
        annotation: () => 'Append Tags'
    } ];

    function hasCopy() {
        return context.copyIDs().length || Object.keys( context.copyTags() ).length;
    }

    function omitTag( v, k ) {
        return (
            k.indexOf( 'hoot' ) === 0 ||
            k === 'error:circular' ||
            k === 'source:datetime' ||
            k === 'source:ingest:datetime' ||
            k === 'uuid'
        );
    }

    function doPasteTags( overwrite ) {
        d3.event.preventDefault();

        let copyTags    = context.copyTags(),
            oldIDs      = context.copyIDs(),
            oldGraph    = context.copyGraph(),
            selectedIDs = context.selectedIDs(),
            selectEntity,
            eid, i;

        if ( !copyTags && !oldIDs.length ) return;

        for ( eid in selectedIDs ) {
            selectEntity = oldGraph.entity( selectedIDs[ eid ] );

            if ( Object.keys( copyTags ).length > 0 ) { //use copied tags
                selectEntity = selectEntity.mergeTags( _.omit( copyTags, omitTag ), d3.event.shiftKey || overwrite );
            } else { //use copied features
                for ( i = 0; i < oldIDs.length; i++ ) {
                    let oldEntity = oldGraph.entity( oldIDs[ i ] );

                    selectEntity = selectEntity.mergeTags( _.omit( oldEntity.tags, omitTag ), d3.event.shiftKey || overwrite );
                }
            }

            context.perform( actionChangeTags( selectEntity.id, selectEntity.tags ),
                t( 'operations.change_tags.annotation' ) );
        }

        context.enter( modeSelect( context, selectedIDs ) );
    }

    return function( selection ) {
        let buttonTooltip = tooltip()
            .placement( 'bottom' )
            .html( true )
            .title( d => tooltipHtml( t( d.id + '.tooltip' ), d.cmd ) );

        let buttons = selection.selectAll( 'button' )
            .data( commands )
            .enter().append( 'button' )
            .attr( 'class', 'col6 disabled' )
            .on( 'click', function( d ) {
                return d.action();
            } )
            .call( buttonTooltip );

        buttons.each( function( d ) {
            d3.select( this ).call( svgIcon( `#${ d.icon }` ) );
        } );

        let keybinding = d3_keybinding( 'paste_tags' )
            .on( commands[ 0 ].cmd, function() {
                d3.event.preventDefault();
                commands[ 0 ].action();
            } )
            .on( commands[ 1 ].cmd, function() {
                d3.event.preventDefault();
                commands[ 1 ].action();
            } );

        d3.select( document )
            .call( keybinding );

        context
            .on( 'enter.paste_tags', update );

        function update( mode ) {
            //Disable paste tags if there are no features or tags copied
            //or if there is no feature(s) selected
            let disabled = !hasCopy() || !((mode.id === 'select') && mode.selectedIDs().length);

            buttons
                .property( 'disabled', disabled )
                .classed( 'disabled', disabled )
                .each( function() {
                    var selection = d3.select( this );
                    if ( selection.property( 'tooltipVisible' ) ) {
                        selection.call( tooltip.show );
                    }
                } );
        }
    };
}