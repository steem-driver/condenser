const webpack = require('webpack');
const baseConfig = require('./base.config');

module.exports = {
    ...baseConfig,
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                BROWSER: JSON.stringify(true),
                NODE_ENV: JSON.stringify('production'),
            }
        }),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
                screw_ie8: true,
                sequences: true,
                dead_code: true,
                drop_debugger: true,
                drop_console: true,
                comparisons: true,
                conditionals: true,
                evaluate: true,
                booleans: true,
                loops: true,
                unused: true,
                hoist_funs: true,
                if_return: true,
                join_vars: true,
                cascade: true,
                pure_getters: true,
                unsafe: true,
                unsafe_comps: true,
                passes: 2
            },
            output: {
                comments: false
            },
            parallel: true,
            cache: true
        }),
        new webpack.optimize.AggressiveMergingPlugin(),
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false
        }),
        ...baseConfig.plugins,
        // Fix window.onerror
        // See https://github.com/webpack/webpack/issues/5681#issuecomment-345861733
        new webpack.SourceMapDevToolPlugin({
            module: true,
            columns: false,
            moduleFilenameTemplate: info => { return `${info.resourcePath}?${info.loaders}` }
        })
    ]
};
