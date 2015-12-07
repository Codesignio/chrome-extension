var webpack = require("webpack");
var path = require('path');
module.exports = {
  entry: './app/login.js',
  output: {
    path: path.join(__dirname, 'login-compiled'),
    filename: 'bundle.js'
  },
  devtool: 'source-map',
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