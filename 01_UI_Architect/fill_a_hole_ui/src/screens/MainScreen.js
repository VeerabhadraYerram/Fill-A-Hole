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
        <View style={{ flex: 1, backgroundColor: '#F0F2F5' }}>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: theme.colors.primaryGreen,
                    tabBarInactiveTintColor: '#8E8E93',
                    headerShown: false,
                    tabBarShowLabel: false,
                    tabBarStyle: {
                        position: 'absolute',
                        height: 70,
                        borderTopWidth: 0,
                        backgroundColor: '#FFFFFF',
                        elevation: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                    }
                }}
            >
                <Tab.Screen name="Home" component={HomeDashboard} options={{ tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text> }} />
                <Tab.Screen name="Map" component={MapScreenView} options={{ tabBarIcon: () => <Text style={{ fontSize: 24 }}>🗺️</Text>, tabBarItemStyle: { marginRight: 25 } }} />

                {/* Empty invisible tab just for spacing */}
                <Tab.Screen name="Feed" component={FeedScreen} options={{
                    tabBarButton: () => <View style={{ width: 0 }} />
                }} />

                <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 24 }}>💬</Text>, tabBarItemStyle: { marginLeft: 25 } }} />
                <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text> }} />
            </Tab.Navigator>

            {/* Centered Floating Action Button for Create Post */}
            <View style={styles.fabWrapper} pointerEvents="box-none">
                <View style={styles.fabBackground}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.fab} onPress={() => navigation.navigate('CreatePost')}>
                        <Text style={styles.fabIcon}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fabWrapper: {
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabBackground: {
        backgroundColor: '#F0F2F5', // matches main background to create pseudo-cutout
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        backgroundColor: theme.colors.primaryGreen,
        width: 60,
        height: 60,
        borderRadius: 30,
        elevation: 8,
        shadowColor: theme.colors.primaryGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    fabIcon: {
        color: 'white',
        fontSize: 34,
        fontWeight: '300',
        marginTop: -3 // optical centering
    },
});
