import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { theme } from '../core/theme';

const { width } = Dimensions.get('window');

export default function PostDetailScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <ScrollView>
                <Image source={{ uri: 'https://via.placeholder.com/800x400' }} style={styles.heroImage} />

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>←</Text>
                </TouchableOpacity>

                <View style={styles.upvoteBadge}>
                    <Text style={{ fontWeight: 'bold' }}>❤️ 124 Upvotes</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>Huge Pothole causing traffic</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.tagSafety}><Text style={styles.tagSafetyText}>Safety</Text></View>
                        <Text style={styles.authorText}>Reported 2 hours ago by Koushik</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>
                        This pothole is extremely dangerous at night. Multiple bikes have skidded here. We need some gravel and tar to patch it up temporarily.
                    </Text>

                    <View style={styles.progressCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: theme.colors.primaryGreen, marginRight: 8 }}>👥</Text>
                            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Community Solvable</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                            <Text>4/5 Volunteers Needed</Text>
                            <Text>80%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '80%' }]} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.volunteerBtn}>
                        <Text style={styles.volunteerBtnText}>🤝 Volunteer Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.donateBtn}>
                        <Text style={styles.donateBtnText}>₹ Donate Materials</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.chatBtn}>
                        <Text style={styles.chatBtnText}>💬 Join Group Chat</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Comments</Text>
                    <Comment name="Ravi" text="I can bring 1 bag of cement." />
                    <Comment name="Priya" text="I have a shovel, will join at 5 PM." />

                </View>
            </ScrollView>
        </View>
    );
}

const Comment = ({ name, text }) => (
    <View style={styles.commentContainer}>
        <View style={styles.commentAvatar} />
        <View style={styles.commentBubble}>
            <Text style={styles.commentName}>{name}</Text>
            <Text>{text}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    heroImage: { width: width, height: 250 },
    backBtn: { position: 'absolute', top: 40, left: 16, backgroundColor: 'rgba(0,0,0,0.3)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    upvoteBadge: { position: 'absolute', top: 200, right: 16, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1 },
    content: { padding: 24, paddingBottom: 60 },
    title: { fontSize: 24, fontWeight: 'bold' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 24 },
    tagSafety: { backgroundColor: 'rgba(255, 152, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
    tagSafetyText: { color: '#FF9800', fontWeight: 'bold' },
    authorText: { color: '#666' },
    sectionTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 8, marginTop: 16 },
    description: { lineHeight: 24, color: '#333' },
    progressCard: { backgroundColor: 'rgba(0, 200, 83, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 200, 83, 0.3)', borderRadius: 12, padding: 16, marginVertical: 24 },
    progressBarBg: { height: 8, backgroundColor: '#DDD', borderRadius: 4, marginTop: 8 },
    progressBarFill: { height: '100%', backgroundColor: theme.colors.primaryGreen, borderRadius: 4 },
    volunteerBtn: { backgroundColor: theme.colors.primaryGreen, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    volunteerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    donateBtn: { borderWidth: 2, borderColor: theme.colors.accentTeal, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    donateBtnText: { color: theme.colors.accentTeal, fontWeight: 'bold', fontSize: 16 },
    chatBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
    chatBtnText: { color: '#666', fontWeight: 'bold', fontSize: 16 },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 16 },
    commentContainer: { flexDirection: 'row', marginBottom: 12 },
    commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEE', marginRight: 12 },
    commentBubble: { flex: 1, backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12 },
    commentName: { fontWeight: 'bold', fontSize: 12, marginBottom: 4 }
});
