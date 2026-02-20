import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background Gradient */}
            <View style={styles.bgGradient}>
                <View style={styles.bgCircle1} />
                <View style={styles.bgCircle2} />
            </View>

            {/* Hero Section */}
            <View style={styles.heroSection}>
                <View style={styles.logoContainer}>
                    <Feather name="map-pin" size={48} color="#00C853" />
                </View>
                <Text style={styles.appName}>Fill-A-Hole</Text>
                <Text style={styles.tagline}>
                    Your neighbourhood's{'\n'}silent problems, solved loud.
                </Text>
                <Text style={styles.subTagline}>
                    Report. Rally. Repair.
                </Text>
            </View>

            {/* How it works - compact */}
            <View style={styles.stepsRow}>
                <View style={styles.stepItem}>
                    <View style={styles.stepIcon}><Feather name="camera" size={22} color="#00C853" /></View>
                    <Text style={styles.stepLabel}>Snap It</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#555" style={{ marginTop: 8 }} />
                <View style={styles.stepItem}>
                    <View style={styles.stepIcon}><Feather name="users" size={22} color="#FF6D00" /></View>
                    <Text style={styles.stepLabel}>Rally Crew</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#555" style={{ marginTop: 8 }} />
                <View style={styles.stepItem}>
                    <View style={styles.stepIcon}><Feather name="check-circle" size={22} color="#2979FF" /></View>
                    <Text style={styles.stepLabel}>Fix It</Text>
                </View>
            </View>

            {/* Entry Buttons */}
            <View style={styles.entrySection}>
                <Text style={styles.entryTitle}>How will you make an impact?</Text>

                <TouchableOpacity
                    style={styles.volunteerBtn}
                    onPress={() => navigation.replace('Login')}
                    activeOpacity={0.85}
                >
                    <View style={styles.btnIconWrap}>
                        <Feather name="zap" size={24} color="#FFF" />
                    </View>
                    <View style={styles.btnTextWrap}>
                        <Text style={styles.btnTitle}>🦸 Be a Street Hero</Text>
                        <Text style={styles.btnSub}>Spot issues, rally your crew, fix your hood</Text>
                    </View>
                    <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.ngoBtn}
                    onPress={() => navigation.replace('Login')}
                    activeOpacity={0.85}
                >
                    <View style={[styles.btnIconWrap, { backgroundColor: 'rgba(0,200,83,0.15)' }]}>
                        <Feather name="shield" size={24} color="#00C853" />
                    </View>
                    <View style={styles.btnTextWrap}>
                        <Text style={[styles.btnTitle, { color: '#1A1A1B' }]}>🏛️ Lead the Mission</Text>
                        <Text style={[styles.btnSub, { color: '#666' }]}>Organize, deploy teams, transform communities</Text>
                    </View>
                    <Feather name="arrow-right" size={20} color="#999" />
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => navigation.replace('Login')}>
                    <Text style={styles.footerLink}>Already a hero? <Text style={{ fontWeight: 'bold' }}>Sign in</Text></Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D1117',
    },

    // Background decorations
    bgGradient: { ...StyleSheet.absoluteFillObject },
    bgCircle1: {
        position: 'absolute', top: -80, right: -60,
        width: 250, height: 250, borderRadius: 125,
        backgroundColor: 'rgba(0, 200, 83, 0.08)',
    },
    bgCircle2: {
        position: 'absolute', bottom: 100, left: -80,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(41, 121, 255, 0.06)',
    },

    // Hero
    heroSection: {
        alignItems: 'center',
        paddingTop: height * 0.08,
        paddingHorizontal: 32,
    },
    logoContainer: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: 'rgba(0, 200, 83, 0.12)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
    },
    appName: {
        fontSize: 36, fontWeight: '800', color: '#FFFFFF',
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 18, color: '#B0B3B8',
        textAlign: 'center', marginTop: 12, lineHeight: 26,
    },
    subTagline: {
        fontSize: 16, color: '#00C853',
        fontWeight: '700', marginTop: 8, letterSpacing: 2,
    },

    // Steps Row
    stepsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 32, marginBottom: 24, paddingHorizontal: 24,
    },
    stepItem: { alignItems: 'center', marginHorizontal: 12 },
    stepIcon: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 6,
    },
    stepLabel: { fontSize: 12, color: '#B0B3B8', fontWeight: '600' },

    // Entry Section
    entrySection: { paddingHorizontal: 24, marginTop: 8 },
    entryTitle: {
        fontSize: 16, color: '#888',
        textAlign: 'center', marginBottom: 20, fontWeight: '500',
    },

    volunteerBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#00C853',
        borderRadius: 16, padding: 18, marginBottom: 14,
        elevation: 4,
        shadowColor: '#00C853', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8,
    },
    ngoBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16, padding: 18, marginBottom: 14,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4,
    },
    btnIconWrap: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
    },
    btnTextWrap: { flex: 1 },
    btnTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFF', marginBottom: 3 },
    btnSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

    // Footer
    footer: {
        position: 'absolute', bottom: 40,
        width: '100%', alignItems: 'center',
    },
    footerLink: { color: '#888', fontSize: 14 },
});
