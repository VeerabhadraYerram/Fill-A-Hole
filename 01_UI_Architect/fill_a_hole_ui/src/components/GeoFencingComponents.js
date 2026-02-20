import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../core/theme';
import { Circle, Marker } from 'react-native-maps';

export const GeoAlertBanner = ({ title, message }) => {
    return (
        <View style={styles.bannerContainer}>
            <View style={styles.iconContainer}>
                <Text style={{ fontSize: 24 }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{title}</Text>
                <Text style={styles.bannerMessage}>{message}</Text>
            </View>
        </View>
    );
};

export const ProximityPushNotification = ({ title, body }) => {
    return (
        <View style={styles.pushContainer}>
            <View style={styles.pushHeader}>
                <Text style={styles.pushAppName}>Fill-A-Hole • Now</Text>
            </View>
            <Text style={styles.pushTitle}>{title}</Text>
            <Text style={styles.pushBody}>{body}</Text>
        </View>
    );
};

export const RadarPingMapOverlay = ({ coordinate, radius = 500 }) => {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: false, // Cannot use native driver for border/width/color technically if mapped to Circle radius, but Circle maps differently
            })
        ).start();
    }, []);

    // NOTE: In react-native-maps, animating Circle radius directly is complex without native drivers. 
    // We use a static semi-transparent circle as a mock for the "Radar Ping" area.
    return (
        <>
            <Circle
                center={coordinate}
                radius={radius}
                fillColor="rgba(0, 200, 83, 0.15)"
                strokeColor="rgba(0, 200, 83, 0.5)"
                strokeWidth={2}
            />
            <Marker coordinate={coordinate}>
                <View style={styles.radarCenter}>
                    <View style={styles.radarDot} />
                </View>
            </Marker>
        </>
    );
};

const styles = StyleSheet.create({
    bannerContainer: { flexDirection: 'row', backgroundColor: '#333', padding: 16, margin: 16, borderRadius: 12, position: 'absolute', top: 40, left: 0, right: 0, zIndex: 100, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3 },
    iconContainer: { marginRight: 12, justifyContent: 'center' },
    bannerTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    bannerMessage: { color: '#CCC', fontSize: 12, marginTop: 4 },
    pushContainer: { backgroundColor: 'white', padding: 12, borderRadius: 16, margin: 16, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1 },
    pushHeader: { borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 4, marginBottom: 8 },
    pushAppName: { fontSize: 10, color: '#666', fontWeight: 'bold' },
    pushTitle: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    pushBody: { fontSize: 12, color: '#666', marginTop: 4 },
    radarCenter: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0, 200, 83, 0.3)', justifyContent: 'center', alignItems: 'center' },
    radarDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primaryGreen, borderWidth: 2, borderColor: 'white' }
});
