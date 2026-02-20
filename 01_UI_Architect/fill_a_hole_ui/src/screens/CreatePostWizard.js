import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import PagerView from 'react-native-pager-view';
import { theme } from '../core/theme';

export default function CreatePostWizard({ navigation }) {
    const pagerRef = useRef(null);
    const [step, setStep] = useState(0);
    const [communitySolvable, setCommunitySolvable] = useState(false);

    const nextStep = () => {
        if (step < 3) {
            pagerRef.current?.setPage(step + 1);
        } else {
            // Submit logic
            alert('Success! Your report has been submitted.');
            navigation.goBack();
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
                {/* Step 1: Photo & Location */}
                <View key="0" style={styles.page}>
                    <Text style={theme.typography.displayLarge}>Photo & Location</Text>
                    <View style={styles.photoGrid}>
                        <TouchableOpacity style={styles.addPhotoCard}>
                            <Text style={{ fontSize: 32, color: 'grey' }}>📷</Text>
                            <Text style={{ color: 'grey' }}>Add Photo</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.gpsBanner}>
                        <Text style={styles.gpsIcon}>✅</Text>
                        <Text style={styles.gpsText}>Location fetched from GPS successfully.</Text>
                    </View>
                    <Text style={[theme.typography.displayMedium, { marginTop: 24, marginBottom: 8 }]}>Location</Text>
                    <View style={styles.mapSnippet}>
                        <Text style={{ color: '#666' }}>Map Snippet Placeholder</Text>
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
                    <TextInput style={styles.input} placeholder="Title" />
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        placeholder="Description (Optional)"
                        multiline
                    />
                    <View style={styles.toggleCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>Community Solvable</Text>
                            <Text style={{ color: '#666', fontSize: 12 }}>This is a small issue citizens can fix.</Text>
                        </View>
                        <Switch value={communitySolvable} onValueChange={setCommunitySolvable} thumbColor={theme.colors.primaryGreen} trackColor={{ true: 'rgba(0, 200, 83, 0.4)' }} />
                    </View>
                    {communitySolvable && (
                        <Text style={styles.aiSuggestion}>🤖 AI Suggestion: Requires 3 volunteers + 2 bags of gravel</Text>
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
            </PagerView>

            <TouchableOpacity style={styles.bottomBtn} onPress={nextStep}>
                <Text style={styles.bottomBtnText}>{step === 3 ? 'Submit Report' : 'Next'}</Text>
            </TouchableOpacity>
        </View>
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
    photoGrid: { flexDirection: 'row', marginTop: 24 },
    addPhotoCard: { flex: 1, height: 120, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    gpsBanner: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' },
    gpsIcon: { color: theme.colors.primaryGreen, marginRight: 8 },
    gpsText: { color: '#333' },
    mapSnippet: { flex: 1, backgroundColor: '#EEEEEE', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
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
