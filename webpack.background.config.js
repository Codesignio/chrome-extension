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
        loader: 'babel',
        query: {
          presets: ['es2015','react']
        }
      }
    ]
  }
};