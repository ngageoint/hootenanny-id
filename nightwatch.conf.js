/*******************************************************************************************************
 * File: nightwatch.conf.js
 * Project: hootenanny-ui
 * @author Matt Putipong - matt.putipong@radiantsolutions.com on 5/29/18
 *******************************************************************************************************/

require( 'babel-core/register' );

const seleniumDriver = require( 'selenium-server' );

module.exports = {
    src_folders: [
        './test/integration',
    ],
    output_folder: 'reports',
    //custom_commands_path: './test/integration/customCommands',
    page_objects_path: '',
    globals_path: '',
    selenium: {
        start_process: true,
        server_path: seleniumDriver.path,
        host: '127.0.0.1',
        port: 4444,
        cli_args: {
            'webdriver.chrome.driver': require('chromedriver').path
        }
    },
    test_settings: {
        default: {
            launch_url: 'http://d1x11dgx2ymfgq.cloudfront.net',
            desiredCapabilities: {
                browserName: 'chrome',
                acceptSslCerts: true,
                chromeOptions: {
                    args: [ 'headless', 'no-sandbox', 'disable-gpu' ]
                }
            },
        }
    },
    test_runner: {
        type: 'mocha',
        options: {},
        ui: 'bdd',
        reporter: 'list'
    }
};