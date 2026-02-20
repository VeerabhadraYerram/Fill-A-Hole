import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useMapPins } from './src/hooks/useMapPins';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// Standalone tester for the GIS features
export default function App() {
    const { pins, loading } = useMapPins({ latitude: 16.5062, longitude: 80.6480, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 'All', { useMock: true });

    return (
        <LinearGradient
            colors={['#0F2027', '#203A43', '#2C5364']}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text style={styles.title}>GIS Media Server</Text>
                <Text style={styles.subtitle}>Geospatial Verification Hub</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Synchronizing Satellites...</Text>
                </View>
            ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {pins.map((pin) => (
                        <View key={pin.id} style={styles.cardContainer}>
                            <BlurView intensity={20} tint="dark" style={styles.blurBackground} />
                            <View style={styles.cardInternal}>
                                <View style={[styles.cardIndicator, { backgroundColor: pin.color || '#00ffcc' }]} />
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{pin.title}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{pin.category}</Text>
                                        </View>
                                        <View style={[styles.badge, styles.trustBadge]}>
                                            <Text style={styles.trustText}>Trust: {pin.trustScore}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardCoords}>
                                        {pin.coordinate.latitude.toFixed(5)}°, {pin.coordinate.longitude.toFixed(5)}°
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 80,
        paddingHorizontal: 25,
        paddingBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#00ffcc',
        marginTop: 5,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#00ffcc',
        fontSize: 16,
        letterSpacing: 2,
    },
    list: { flex: 1 },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    cardContainer: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
    },
    blurBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    cardInternal: {
        flexDirection: 'row',
    },
    cardIndicator: {
        width: 6,
    },
    cardContent: {
        flex: 1,
        padding: 20,
    },
    cardTitle: {
        fontWeight: '700',
        fontSize: 18,
        color: '#ffffff',
        marginBottom: 8,
    },
    badgeRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    trustBadge: {
        backgroundColor: 'rgba(0, 255, 204, 0.2)',
        borderColor: '#00ffcc',
        borderWidth: 1,
    },
    badgeText: {
        color: '#eeeeee',
        fontSize: 12,
        fontWeight: '600',
    },
    trustText: {
        color: '#00ffcc',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardCoords: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    }
});
