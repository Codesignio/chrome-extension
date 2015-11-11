var path = require('path');
module.exports = {
  entry: './background.js',
  output: {
    path: __dirname,
    filename: 'background-compiled.js'
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
  }
};