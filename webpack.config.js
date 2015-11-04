var path = require('path');
module.exports = {
  entry: './app/app.js',
  output: {
    path: path.join(__dirname, 'compiled'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: path.join(__dirname, 'app'),
        loader: 'babel',
        query: {
          presets: ['es2015','react']
        }
      }
    ]
  }
};