const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './index.web.js',
  mode: 'development',
  devtool: 'source-map',
  resolve: {
    extensions: [
      '.web.js',
      '.js',
      '.web.ts',
      '.ts',
      '.web.tsx',
      '.tsx',
      '.json',
    ],
    mainFields: ['browser', 'main', 'module'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native/Libraries/Utilities/Dimensions': path.resolve(
        __dirname,
        'src/utils/dimensionsPolyfill.js',
      ),
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@screens': path.resolve(__dirname, 'src/screens'),
      '@navigation': path.resolve(__dirname, 'src/navigation'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
    fallback: {
      // React Navigation web fallbacks
      'react-native/Libraries/Components/View/ViewStylePropTypes': false,
      'react-native/Libraries/StyleSheet/StyleSheetTypes': false,
      'react-native/Libraries/Image/AssetRegistry': false,
      'react-native/Libraries/Image/AssetSourceResolver': false,
      'react-native/Libraries/Image/resolveAssetSource': false,
      'react-native/Libraries/Utilities/dismissKeyboard': false,
      'react-native/Libraries/Utilities/Platform': false,
      'react-native/Libraries/Utilities/HMRClient': false,
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['module:@react-native/babel-preset'],
            plugins: [
              [
                'module-resolver',
                {
                  root: ['./src'],
                  extensions: [
                    '.web.js',
                    '.ios.js',
                    '.android.js',
                    '.js',
                    '.ts',
                    '.tsx',
                    '.json',
                  ],
                  alias: {
                    '@': './src',
                    '@components': './src/components',
                    '@screens': './src/screens',
                    '@navigation': './src/navigation',
                    '@utils': './src/utils',
                    '@types': './src/types',
                  },
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: 'body',
      scriptLoading: 'defer',
      chunks: ['main'],
    }),
    new Dotenv({
      path: './.env.local',
      safe: false,
      systemvars: true,
    }),
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'public'),
      },
      {
        directory: path.join(__dirname, 'sample_data'),
        publicPath: '/sample_data',
      },
    ],
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true,
    proxy: [
      {
        context: ['/api/garage61'],
        target: 'https://garage61.net/api/v1',
        changeOrigin: true,
        pathRewrite: (pathStr, req) => {
          console.log(
            'Proxying:',
            pathStr,
            '->',
            pathStr.replace('/api/garage61', ''),
          );
          return pathStr.replace('/api/garage61', '');
        },
        logLevel: 'debug',
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'web-build'),
    filename: 'bundle.js',
    publicPath: '/',
  },
};
