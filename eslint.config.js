// https://docs.expo.dev/guides/using-eslint/
const {defineConfig} = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/',
      'build/',
      'node_modules/',
      '**/*.min.js',
      '**/*.min.css',
      '.expo/',
      '.expo-shared/',
      'ios/Pods/',
      '.DS_Store',
      'Thumbs.db',
      'ehthumbs.db',
      'Desktop.ini',
      '.vscode/',
      '.idea/',
      '**/*.log',
      'logs/',
      '**/*.map',
      '.metro-health-check*',
      'coverage/',
      '.yarn/',
      'jest.config.js',
      'jest.setup.js',
      'package-lock.json',
    ],
    plugins: {
      'react-native': require('eslint-plugin-react-native'),
    },
    settings: {
      'import/resolver': {
        'babel-module': {
          root: ['./'],
          alias: {
            '@': './',
            '@src': './src',
            '@hooks': './hooks',
            '@constants': './constants',
          },
        },
      },
    },
    rules: {
      'jsx-quotes': 'off', // Disable since Prettier handles quote consistency
      'react-native/no-inline-styles': 'warn', // Keep as warning, not error
      'react-hooks/exhaustive-deps': 'off', // Allow flexible dependency management
    },
  },
  {
    files: ['*.ts', '*.tsx'],
    rules: {
      '@typescript-eslint/no-shadow': ['error'],
      'no-shadow': 'off',
      'no-undef': 'off',
    },
  },
]);
