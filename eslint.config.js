const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*']),
  expoConfig,
  {
    rules: {
      // eslint-import-resolver-node di eslint-config-expo tidak mendukung field
      // exports bersarang (expo-location) dan main .ts (react-native-maps);
      // resolusi modul tetap diverifikasi oleh `tsc --noEmit`.
      'import/no-unresolved': [
        'error',
        {
          ignore: [
            '^expo-location$',
            '^expo-notifications$',
            '^react-native-maps$',
          ],
        },
      ],
    },
  },
]);
