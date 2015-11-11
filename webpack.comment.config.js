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
        loader: 'babel',
        query: {
          presets: ['es2015','react']
        }
      }
    ]
  }
};