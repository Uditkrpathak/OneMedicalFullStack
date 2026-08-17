import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostIp = () => {
  // If running on Android Emulator (not physical device), use 10.0.2.2 loopback IP
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return '10.0.2.2';
  }

  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.inputs?.find(i => i.variable === 'EXPO_MANIFEST_SERVER_URL')?.value;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (err) {
    console.warn('[Config] Error detecting host IP:', err);
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

const isStandaloneBuild = !__DEV__ || (Constants.isDevice && !Constants.expoConfig?.hostUri);

export const API_HOST = getHostIp();

export const API_BASE_URL = isStandaloneBuild
  ? 'https://onemedical-v2-gateway.onrender.com/api/v1'
  : (API_HOST.includes('localhost') || API_HOST.includes('10.0.2.2') || /^[0-9.]+$/.test(API_HOST))
    ? `http://${API_HOST}:5000/api/v1`
    : 'https://onemedical-v2-gateway.onrender.com/api/v1';

export const API_URL = API_BASE_URL;

export const SOCKET_URL = isStandaloneBuild
  ? 'https://onemedical-v2-gateway.onrender.com'
  : (API_HOST.includes('localhost') || API_HOST.includes('10.0.2.2') || /^[0-9.]+$/.test(API_HOST))
    ? `http://${API_HOST}:5000`
    : 'https://onemedical-v2-gateway.onrender.com';

console.log(`[Config] Resolved API Base URL: ${API_BASE_URL} (Standalone: ${isStandaloneBuild})`);

export default {
  API_HOST,
  API_BASE_URL,
  API_URL,
  SOCKET_URL,
};
