const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    alias: {
      'react-native-vector-icons': '@react-native-vector-icons/vector-icons',
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
