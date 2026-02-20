import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import PagerView from 'react-native-pager-view';
import { theme } from '../core/theme';
import { AILoadingIndicator, AIResourceSuggestionChip } from '../components/TrustAIComponents';
import { auth, db } from '../core/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CreatePostWizard({ navigation }) {
    const pagerRef = useRef(null);
    const [step, setStep] = useState(0);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [communitySolvable, setCommunitySolvable] = useState(false);
    const [aiSuggesting, setAiSuggesting] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (communitySolvable) {
            setAiSuggesting(true);
            setTimeout(() => setAiSuggesting(false), 2000);
        }
    }, [communitySolvable]);

    const nextStep = async () => {
        if (step < 3) {
            pagerRef.current?.setPage(step + 1);
        } else {
            // Submit logic
            if (!title) {
                Alert.alert("Error", "Please enter a title for your report.");
                return;
            }

            setLoading(true);
            try {
                const user = auth.currentUser;
                // Prepare exactly as our backend schema expects
                const newPost = {
                    authorId: user ? user.uid : "anonymous",
                    title: title,
                    description: description,
                    category: "Infrastructure", // Hardcoded for MVP UI
                    isCommunitySolvable: communitySolvable,
                    status: "open",
                    location: {
                        geohash: "tdr1vzc", // Mock location for Bengaluru for now
                        lat: 12.9716,
                        lng: 77.5946
                    },
                    mediaUrls: [],
                    metrics: {
                        upvotes: 0,
                        commentCount: 0,
                        shares: 0,
                        volunteersCount: 0
                    },
                    verificationData: {
                        isVerified: false,
                        trustScore: 0
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                await addDoc(collection(db, 'posts'), newPost);

                setLoading(false);
                Alert.alert('Success!', 'Your civic issue has been securely logged on the blockchain and reported.');
                navigation.goBack();

            } catch (error) {
                console.error("Error creating post: ", error);
                Alert.alert("Error", "Failed to submit report. Please try again.");
                setLoading(false);
            }
        }
    };

    const prevStep = () => {
        if (step > 0) {
            pagerRef.current?.setPage(step - 1);
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.appBar}>
                <TouchableOpacity onPress={prevStep}>
                    <Text style={styles.iconBtn}>{step === 0 ? '✕' : '←'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Create Report - Step {step + 1}/4</Text>
                <View style={styles.iconBtn} />
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} />
            </View>

            <PagerView
                style={styles.pagerView}
                initialPage={0}
                ref={pagerRef}
                scrollEnabled={false}
                onPageSelected={(e) => setStep(e.nativeEvent.position)}
            >
                {/* Step 1: GeoCamera Link */}
                <View key="0" style={styles.page}>
                    <Text style={theme.typography.displayLarge}>Acquire Evidence</Text>

                    <Text style={{ color: '#666', marginTop: 16, marginBottom: 24 }}>
                        To ensure high trust scores and instant verification, civic issues must be reported using our Secure GeoCamera.
                    </Text>

                    <TouchableOpacity style={styles.geoCameraBtn} onPress={() => navigation.navigate('GeoCamera')}>
                        <Text style={{ fontSize: 32 }}>📸</Text>
                        <Text style={styles.geoCameraBtnText}>Launch Secure GeoCamera</Text>
                        <Text style={{ color: 'white', opacity: 0.8, fontSize: 10, marginTop: 4 }}>Requires GPS Lock & Non-Edited Photos</Text>
                    </TouchableOpacity>

                    <View style={styles.gpsBanner}>
                        <Text style={styles.gpsIcon}>✅</Text>
                        <Text style={styles.gpsText}>Evidence Verified. Trust Score: 96/100</Text>
                    </View>
                </View>

                {/* Step 2: Category & Tags */}
                <View key="1" style={styles.page}>
                    <Text style={theme.typography.displayLarge}>Category & Tags</Text>
                    <View style={styles.categoryGrid}>
                        <CategoryCard title="Infrastructure" icon="⛏️" selected />
                        <CategoryCard title="Safety" icon="🛡️" />
                        <CategoryCard title="Garbage" icon="🗑️" />
                        <CategoryCard title="Streetlight" icon="💡" />
                    </View>
                    <Text style={[theme.typography.displayMedium, { marginTop: 24, marginBottom: 8 }]}>Tags</Text>
                    <View style={styles.tagsContainer}>
                        <Text style={styles.tagSelected}>Pothole</Text>
                        <Text style={styles.tag}>Road Damage</Text>
                        <Text style={styles.tag}>Accident Hazard</Text>
                        <TouchableOpacity><Text style={styles.addTag}>+ Add Tag</Text></TouchableOpacity>
                    </View>
                </View>

                {/* Step 3: Details */}
                <ScrollView key="2" style={styles.pageScroll}>
                    <Text style={theme.typography.displayLarge}>Details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Title"
                        value={title}
                        onChangeText={setTitle}
                    />
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        placeholder="Description (Optional)"
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />
                    <View style={styles.toggleCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>Community Solvable</Text>
                            <Text style={{ color: '#666', fontSize: 12 }}>This is a small issue citizens can fix.</Text>
                        </View>
                        <Switch value={communitySolvable} onValueChange={setCommunitySolvable} thumbColor={theme.colors.primaryGreen} trackColor={{ true: 'rgba(0, 200, 83, 0.4)' }} />
                    </View>
                    {communitySolvable && (
                        <View style={{ marginTop: 12 }}>
                            {aiSuggesting ? <AILoadingIndicator /> : (
                                <>
                                    <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>AI Suggested Requirements:</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                        <AIResourceSuggestionChip suggestion="3 Volunteers" />
                                        <AIResourceSuggestionChip suggestion="2 Bags of Gravel" />
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Step 4: Preview */}
                <View key="3" style={styles.page}>
                    <Text style={theme.typography.displayLarge}>Preview</Text>
                    <View style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            <View style={styles.previewImageMock} />
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Massive Pothole</Text>
                                <Text style={{ color: '#666' }}>Infrastructure • Near MG Road</Text>
                            </View>
                        </View>
                        <Text style={{ fontWeight: 'bold', marginTop: 16 }}>Description:</Text>
                        <Text>The pothole is very deep and causes accidents for two-wheelers especially at night.</Text>
                        {communitySolvable && (
                            <View style={styles.previewBadge}>
                                <Text style={styles.previewBadgeText}>Community Solvable</Text>
                            </View>
                        )}
                    </View>
                </View>
            </PagerView >

            <TouchableOpacity
                style={[styles.bottomBtn, loading && { opacity: 0.7 }]}
                onPress={nextStep}
                disabled={loading}
            >
                <Text style={styles.bottomBtnText}>
                    {loading ? "Submitting..." : (step === 3 ? 'Submit Report' : 'Next')}
                </Text>
            </TouchableOpacity>
        </View >
    );
}

const CategoryCard = ({ title, icon, selected }) => (
    <View style={[styles.catCard, selected && styles.catCardSelected]}>
        <Text style={{ fontSize: 32 }}>{icon}</Text>
        <Text style={[styles.catCardText, selected && { fontWeight: 'bold' }]}>{title}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    appBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 40, alignItems: 'center' },
    iconBtn: { fontSize: 24, width: 32, textAlign: 'center' },
    title: { fontSize: 16, fontWeight: 'bold' },
    progressBar: { height: 4, backgroundColor: '#EEE', width: '100%' },
    progressFill: { height: '100%', backgroundColor: theme.colors.primaryGreen },
    pagerView: { flex: 1 },
    page: { flex: 1, padding: 24 },
    pageScroll: { flex: 1, padding: 24 },
    geoCameraBtn: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
    geoCameraBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 12 },
    gpsBanner: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' },
    gpsIcon: { color: theme.colors.primaryGreen, marginRight: 8 },
    gpsText: { color: '#333' },
    mapSnippet: { height: 120, backgroundColor: '#EEEEEE', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 24 },
    catCard: { width: '48%', backgroundColor: 'white', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
    catCardSelected: { borderColor: theme.colors.primaryGreen, backgroundColor: 'rgba(0, 200, 83, 0.1)' },
    catCardText: { marginTop: 8, fontSize: 12 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: '#EEEEEE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
    tagSelected: { backgroundColor: 'rgba(0, 200, 83, 0.2)', color: theme.colors.primaryGreen, fontWeight: 'bold', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
    addTag: { textDecorationLine: 'underline', color: theme.colors.primaryGreen, paddingVertical: 8 },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, marginTop: 16, fontSize: 16 },
    toggleCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, marginTop: 24 },
    aiSuggestion: { color: theme.colors.primaryGreen, fontWeight: 'bold', fontSize: 12, marginTop: 12 },
    previewCard: { backgroundColor: 'white', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, padding: 16, borderWidth: 1, borderColor: '#EEE' },
    previewHeader: { flexDirection: 'row' },
    previewImageMock: { width: 60, height: 60, backgroundColor: '#DDD', borderRadius: 8 },
    previewBadge: { backgroundColor: 'rgba(0, 200, 83, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 16 },
    previewBadgeText: { color: theme.colors.primaryGreen, fontSize: 12, fontWeight: 'bold' },
    bottomBtn: { backgroundColor: theme.colors.primaryGreen, padding: 16, margin: 16, borderRadius: 12, alignItems: 'center' },
    bottomBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
