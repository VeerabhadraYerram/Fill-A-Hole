import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Dimensions, StatusBar, Easing
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
    // ── Animation values ────────────────────────────────────────────────
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const nameOpacity = useRef(new Animated.Value(0)).current;
    const nameY = useRef(new Animated.Value(30)).current;
    const tagOpacity = useRef(new Animated.Value(0)).current;
    const tagY = useRef(new Animated.Value(20)).current;
    const dotScale1 = useRef(new Animated.Value(0)).current;
    const dotScale2 = useRef(new Animated.Value(0)).current;
    const dotScale3 = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0.6)).current;
    const screenOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Pulsing glow loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
            ])
        ).start();

        // 2. Main entrance sequence
        Animated.sequence([
            // Logo pops in
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1, tension: 60, friction: 6, useNativeDriver: true
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1, duration: 350, useNativeDriver: true
                }),
            ]),

            // App name slides up
            Animated.parallel([
                Animated.timing(nameOpacity, {
                    toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true
                }),
                Animated.timing(nameY, {
                    toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true
                }),
            ]),

            // Tagline fades in
            Animated.parallel([
                Animated.timing(tagOpacity, {
                    toValue: 1, duration: 250, useNativeDriver: true
                }),
                Animated.timing(tagY, {
                    toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true
                }),
            ]),

            // Loading dots stagger
            Animated.stagger(120, [
                Animated.spring(dotScale1, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
                Animated.spring(dotScale2, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
                Animated.spring(dotScale3, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
            ]),

            // Hold for 2.5s total (most of the budget is in animations above, hold remainder)
            Animated.delay(1400),

            // Fade out entire screen
            Animated.timing(screenOpacity, {
                toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true
            }),
        ]).start(() => {
            navigation.replace('Login');
        });
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
            <StatusBar barStyle="light-content" backgroundColor="#050A14" />

            {/* ── Background orbs ─────────────────── */}
            <Animated.View style={[styles.orb1, { opacity: glowPulse }]} />
            <Animated.View style={[styles.orb2, { opacity: glowPulse }]} />
            <Animated.View style={[styles.orb3, { opacity: glowPulse }]} />
            <View style={styles.gridLines} />

            {/* ── Center content ─────────────────── */}
            <View style={styles.center}>

                {/* Logo icon */}
                <Animated.View style={[
                    styles.logoWrap,
                    { opacity: logoOpacity, transform: [{ scale: logoScale }] }
                ]}>
                    <Animated.View style={[styles.logoGlow, { opacity: glowPulse }]} />
                    <View style={styles.logoInner}>
                        <Text style={styles.logoEmoji}>🏘️</Text>
                    </View>
                </Animated.View>

                {/* App name */}
                <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameY }] }}>
                    <Text style={styles.appNameTop}>FILL</Text>
                    <View style={styles.nameDivider} />
                    <Text style={styles.appNameBottom}>A·HOLE</Text>
                </Animated.View>

                {/* Tagline */}
                <Animated.View style={{ opacity: tagOpacity, transform: [{ translateY: tagY }], alignItems: 'center' }}>
                    <Text style={styles.tagline}>Report · Rally · Repair</Text>
                    <Text style={styles.subTagline}>Civic Action, Powered by Community</Text>
                </Animated.View>

                {/* Loading dots */}
                <View style={styles.dotsRow}>
                    <Animated.View style={[styles.dot, styles.dotGreen, { transform: [{ scale: dotScale1 }] }]} />
                    <Animated.View style={[styles.dot, styles.dotOrange, { transform: [{ scale: dotScale2 }] }]} />
                    <Animated.View style={[styles.dot, styles.dotBlue, { transform: [{ scale: dotScale3 }] }]} />
                </View>
            </View>

            {/* ── Bottom watermark ─────────────────── */}
            <Animated.Text style={[styles.version, { opacity: tagOpacity }]}>
                v1.0 · Smart Civic Platform
            </Animated.Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050A14',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Background orbs ──────────────────────────
    orb1: {
        position: 'absolute',
        top: -height * 0.1,
        left: -width * 0.2,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: 'rgba(0, 200, 83, 0.18)',
    },
    orb2: {
        position: 'absolute',
        bottom: -height * 0.08,
        right: -width * 0.25,
        width: width * 0.75,
        height: width * 0.75,
        borderRadius: width * 0.375,
        backgroundColor: 'rgba(41, 121, 255, 0.14)',
    },
    orb3: {
        position: 'absolute',
        top: height * 0.35,
        left: width * 0.1,
        width: width * 0.4,
        height: width * 0.4,
        borderRadius: width * 0.2,
        backgroundColor: 'rgba(255, 109, 0, 0.10)',
    },
    gridLines: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.03,
        borderWidth: 0,
        // subtle dot grid via overlaid tiny views — kept lightweight
    },

    // ── Center content ───────────────────────────
    center: {
        alignItems: 'center',
        gap: 20,
    },

    // ── Logo ─────────────────────────────────────
    logoWrap: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 200, 83, 0.35)',
        transform: [{ scale: 1.4 }],
    },
    logoInner: {
        width: 88,
        height: 88,
        borderRadius: 28,
        backgroundColor: '#0D1F14',
        borderWidth: 2,
        borderColor: 'rgba(0,200,83,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 20,
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
    },
    logoEmoji: { fontSize: 42 },

    // ── App name ──────────────────────────────────
    appNameTop: {
        fontSize: 52,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 14,
        textAlign: 'center',
        lineHeight: 56,
    },
    nameDivider: {
        height: 3,
        backgroundColor: '#00C853',
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 2,
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },
    appNameBottom: {
        fontSize: 38,
        fontWeight: '900',
        color: '#00C853',
        letterSpacing: 10,
        textAlign: 'center',
        lineHeight: 46,
        textShadowColor: 'rgba(0,200,83,0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },

    // ── Tagline ───────────────────────────────────
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 4,
        textTransform: 'uppercase',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 4,
    },
    subTagline: {
        fontSize: 13,
        color: 'rgba(0,200,83,0.7)',
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 6,
    },

    // ── Loading dots ──────────────────────────────
    dotsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    dotGreen: {
        backgroundColor: '#00C853',
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },
    dotOrange: {
        backgroundColor: '#FF6D00',
        shadowColor: '#FF6D00',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },
    dotBlue: {
        backgroundColor: '#2979FF',
        shadowColor: '#2979FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },

    // ── Version ───────────────────────────────────
    version: {
        position: 'absolute',
        bottom: 36,
        color: 'rgba(255,255,255,0.2)',
        fontSize: 11,
        letterSpacing: 2,
        fontWeight: '500',
    },
});
