var path = require("path");
var CleanWebpackPlugin = require('clean-webpack-plugin');
var webpack = require('webpack');

var config = {
  devtool: process.env.NODE_ENV == 'production' ? false : 'source-map',


  entry: {
    app: './app/popup/popup.js',
    background: './app/background/background.js',
    snap: './app/page_script/snap.js',
    auth_hook: './app/page_script/auth_hook.js',
    scroll_page: './app/page_script/scroll_page.js',
    comment: './app/page_script/comment.js'
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].js'
  },
  
  
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: "babel",
        query: {
          presets: ["es2015", "stage-0", "react"]
        },
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new webpack.EnvironmentPlugin(
      Object.keys(process.env)
    ),
    new CleanWebpackPlugin(['build'], {
      root: __dirname,
      verbose: true,
      dry: false
    }),
  ]
};

if(process.env.NODE_ENV == 'production'){
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false,
      drop_console: false,
    },
    mangle: true,
    comments: /__drop__/
    // stats: false
  }))
}

module.exports = config