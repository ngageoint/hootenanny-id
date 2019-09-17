/** ****************************************************************************************************
 * File: folderTree.js
 * Project: hootenanny-ui
 * @author Matt Putipong on 3/5/18
 *******************************************************************************************************/

import _cloneDeep  from 'lodash-es/cloneDeep';
import _concat     from 'lodash-es/concat';
import _difference from 'lodash-es/difference';
import _drop       from 'lodash-es/drop';
import _filter     from 'lodash-es/filter';
import _find       from 'lodash-es/find';
import _findIndex  from 'lodash-es/findIndex';
import _forEach    from 'lodash-es/forEach';
import _remove     from 'lodash-es/remove';
import _slice      from 'lodash-es/slice';
import _uniq       from 'lodash-es/uniq';
import _without from 'lodash-es/without';

import { duration, formatSize } from './utilities';

import EventEmitter from 'events';

/**
 * Class for creating, displaying and maintaining a folder tree hierarchy
 *
 * @param container - Container used to render the tree into
 * @constructor
 */
export default class FolderTree extends EventEmitter {
    constructor( container ) {
        super();

        this.container              = container;
        this.isDatasetTable         = this.container.attr( 'id' ) === 'dataset-table';
        this.selectedNodes          = [];
        this.lastSelectedNode       = null;
        this.lastSelectedRangeNodes = null;

        this.datasetContextMenu = {
            multiDatasetOpts: {
                title: 'Export Selected Datasets',
                icon: 'export',
                click: 'exportMultiDataset'
            },
            singleDatasetOpts: {
                title: 'Export',
                icon: 'export',
                click: 'exportDataset'
            },
            addDatasetOpts: [
                {
                    title: 'Add as Reference Dataset',
                    formId: 'reference',
                    refType: 'primary',
                    icon: 'plus',
                    click: 'addDataset'
                },
                {
                    title: 'Add as Secondary Dataset',
                    formId: 'secondary',
                    refType: 'secondary',
                    icon: 'plus',
                    click: 'addDataset'
                }
            ]
        };

        this.folderContextMenu = [
            {
                title: 'Delete',
                icon: 'trash',
                click: 'delete'
            },
            {
                title: 'Add Datasets',
                icon: 'data',
                click: 'importDatasets'
            },
            {
                title: 'Add Folder',
                icon: 'folder',
                click: 'addFolder'
            },
            {
                title: 'Export Data in Folder',
                icon: 'export',
                click: 'exportFolder'
            }
        ];

        this.margin    = { top: 10, right: 20, bottom: 30, left: 0 };
        this.width     = '100%';
        this.height    = '100%';
        this.barHeight = 20;
        this.duration  = 0;

        this.x = d3.scaleLinear()
            .domain( [ 0, 0 ] )
            .range( [ 0, 0 ] );

        this.y = d3.scaleLinear()
            .domain( [ 0, 0 ] )
            .range( [ 20, 0 ] );

        this.tree = d3.tree()
            .nodeSize( [ 0, 20 ] );

        this.svg = this.container.append( 'svg' )
            .attr( 'width', this.width )
            .attr( 'height', this.height )
            .append( 'g' )
            .attr( 'transform', `translate( ${this.margin.left}, ${this.margin.top} )` );

        if ( this.isDatasetTable ) {
            this.expiringTooltip = d3.select( '#manage-datasets' )
                .selectAll( '.tooltip-old-dataset' )
                .data( [ 0 ]  )
                .enter()
                .append( 'div' )
                .classed( 'tooltip-old-dataset', true )
                .text( 'This dataset has not been used in a while.' );
        }
    }

    /**
     * Initialize the folder tree
     */
    async render() {
        let folders = _cloneDeep( await Hoot.folders.getAvailFolderData() );

        if ( this.isDatasetTable ) {
            folders = _without( folders, _find( folders, { id: -1 } ) );
        }

        folders = {
            name: 'Datasets',
            id: 'Datasets',
            children: folders // prevent collision of data
        };

        this.root    = d3.hierarchy( folders );
        this.root.x0 = 0;
        this.root.y0 = 0;

        this.update( this.root );
    }

    /**
     * Update the tree by adding/deleting nodes
     *
     * @param source - source node used to update tree
     */
    update( source ) {
        let nodeTree = this.tree( this.root ),
            height;

        this.nodes = this.sortNodes( nodeTree );

        let nodes       = this.svg.selectAll( 'g.node' ).data( this.nodes, d => d ),
            nodeElement = this.createNodeElement( nodes, source );

        height = Math.max( 150, this.nodes.length * this.barHeight );

        this.container.select( 'svg' ).transition()
            .duration( 0 )
            .style( 'height', `${ height }px` );

        // Render text values and lines for nodes
        this.renderText( nodeElement.filter( d => d.data.type === 'dataset' ) );
        this.renderLines( nodeElement.filter( d => d.depth > 1 ) );

        this.root.each( d => {
            d.x0 = d.x;
            d.y0 = d.y;
        } );
    }

    /**
     * Update nodes to all have a consistent data structure and
     * sort them so that they render in the correct order
     *
     * @param nodes - tree nodes
     * @returns {Array} - sorted nodes
     */
    sortNodes( nodes ) {
        let nodesSort   = [],
            parentDepth = 0,
            i           = 0; // manual iteration because eachBefore doesn't provide a key

        nodes.eachBefore( n => {
            // set vertical and horizontal position of node
            n.x = (i - 1) * this.barHeight;
            n.y = n.depth * 20;

            // update leaf nodes (nodes with no children) to have similar structure to regular nodes
            if ( n.depth && n.depth > 0 ) {
                parentDepth = n.depth;
            } else {
                n.depth = parentDepth + 1;
            }

            //this causes a circular reference
            if ( !n.data ) {
                n.data = n;
            }

            nodesSort.push( n );
            i++;
        } );

        return nodesSort;
    }

    /**
     * Create base DOM element for node. Set it's position, icon, and name
     *
     * @param nodes - node data
     * @param source - source node used to update tree
     * @returns {d3} - node DOM element
     */
    createNodeElement( nodes, source ) {
        const self = this;
        let user = JSON.parse( localStorage.getItem( 'user' ) );

        let nodeElement = nodes.enter().append( 'g' )
            .attr( 'data-name', d => d.data.name )
            .attr( 'data-id', d => d.data.id )
            .attr( 'data-type', d => d.data.type )
            .attr( 'transform', `translate( 0, ${ source.x0 } )` )
            .classed( 'node', true )
            .style( 'opacity', 0 )
            .on( 'click', function( d ) {
                // use self as context but still pass in the clicked element
                self.click.call( self, this, d );
            } )
            .on( 'mousedown', () => {
                d3.event.preventDefault();
            } )
            .on( 'contextmenu', d => {
                d3.event.preventDefault();

                if ( this.isDatasetTable ) {
                    this.bindContextMenu( d );
                }
            } );

        // Render node rect
        nodeElement.append( 'rect' )
            .attr( 'y', -this.barHeight / 2 )
            .attr( 'height', this.barHeight )
            .attr( 'width', '100%' )
            .attr( 'class', d => this.rectClass( d ) )
            .style( 'fill', d => this.fillColor( d ) );

        // Render node icon
        nodeElement.append( 'g' )
            .append( 'svg:foreignObject' )
            .attr( 'width', 20 )
            .attr( 'height', 20 )
            .attr( 'transform', d => {
                let dd = d.depth - 1,
                    dy = 5.5 + (11 * dd);

                return `translate( ${ dy }, -11 )`;
            } )
            .html( d => {
                let { data } = d;

                if ( data.type === 'folder' ) {
                    if ( data.state === 'open' ) {
                        return '<i class="_icon open-folder"></i>';
                    } else {
                        return '<i class="_icon folder"></i>';
                    }
                } else if ( data.type === 'dataset' ) {
                    return '<i class="_icon data"></i>';
                }
            } );

        // Render node name
        nodeElement
            .append( 'text' )
            .style( 'fill', this.fontColor )
            .classed( 'dnameTxt', true )
            .attr( 'dy', 3.5 )
            .attr( 'dx', d => {
                let dd = d.depth - 1;
                return 25.5 + (11 * dd);
            } )
            .append( 'tspan' ).text( d => d.data.name );

        // Render node owner
        if ( this.isDatasetTable ) {
            nodeElement
                .append( 'text' )
                .style( 'fill', this.fontColor )
                .classed( 'dnameTxt', true )
                .attr( 'dy', 3.5 )
                .attr( 'dx', '30%' )
                .attr( 'text-anchor', 'start' )
                .append( 'tspan' ).text( d => {

                    return Hoot.users.getNameForId( d.data.userId );
                } );
        }

        // Transition nodes to their new position
        nodeElement.transition()
            .duration( this.duration )
            .attr( 'transform', d => `translate( 0, ${ d.x } )` )
            .style( 'opacity', 1 );

        // remove old elements
        nodes.exit().remove();

        return nodeElement;
    }

    /**
     * Render lines that connect nodes together
     *
     * @param nodes - tree nodes
     */
    renderLines( nodes ) {
        nodes.append( 'line' )
            .attr( 'x1', d => 2.5 + (11 * (d.depth - 1)) )
            .attr( 'x2', d => 9.5 + (11 * (d.depth - 1)) )
            .attr( 'y1', 0 )
            .attr( 'y2', 0 )
            .style( 'stroke', '#444444' );

        nodes.append( 'line' )
            .attr( 'x1', d => 2.5 + (11 * (d.depth - 1)) )
            .attr( 'x2', d => 2.5 + (11 * (d.depth - 1)) )
            .attr( 'y1', -20 )
            .attr( 'y2', 0 )
            .style( 'stroke', '#444444' );
    }

    /**
     * Render text values for each node
     *
     * @param nodes - tree nodes
     */
    renderText( nodes ) {
        let that = this;

        nodes.append( 'text' )
            .classed( 'dsizeTxt', true )
            .style( 'fill', this.fontColor )
            .attr( 'dy', 3.5 )
            .attr( 'dx', '98%' )
            .attr( 'text-anchor', 'end' )
            .text( d => {
                return formatSize( d.data.size );
            } );

        if ( this.isDatasetTable ) {
            nodes.append( 'text' )
                .style( 'fill', this.fontColor )
                .attr( 'dy', 3.5 )
                .attr( 'dx', '85%' )
                .attr( 'text-anchor', 'end' )
                .text( d => d.data.date );

            nodes.append( 'text' )
                .style( 'fill', this.fontColor )
                .attr( 'dy', 3.5 )
                .attr( 'dx', '65%' )
                .attr( 'text-anchor', 'end' )
                .text( function( d ) {
                    let lastAccessed = new Date(d.data.lastAccessed),
                        now = Date.now();

                    if ( now - lastAccessed > 5184000000 ) { //60 days
                        that.updateLastAccessed( this );
                    }

                    return duration(lastAccessed, now, true);
                } );
        }
    }

    // wrapText( d, elem ) {
    //     let parent = elem.node().parentNode.parentNode;
    //
    //     //elem.text( d.data.name );
    //     d3.select( parent ).append( 'title' ).text( d.data.name );
    // }

    updateLastAccessed( node ) {
        let row = d3.select( node.parentNode );

        row
            .classed( 'expiring', true )
            .on( 'mousemove', () => {
                this.expiringTooltip
                    .style( 'left', Math.max( 0, d3.event.pageX - 200 ) + 'px' )
                    .style( 'top', ( d3.event.pageY - 50 ) + 'px' )
                    .style( 'opacity', '0.9' );
            } )
            .on( 'mouseout', () => {
                this.expiringTooltip.style( 'opacity', 0 );
            } )
            .append( 'g' )
            .append( 'svg' )
            .attr( 'y', '-9px' )
            .attr( 'x', '56%' )
            .append( 'image' )
            .attr( 'href', './img/timer.png' )
            .style( 'width', '18px' )
            .style( 'height', '18px' );
    }

    /**
     * Fill a rect element based on it's node type
     *
     * @param d - tree node
     * @returns {string} - Hex color code
     */
    fillColor( d ) {
        let { data } = d;

        if ( data.type === 'folder' ) {
            return (data.public) ? '#7092ff' : '#efefef';
        }
        else if ( data.type === 'dataset' ) {
            if ( data.selected ) {
                return '#ffff99';
            }
            return (data.public) ? '#7092ff' : '#efefef';
        }
        else {
            return '#ffffff';
        }
    }

    /**
     * Fill a text element based on it's node type
     *
     * @param d - tree node
     * @returns {string} - hex color code
     */
    fontColor( d ) {
        let { data } = d;

        if ( data.selected ) return '#7092ff';

        if ( data.type === 'folder' ) {
            return (data.public) ? '#ffffff' : '#7092ff';
        }
        else if ( data.type === 'dataset' ) {
            return (data.public) ? '#ffffff' : '#7092ff';
        }
        else {
            return '#ffffff';
        }
    }

    /**
     * Assign a CSS class to a rect element based
     * on it's type and the current state that it's in
     *
     * @param d - tree node
     * @returns {string} - CSS class
     */
    rectClass( d ) {
        let { data } = d;

        // // set selected layers
        // if ( data.type === 'dataset' && this.containerId === 'datasets-table' ) {
        //     if ( data.selected ) {
        //         if ( this.selectedLayerIDs.indexOf( data.layerId ) === -1 ) {
        //             this.selectedLayerIDs.push( data.layerId );
        //         }
        //     } else {
        //         let idx = this.selectedLayerIDs.indexOf( data.layerId );
        //         if ( idx > -1 ) {
        //             this.selectedLayerIDs.splice( idx, 1 );
        //         }
        //     }
        // }

        return data.selected
            ? 'sel'
            : data._children
                ? 'more'
                : 'flat';
    }

    /**
     * Logic for right-click and ctrl+click
     *
     * @param d - tree node
     */
    bindContextMenu( d ) {
        let { data } = d,
            selected = d.data.selected || false;

        if ( d3.event.ctrlKey && d3.event.which === 1 ) {
            data.selected = !data.selected ? !data.selected : data.selected;
            this.selectedNodes.push( data );
        } else if ( d.data.type === 'dataset' ) {
            if ( !selected ) {
                let selectedNodes = _filter( this.root.descendants(), node => node.data.selected );

                // Un-select all other nodes
                _forEach( selectedNodes, node => {
                    node.data.selected = false;
                } );

                data.selected         = true;
                this.selectedNodes    = [ data ];
                this.lastSelectedNode = data.id;
            }
        }

        if ( this.contextMenu ) {
            this.contextMenu.remove();
        }

        this.openContextMenu( d );

        this.update( d );
    }

    /**
     * Render the context menu for a dataset or folder
     *
     * @param d - tree node
     */
    openContextMenu( d ) {
        let { data } = d,
            opts;

        if ( data.type === 'dataset' ) {
            const selectedCount = this.selectedNodes.length;

            opts = [
                {
                    title: `Delete (${ selectedCount })`,
                    icon: 'trash',
                    click: 'delete'
                }
            ];

            if ( selectedCount > 1 && selectedCount <= 10 ) {
                // add options for multiple selected datasets
                opts.push( this.datasetContextMenu.multiDatasetOpts );

                opts.splice( 1, 0, {
                    title: `Move (${ selectedCount })`,
                    icon: 'info',
                    click: 'modifyDataset'
                } );
            } else {
                // add options for single selected dataset
                _forEach( this.datasetContextMenu.addDatasetOpts, o => {

                    let formMeta = Hoot.ui.sidebar.forms[ o.formId ];

                    if ( formMeta ) {
                         let form = formMeta.form;
                         if ( form && !form.attr( 'data-id' ) ) {
                            opts.push( o );
                        }
                     }
                } );

                opts.splice( 4, 0, {
                    title: `Move/Rename ${ data.name }`,
                    icon: 'info',
                    click: 'modifyDataset'
                } );

                opts = _concat( opts, this.datasetContextMenu.singleDatasetOpts );
            }
        } else if ( data.type === 'folder' ) {
            opts = [ ...this.folderContextMenu.slice() ]; // make copy of array to not overwrite default vals
            opts.splice( 1, 0, {
                title: `Modify Folder ${ data.name }`,
                icon: 'info',
                click: 'modifyFolder'
            } );
        }

        let body = d3.select( 'body' )
            .on( 'click', () => d3.select( '.context-menu' ).style( 'display', 'none' ) );

        this.contextMenu = body
            .append( 'div' )
            .classed( 'context-menu', true )
            .style( 'display', 'none' );

        this.contextMenu
            .html( '' )
            .append( 'ul' )
            .selectAll( 'li' )
            .data( opts )
            .enter()
            .append( 'li' )
            .attr( 'class', item => `_icon ${ item.icon }` )
            .text( item => item.title )
            .on( 'click', item => Hoot.events.emit( 'context-menu', this, d, item ) );

        this.contextMenu
            .style( 'left', `${ d3.event.pageX - 2 }px` )
            .style( 'top', `${ d3.event.pageY - 2 }px` )
            .style( 'display', 'block' );
    }

    /**
     * Select, expand, or collapse an item in the table.
     *
     * @param elem - clicked DOM element
     * @param d - tree node
     */
    click( elem, d ) {
        let { data } = d,
            selected = data.selected || false,
            isOpen   = data.state === 'open';

        if ( data.type === 'dataset' ) {
            if ( d3.event.metaKey && this.isDatasetTable ) {
                data.selected = !data.selected;
                this.selectedNodes.push( data );
                this.lastSelectedNode = data.selected ? data.id : null;
            }
            else if ( d3.event.shiftKey && this.lastSelectedNode && this.isDatasetTable ) {
                let nodes        = _drop( this.nodes, 1 ),
                    basePosition = _findIndex( nodes, node => node.data.type === 'dataset' && node.data.id === this.lastSelectedNode ),
                    position     = _findIndex( nodes, node => node.data.type === 'dataset' && node.data.id === data.id ),
                    selectBegin  = Math.min( basePosition, position ),
                    selectEnd    = Math.max( basePosition, position ) + 1,

                    rangeNodes   = _slice( nodes, selectBegin, selectEnd );

                if ( basePosition !== this.lastBasePosition ) {
                    // user ctrl+clicked on a new location
                    this.lastSelectedRangeNodes = [];
                }
                else {
                    // unselect nodes from previous range that don't match the new range
                    let oldNodes = _difference( this.lastSelectedRangeNodes, rangeNodes );

                    _forEach( oldNodes, node => {
                        node.data.selected = false;
                        _remove( this.selectedNodes, layer => layer.id === node.data.id );
                    } );
                }

                // select nodes starting from base position to current position
                _forEach( rangeNodes, node => {
                    node.data.selected = true;
                    this.selectedNodes.push( node.data );
                    this.lastSelectedRangeNodes.push( node );
                } );

                this.selectedNodes    = _uniq( this.selectedNodes );
                this.lastBasePosition = basePosition;
            }
            else {
                // get all currently selected nodes
                let selectedNodes = _filter( this.root.descendants(), d => d.data.selected );

                // un-select all other nodes
                _forEach( selectedNodes, node => {
                    node.data.selected = false;
                } );

                // if multiple are already selected, keep the target node selected
                if ( selectedNodes.length > 1 && selected ) {
                    data.selected = true;
                } else {
                    data.selected = !selected;
                }

                this.selectedNodes    = [ data ];
                this.lastSelectedNode = data.selected ? data.id : null;
            }
        } else { // folder
            if ( isOpen ) {
                // close folder
                data.state = 'closed';

                d3.select( elem.parentNode )
                    .select( 'i' )
                    .classed( 'folder', true )
                    .classed( 'open-folder', false );

                if ( d.children ) {
                    data._children = d.children;
                    d.children     = null;
                    data.selected  = false;
                }
            } else {
                // open folder
                data.state = 'open';

                d3.select( elem.parentNode )
                    .select( 'i' )
                    .classed( 'folder', false )
                    .classed( 'open-folder', true );

                d.children     = data._children || null;
                data._children = null;
            }

            if ( this.isDatasetTable ) {
                Hoot.folders.setOpenFolders( data.id, !isOpen );
            }
        }

        this.update( d );
    }
}
