const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'cheap-source-map',
  entry: {
    'content/calendar-integration': './src/content/calendar-integration.js',
    'background/service-worker': './src/background/service-worker.js',
    'options/options': './options/options.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/content/styles.css', to: 'content/styles.css' },
        { from: 'options/options.html', to: 'options/options.html' },
        { from: 'options/options.css', to: 'options/options.css' }
      ]
    })
  ]
};