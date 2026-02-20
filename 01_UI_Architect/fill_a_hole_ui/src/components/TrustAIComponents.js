import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { theme } from '../core/theme';

export const VerificationBadge = ({ score }) => {
    let icon = '❌';
    let color = '#F44336';
    let text = 'Flagged';

    if (score > 90) {
        icon = '✅';
        color = '#4CAF50';
        text = 'Verified';
    } else if (score >= 50) {
        icon = '⏳';
        color = '#FFC107';
        text = 'Pending';
    }

    return (
        <View style={[styles.badgeContainer, { backgroundColor: color + '20' }]}>
            <Text style={{ fontSize: 12 }}>{icon}</Text>
            <Text style={[styles.badgeText, { color }]}>{text}</Text>
        </View>
    );
};

export const GPSStrengthIndicator = ({ accuracy }) => {
    let color = '#F44336';
    let text = 'Weak GPS';
    let bars = 1;

    if (accuracy < 10) {
        color = '#4CAF50';
        text = `Strong (${accuracy}m)`;
        bars = 3;
    } else if (accuracy < 50) {
        color = '#FFC107';
        text = `Acceptable (${accuracy}m)`;
        bars = 2;
    }

    return (
        <View style={styles.gpsContainer}>
            <View style={styles.barsContainer}>
                <View style={[styles.bar, { height: 6, backgroundColor: color }]} />
                <View style={[styles.bar, { height: 10, backgroundColor: bars >= 2 ? color : '#DDD' }]} />
                <View style={[styles.bar, { height: 14, backgroundColor: bars === 3 ? color : '#DDD' }]} />
            </View>
            <Text style={[styles.gpsText, { color }]}>{text}</Text>
        </View>
    );
};

export const AIResourceSuggestionChip = ({ suggestion, onDismiss }) => {
    return (
        <View style={styles.aiChip}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>🤖</Text>
            <Text style={styles.aiChipText}>{suggestion}</Text>
            {onDismiss && (
                <Text onPress={onDismiss} style={styles.dismissBtn}>✕</Text>
            )}
        </View>
    );
};

export const AILoadingIndicator = () => {
    const pulseValue = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(pulseValue, { toValue: 0.5, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();
    }, []);

    return (
        <View style={styles.aiLoadingContainer}>
            <Animated.Text style={{ fontSize: 24, transform: [{ scale: pulseValue }] }}>✨</Animated.Text>
            <Text style={styles.aiLoadingText}>AI is analyzing...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badgeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
    badgeText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    gpsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    barsContainer: { flexDirection: 'row', alignItems: 'flex-end', marginRight: 8, gap: 2 },
    bar: { width: 4, borderRadius: 2 },
    gpsText: { fontSize: 12, fontWeight: 'bold' },
    aiChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginVertical: 4, borderWidth: 1, borderColor: '#B2DFDB' },
    aiChipText: { color: '#00695C', fontWeight: 'bold', fontSize: 12, flexShrink: 1 },
    dismissBtn: { color: '#00695C', marginLeft: 8, fontWeight: 'bold', fontSize: 14 },
    aiLoadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    aiLoadingText: { color: '#00695C', marginLeft: 8, fontStyle: 'italic', fontWeight: 'bold' },
});
