import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostIp = () => {
  // Try extracting Metro packager IP if connected via Expo Go
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoGo?.developer?.inputs?.find(
        (i) => i.variable === 'EXPO_MANIFEST_SERVER_URL'
      )?.value;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (err) {
    console.warn('[Config] Error detecting host IP:', err);
  }

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return '10.0.2.2';
  }
  return 'localhost';
};

// Check if running inside Expo Go with an active Metro dev server
const hasDevServer = Boolean(
  Constants.expoConfig?.hostUri ||
  Constants.manifest2?.extra?.expoGo?.developer?.inputs?.find(
    (i) => i.variable === 'EXPO_MANIFEST_SERVER_URL'
  )?.value
);

// If running as standalone APK or no active local Metro server detected, use Cloud Gateway
const isRunningInExpoGoDev = __DEV__ && hasDevServer && Constants.appOwnership === 'expo';

export const API_HOST = getHostIp();

export const PROD_GATEWAY_URL = 'https://onemedical-v2-gateway.onrender.com';

export const API_BASE_URL = isRunningInExpoGoDev
  ? `http://${API_HOST}:5000/api/v1`
  : `${PROD_GATEWAY_URL}/api/v1`;

export const API_URL = API_BASE_URL;

export const SOCKET_URL = isRunningInExpoGoDev
  ? `http://${API_HOST}:5000`
  : PROD_GATEWAY_URL;

console.log(
  `[Config] Resolved API Base URL: ${API_BASE_URL} (ExpoGoDev: ${isRunningInExpoGoDev})`
);

export default {
  API_HOST,
  API_BASE_URL,
  API_URL,
  SOCKET_URL,
};
