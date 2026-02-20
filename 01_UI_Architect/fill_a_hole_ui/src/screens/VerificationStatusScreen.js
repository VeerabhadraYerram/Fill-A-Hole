import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../core/theme';

export default function VerificationStatusScreen({ navigation, route }) {
    const { postId, score, verdict, signals, isFlagged } = route.params || {};
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        // "Processing" animation to make the AI feel real
        setTimeout(() => setVerifying(false), 2000);
    }, []);

    const handleContinue = () => {
        // Go back to the main feed / map
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AI Verification Result</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {verifying ? (
                    <View style={styles.processingBlock}>
                        <Text style={{ fontSize: 40, marginBottom: 16 }}>🤖</Text>
                        <Text style={styles.processingText}>Analyzing evidence...</Text>
                        <Text style={styles.processingSub}>Checking GPS, metadata, and description plausibility.</Text>
                    </View>
                ) : (
                    <>
                        {/* Score Overview */}
                        <View style={styles.scoreCard}>
                            <Text style={styles.scoreTitle}>Authenticity Score</Text>
                            <Text style={[styles.scoreValue, isFlagged && { color: '#F44336' }]}>
                                {score}
                                <Text style={styles.scoreMax}>/100</Text>
                            </Text>
                            <Text style={[styles.verdictText, isFlagged && { color: '#F44336' }]}>
                                {verdict}
                            </Text>
                        </View>

                        {/* Breakdown */}
                        <View style={styles.checklist}>
                            <Text style={{ fontWeight: 'bold', marginBottom: 12, fontSize: 16 }}>AI Analysis Breakdown</Text>
                            {signals?.map((sig, index) => {
                                // Extract icon
                                const [icon, ...textParts] = sig.split(' ');
                                const text = textParts.join(' ');
                                return (
                                    <View key={index} style={styles.checkItem}>
                                        <Text style={{ fontSize: 18, marginRight: 12 }}>{icon}</Text>
                                        <Text style={styles.checkText}>{text}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Final Banner */}
                        {isFlagged ? (
                            <View style={[styles.successBanner, { backgroundColor: '#FFEBEE' }]}>
                                <Text style={styles.successIcon}>🚨</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.successTitle, { color: '#C62828' }]}>Flagged for Review</Text>
                                    <Text style={[styles.successDesc, { color: '#C62828' }]}>
                                        This report scored too low on authenticity. It has been saved for your records but is hidden from the public feed.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.successBanner}>
                                <Text style={styles.successIcon}>🛡️</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.successTitle}>Verified Evidence</Text>
                                    <Text style={styles.successDesc}>
                                        Your report passed AI checks and is now live on the community map!
                                    </Text>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.continueBtn, verifying && { opacity: 0.5 }]}
                disabled={verifying}
                onPress={handleContinue}
            >
                <Text style={styles.continueText}>Go to Map</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { padding: 16, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 24, paddingBottom: 100 },

    processingBlock: { alignItems: 'center', marginTop: 80 },
    processingText: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
    processingSub: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 },

    scoreCard: { backgroundColor: 'white', padding: 24, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, marginBottom: 20 },
    scoreTitle: { fontSize: 14, color: '#666', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    scoreValue: { fontSize: 56, fontWeight: '900', color: theme.colors.primaryGreen },
    scoreMax: { fontSize: 24, color: '#CCC' },
    verdictText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primaryGreen, marginTop: 4 },

    checklist: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05 },
    checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkText: { fontSize: 14, fontWeight: '500', color: '#333', flex: 1 },

    successBanner: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, alignItems: 'center' },
    successIcon: { fontSize: 28, marginRight: 12 },
    successTitle: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
    successDesc: { color: '#2E7D32', fontSize: 12, marginTop: 4, lineHeight: 18 },

    continueBtn: { position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center' },
    continueText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
