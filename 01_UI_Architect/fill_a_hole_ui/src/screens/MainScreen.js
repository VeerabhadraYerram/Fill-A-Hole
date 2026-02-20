import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../core/theme';

import HomeDashboard from './HomeDashboard';
import MapScreenView from './MapScreen'; // Renaming locally to avoid confusion but it's MapScreen
import FeedScreen from './FeedScreen';
import MessagesScreen from './MessagesScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainScreen({ navigation }) {
    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: theme.colors.primaryGreen,
                    tabBarInactiveTintColor: 'gray',
                    headerShown: false,
                    tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 }
                }}
            >
                <Tab.Screen name="Home" component={HomeDashboard} options={{ tabBarIcon: () => <Text>🏠</Text> }} />
                <Tab.Screen name="Map" component={MapScreenView} options={{ tabBarIcon: () => <Text>🗺️</Text> }} />
                <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarIcon: () => <Text>💬</Text> }} />
                <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: () => <Text>👤</Text> }} />
            </Tab.Navigator>

            {/* Floating Action Button for Create Post */}
            <View style={styles.fabContainer}>
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreatePost')}>
                    <Text style={styles.fabIcon}>+</Text>
                    <Text style={styles.fabText}>Report</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fabContainer: { position: 'absolute', bottom: 80, alignSelf: 'center', zIndex: 10 },
    fab: { backgroundColor: theme.colors.primaryGreen, flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, alignItems: 'center' },
    fabIcon: { color: 'white', fontSize: 24, fontWeight: 'bold', marginRight: 8, lineHeight: 28 },
    fabText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
