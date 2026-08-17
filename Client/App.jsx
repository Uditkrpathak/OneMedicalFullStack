import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from './src/app/store/store';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/app/navigation/AppNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <SocketProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </SocketProvider>
    </Provider>
  );
}
