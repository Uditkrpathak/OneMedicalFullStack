import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { store } from './src/app/store/store';
import { SocketProvider } from './src/context/SocketContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/app/navigation/AppNavigator';

export default function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <Provider store={store}>
      <SocketProvider>
        <SafeAreaProvider>
          <NotificationProvider navigationRef={navigationRef}>
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </NotificationProvider>
        </SafeAreaProvider>
      </SocketProvider>
    </Provider>
  );
}
