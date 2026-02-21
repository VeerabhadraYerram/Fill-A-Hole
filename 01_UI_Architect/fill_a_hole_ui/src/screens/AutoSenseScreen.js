import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated, ScrollView } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { theme } from '../core/theme';
import { db, auth } from '../core/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AutoSenseScreen({ navigation }) {
    const [isActive, setIsActive] = useState(false);
    const [speed, setSpeed] = useState(25);
    const [anomalies, setAnomalies] = useState(0);
    const [statusText, setStatusText] = useState("Drive Mode Off");

    // Subscriptions
    const _accelSub = useRef(null);
    const _gyroSub = useRef(null);
    const _locSub = useRef(null);

    // thresholds
    const Z_THRESHOLD = 1.5; // Gs (Lowered for walking/jumping test)
    const GYRO_THRESHOLD = 2.0; // rad/s (wobble)
    const SPEED_THRESHOLD = 0; // km/h (Lowered to 0 for walking test)

    // Refs for real-time values without re-rendering
    // Initialized to 25 because Simulator GPS doesn't trigger position changes.
    const currentSpeed = useRef(25);
    const recentZ = useRef(1.0);
    const recentPitch = useRef(0.0);
    const isCooldown = useRef(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isActive) {
            startSensors();
            setStatusText("Calibrating sensors...");

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();
        } else {
            stopSensors();
            setStatusText("Drive Mode Off");
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }

        return () => stopSensors();
    }, [isActive]);

    const startSensors = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setStatusText("Location Denied. Cannot calculate speed.");
            setIsActive(false);
            return;
        }

        // 1. Location Watcher (Speed)
        _locSub.current = await Location.watchPositionAsync({
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 10
        }, (loc) => {
            // Speed can be zero in simulator. We mock it as '25' if it's 0 to allow easy testing.
            let speedKmh = (loc.coords.speed || 0) * 3.6; // m/s to km/h
            if (speedKmh === 0) speedKmh = 25; // Mock speed for simulator testing

            currentSpeed.current = speedKmh;
            setSpeed(speedKmh);

            if (speedKmh > SPEED_THRESHOLD) {
                setStatusText(`Scanning... (${Math.round(speedKmh)} km/h)`);
            } else {
                setStatusText(`Speed too low for scanning.`);
            }
        });

        // 2. Accelerometer (Z-Axis Bumps)
        Accelerometer.setUpdateInterval(100);
        _accelSub.current = Accelerometer.addListener(accelData => {
            recentZ.current = accelData.z;
            if (!isCooldown.current) checkForAnomaly();
        });

        // 3. Gyroscope (Pitch/Roll Wobbles)
        Gyroscope.setUpdateInterval(100);
        _gyroSub.current = Gyroscope.addListener(gyroData => {
            recentPitch.current = Math.abs(gyroData.x) + Math.abs(gyroData.y);
            if (!isCooldown.current) checkForAnomaly();
        });
    };

    const stopSensors = () => {
        if (_accelSub.current) _accelSub.current.remove();
        if (_gyroSub.current) _gyroSub.current.remove();
        if (_locSub.current) _locSub.current.remove();
        _accelSub.current = null;
        _gyroSub.current = null;
        _locSub.current = null;
        isCooldown.current = false;
    };

    const checkForAnomaly = () => {
        if (currentSpeed.current < SPEED_THRESHOLD) return;

        // Subtract 1G (Earth's gravity when lying flat) to get pure displacement force
        const pureZForce = Math.abs(recentZ.current - 1.0);

        const isZSpike = pureZForce > Z_THRESHOLD;
        const isWobble = recentPitch.current > GYRO_THRESHOLD;

        if (isZSpike || isWobble) {
            logAnomalyToDatabase(recentZ.current, recentPitch.current);
            setAnomalies(prev => prev + 1);

            // Trigger cooldown to prevent spam
            isCooldown.current = true;

            // Reset sensor memory so it doesn't get stuck on the old spike
            recentZ.current = 1.0;
            recentPitch.current = 0.0;

            setTimeout(() => {
                isCooldown.current = false;
            }, 3000); // 3 seconds cooldown
        }
    };

    const logAnomalyToDatabase = async (zForce, pitchForce) => {
        try {
            const loc = await Location.getCurrentPositionAsync({});
            await addDoc(collection(db, 'sensor_anomalies'), {
                location: { lat: loc.coords.latitude, lng: loc.coords.longitude },
                severityScore: Math.round((Math.abs(zForce) + pitchForce) * 10),
                speedAtImpact: currentSpeed.current,
                timestamp: serverTimestamp(),
                reporterId: auth.currentUser?.uid || 'anonymous'
            });
            console.log("Logged anomaly to Firestore");
        } catch (e) {
            console.error("Failed to log anomaly", e);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ fontSize: 24, color: 'white' }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Auto-Sense Commute</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View style={[styles.radarCircle, { transform: [{ scale: pulseAnim }], borderColor: isActive ? theme.colors.primaryGreen : '#444' }]} />
                <View style={[styles.radarInner, { backgroundColor: isActive ? 'rgba(0, 200, 83, 0.2)' : '#222' }]}>
                    <Text style={styles.radarIcon}>{isActive ? '📡' : '⏸'}</Text>
                </View>

                <Text style={styles.statusText}>{statusText}</Text>
                <Text style={styles.subText}>GPS and Gyroscope Passive Scanning</Text>

                <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{Math.round(speed)}</Text>
                        <Text style={styles.metricLabel}>km/h</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={[styles.metricValue, { color: anomalies > 0 ? '#EF4444' : 'white' }]}>{anomalies}</Text>
                        <Text style={styles.metricLabel}>Anomalies</Text>
                    </View>
                </View>

                <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>Enable Drive Mode</Text>
                    <Switch
                        value={isActive}
                        onValueChange={setIsActive}
                        trackColor={{ false: "#767577", true: theme.colors.primaryGreen }}
                        thumbColor={"#f4f3f4"}
                        style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
                    />
                </View>

                {anomalies > 0 && !isActive && (
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Trip Complete! 🏁</Text>
                        <Text style={styles.summaryText}>You mapped the civic infrastructure and detected {anomalies} severe road anomalies.</Text>
                        <Text style={{ color: theme.colors.accentTeal, fontWeight: 'bold', marginTop: 8 }}>+ {anomalies * 5} Civic Coins Earned!</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: '#1A1A1A' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
    content: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
    radarCircle: { position: 'absolute', top: 60, width: 200, height: 200, borderRadius: 100, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    radarInner: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    radarIcon: { fontSize: 40 },
    statusText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 140 },
    subText: { color: '#888', fontSize: 14, marginTop: 8, marginBottom: 40 },
    metricsContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 60 },
    metricCard: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, alignItems: 'center', width: '40%', borderWidth: 1, borderColor: '#333' },
    metricValue: { color: 'white', fontSize: 36, fontWeight: 'bold' },
    metricLabel: { color: '#888', fontSize: 14, marginTop: 4 },
    toggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', width: '100%', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
    toggleLabel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    summaryCard: { marginTop: 30, backgroundColor: 'rgba(0, 200, 83, 0.1)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.primaryGreen, width: '100%' },
    summaryTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    summaryText: { color: '#CCC', lineHeight: 22 }
});
