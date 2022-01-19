/** ****************************************************************************************************
 * File: webpack.base.config.js
 * Project: hootenanny-ui
 * @author Matt Putipong on 10/24/18
 *******************************************************************************************************/

const { resolve }          = require( 'path' );
const webpack              = require( 'webpack' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const CopyWebpackPlugin    = require( 'copy-webpack-plugin' );

const
    extractAssets = new CopyWebpackPlugin(
        {
            patterns: [{
                from: './img', // context: root
                to: './img' // context: dist
            }]
        }
    );

module.exports = {
    context: resolve( __dirname, '../' ),
    entry: {
        iD: './modules/id.js',
        login: './modules/Hoot/login.js'
    },
    output: {
        path: resolve( __dirname, '../dist/' ),
        filename: '[name].min.js',
        publicPath: './'
    },
    module: {
        rules: [
            {
                test: /\.(jpe?g|gif|png|svg|ttf|wav|mp3|eot|woff2|woff)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            outputPath: 'img/',
                            name: '[name].[ext]'
                        }
                    }
                ]
            },
            {
                test: /\.(scss|css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader'
                ]
            }
        ]
    },
    resolve: {
        alias: {
            './img': resolve( __dirname, '../img' ),
            'lib': resolve( __dirname, '../modules/lib' ),
            'data': resolve( __dirname, '../data' )
        },
        fallback: {
            dns: false,
            fs: false,
            net: false,
            tls: false,
            child_process: false
        }
    },
    plugins: [
        extractAssets,
        new MiniCssExtractPlugin( {
            filename: '[name].css'
        } ),
        new webpack.EnvironmentPlugin( [ 'NODE_ENV' ] )
    ],
};
