var path = require('path');
module.exports = {
  entry: './page-script/app.js',
  output: {
    path: path.join(__dirname, 'page-script-compiled'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        test: path.join(__dirname, 'page-script'),
        loader: 'babel',
        query: {
          presets: ['es2015','react']
        }
      },
      { test: /\.css$/, loader: "raw-loader" },
    ]
  }
};