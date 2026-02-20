import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import MainScreen from './src/screens/MainScreen';
import CreatePostWizard from './src/screens/CreatePostWizard';
import PostDetailScreen from './src/screens/PostDetailScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="CreatePost" component={CreatePostWizard} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
