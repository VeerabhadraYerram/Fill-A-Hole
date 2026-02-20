import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../core/theme';

export default function VerificationStatusScreen({ navigation, route }) {
    // Expecting photoUri and location as params
    const { photoUri } = route.params || {};
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        // Simulate a backend verification check wait
        setTimeout(() => setVerifying(false), 2500);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Verification Status</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Image source={{ uri: photoUri || 'https://via.placeholder.com/300' }} style={styles.previewImage} />

                <View style={styles.scoreCard}>
                    <Text style={styles.scoreTitle}>Trust Score</Text>
                    {verifying ? (
                        <ActivityIndicator size="large" color={theme.colors.primaryGreen} style={{ marginVertical: 20 }} />
                    ) : (
                        <Text style={styles.scoreValue}>96<Text style={styles.scoreMax}>/100</Text></Text>
                    )}
                </View>

                <View style={styles.checklist}>
                    <CheckItem text="GPS locked (accuracy 8m)" status={verifying ? 'pending' : 'pass'} />
                    <CheckItem text="Photo taken just now" status={verifying ? 'pending' : 'pass'} />
                    <CheckItem text="No EXIF editing detected" status={verifying ? 'pending' : 'pass'} />
                    <CheckItem text="Location matches expected zone" status={verifying ? 'pending' : 'pass'} />
                </View>

                {!verifying && (
                    <View style={styles.successBanner}>
                        <Text style={styles.successIcon}>✅</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.successTitle}>Verified Evidence</Text>
                            <Text style={styles.successDesc}>Your photo guarantees maximum trust in the community feed.</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.continueBtn, verifying && { opacity: 0.5 }]}
                disabled={verifying}
                onPress={() => navigation.navigate('CreatePost')} // Navigate back to Wizard Step 2
            >
                <Text style={styles.continueText}>Continue to Report</Text>
            </TouchableOpacity>
        </View>
    );
}

const CheckItem = ({ text, status }) => {
    let icon = '⏳';
    let color = '#999';
    if (status === 'pass') { icon = '✅'; color = '#4CAF50'; }
    if (status === 'fail') { icon = '❌'; color = '#F44336'; }

    return (
        <View style={styles.checkItem}>
            <Text style={{ fontSize: 16, marginRight: 12 }}>{icon}</Text>
            <Text style={[styles.checkText, { color: status === 'pending' ? '#999' : '#333' }]}>{text}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 16, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 24, paddingBottom: 100 },
    previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 24 },
    scoreCard: { backgroundColor: 'white', padding: 24, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, marginBottom: 24 },
    scoreTitle: { fontSize: 16, color: '#666', fontWeight: 'bold', marginBottom: 8 },
    scoreValue: { fontSize: 48, fontWeight: '900', color: theme.colors.primaryGreen },
    scoreMax: { fontSize: 24, color: '#CCC' },
    checklist: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 24 },
    checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkText: { fontSize: 14, fontWeight: '500' },
    successBanner: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, alignItems: 'center' },
    successIcon: { fontSize: 24, marginRight: 12 },
    successTitle: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
    successDesc: { color: '#2E7D32', fontSize: 12, marginTop: 4 },
    continueBtn: { position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: theme.colors.primaryGreen, padding: 16, borderRadius: 12, alignItems: 'center' },
    continueText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
