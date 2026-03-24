import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ActivityIndicator, View, Text, StyleSheet, Image} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import {STORAGE_KEYS} from './src/services/api';
import {ThemeProvider, useTheme} from './src/context/ThemeContext';
import {DefaultTheme, DarkTheme} from '@react-navigation/native';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string>('Onboarding');

  useEffect(() => {
    determineInitialRoute();
  }, []);

  const determineInitialRoute = async () => {
    try {
      const [onboardingDone, token] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
      ]);

      if (!onboardingDone) {
        setInitialRoute('Onboarding');
      } else if (token) {
        setInitialRoute('Chat');
      } else {
        setInitialRoute('Login');
      }
    } catch {
      setInitialRoute('Onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Image 
          source={require('./assets/splash_full.jpg')} 
          style={styles.splashFullImg} 
          resizeMode="cover" 
        />
        <View style={styles.splashOverlay}>
          <Text style={styles.splashTitle}>SevaBot</Text>
          <ActivityIndicator
            size="large"
            color="#ffffff"
            style={styles.splashSpinner}
          />
        </View>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootNavigator initialRoute={initialRoute} />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function RootNavigator({ initialRoute }: { initialRoute: string }) {
  const { isDark } = useTheme();

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{animation: 'fade'}}
        />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{animation: 'fade'}}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{animation: 'slide_from_bottom'}}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{animation: 'slide_from_right'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
  },
  splashFullImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 32,
  },
  splashSpinner: {
    marginTop: 8,
  },
});
