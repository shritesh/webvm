const { CheckerPlugin } = require('awesome-typescript-loader')

module.exports = {
    // Source maps support ('inline-source-map' also works)
    devtool: "inline-source-map",

    mode: "development",
    entry: "./lib/app.ts",
    output: {
        dir: "dist",
        filename: "app.js"
    },
    // Currently we need to add '.ts' to the resolve.extensions array.
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    module: {
        rules: [{
                test: /\.js$/,
                use: ["source-map-loader"],
                enforce: "pre"
            },
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader'
            },
        ]
    },
    plugins: [
        new CheckerPlugin()
    ],
};