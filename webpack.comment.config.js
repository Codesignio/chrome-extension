var webpack = require("webpack");

var path = require('path');
module.exports = {
  entry: './page-script/comment.js',
  output: {
    path: path.join(__dirname, 'page-script-compiled'),
    filename: 'comment.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        query: {
          presets: ['es2015','react']
        }
      },
      { test: /\.css$/, loader: "raw-loader" },
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({minimize: true})
  ]
};