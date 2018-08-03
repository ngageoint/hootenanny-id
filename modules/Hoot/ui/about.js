/*******************************************************************************************************
 * File: about.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 7/11/18
 *******************************************************************************************************/

import API           from '../managers/api';
import HootOSM       from '../managers/hootOsm';
import { aboutForm } from '../config/formMetadata';
import FormFactory   from '../tools/formFactory';

export default class About {
    constructor() {
        this.form = aboutForm.call( this );

        this.appInfo = HootOSM.appInfo;
    }

    render() {
        this.formData = aboutForm.call( this );

        let metadata = {
            title: 'About Hootenanny',
            form: this.formData,
            button: {
                text: 'Download User Guide',
                id: 'downloadUserGuideBtn',
                onClick: () => this.handleSubmit()
            }
        };

        this.container = new FormFactory().generateForm( 'body', 'about-hootenanny', metadata );

        d3.select( '#downloadUserGuideBtn' ).property( 'disabled', false );
    }

    createTableFieldset( field ) {
        let table = field
            .selectAll( '.about-item' )
            .append( 'div' )
            .data( this.appInfo );

        let rows = table
            .enter()
            .append( 'div' )
            .classed( 'about-item fill-white keyline-bottom', true );

        rows
            .append( 'span' )
            .text( d => {
                let builtBy = d.builtBy || d.user;

                return `${ d.name } - Version: ${ d.version } - Built By: ${ builtBy }`;
            } );
    }

    handleSubmit() {
        let sUrl = `${ API.baseUrl }/info/document/export`,
            link = document.createElement( 'a' );

        link.href = sUrl;

        if ( link.download !== undefined ) {
            //Set HTML5 download attribute. This will prevent file from opening if supported.
            link.download = sUrl.substring( sUrl.lastIndexOf( '/' ) + 1, sUrl.length );
        }

        // dispatch click event
        if ( document.createEvent ) {
            let e = document.createEvent( 'MouseEvents' );
            e.initEvent( 'click', true, true );
            link.dispatchEvent( e );
            this.container.remove();
            return true;
        }
    }
}