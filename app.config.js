// app.config.js
/**
 * Konfigurasi dinamis Expo.
 *
 * `app.json` tidak dapat membaca environment variable, sedangkan Google Maps
 * API key harus berasal dari `.env` (jangan di-commit). File ini meneruskan
 * seluruh konfigurasi statis dari `app.json` lalu menambahkan plugin
 * `react-native-maps` hanya bila key tersedia, sehingga build tanpa key tetap
 * berjalan (peta Android kosong, fitur lain normal).
 *
 * Variabel yang dibaca: `GOOGLE_MAPS_API_KEY` (disarankan) atau
 * `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
 */
const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile,
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#C9492B',
        defaultChannel: 'default',
      },
    ],
    ...(googleMapsApiKey
      ? [
          [
            'react-native-maps',
            {
              androidGoogleMapsApiKey: googleMapsApiKey,
              iosGoogleMapsApiKey: googleMapsApiKey,
            },
          ],
        ]
      : []),
  ],
});
