import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { theme } from '../core/theme';
import { VerificationBadge, AIResourceSuggestionChip } from '../components/TrustAIComponents';
import { db } from '../core/firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function HomeDashboard({ navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = [];
            snapshot.forEach((doc) => {
                fetchedPosts.push({ id: doc.id, ...doc.data() });
            });
            setPosts(fetchedPosts);
        }, (error) => {
            console.error("Firestore Error in HomeDashboard:", error);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 2000);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Good morning, Koushik 👋</Text>
                    <Text style={styles.location}>📍 Vijayawada, AP</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('NGOForms')} style={{ marginRight: 12, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 16 }}>
                        <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: 'bold' }}>NGO Portal</Text>
                    </TouchableOpacity>
                    <Image style={styles.avatar} source={{ uri: 'https://via.placeholder.com/150' }} />
                </View>
            </View>

            <View style={styles.feedContainer}>
                <View style={styles.sheetHeader}>
                    <Text style={theme.typography.displayMedium}>Top Issues in Vijayawada</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Map')}><Text style={styles.seeAll}>Map View</Text></TouchableOpacity>
                </View>

                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primaryGreen]} />}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>No issues reported yet in your area.</Text>}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('PostDetail', { postId: item.id })} style={styles.issueCard}>

                            <View style={styles.cardHeader}>
                                <Image source={{ uri: `https://i.pravatar.cc/150?img=${index + 10}` }} style={styles.authorAvatar} />
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.authorName}>Reported by UID: {typeof item.authorId === 'string' ? item.authorId.substring(0, 5) : "Anon"}</Text>
                                        {item.verificationData?.isVerified && (
                                            <Text style={{ marginLeft: 4, fontSize: 12 }}>✅ {item.verificationData.trustScore}% Trusted</Text>
                                        )}
                                    </View>
                                    <Text style={styles.timeAgo}>📍 {item.location?.geohash || 'Map'} • {item.createdAt && typeof item.createdAt.toDate === 'function' ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just now'}</Text>
                                </View>
                            </View>

                            {item.mediaUrls && item.mediaUrls.length > 0 ? (
                                <Image source={{ uri: item.mediaUrls[0] }} style={styles.cardImage} />
                            ) : (
                                <View style={[styles.cardImage, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ color: '#888' }}>No Image Attached</Text>
                                </View>
                            )}

                            <View style={styles.cardContent}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                                    {item.isCommunitySolvable && (
                                        <View style={styles.badge}><Text style={styles.badgeText}>Community Solvable</Text></View>
                                    )}
                                </View>

                                {item.volunteersNeeded && item.materialsNeeded && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                                        <AIResourceSuggestionChip suggestion={`👥 ${item.volunteersNeeded} vols`} />
                                        {item.materialsNeeded.map((mat, i) => (
                                            <AIResourceSuggestionChip key={i} suggestion={`📦 ${mat}`} />
                                        ))}
                                    </View>
                                )}

                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <Text style={styles.actionIcon}>⬆️</Text>
                                        <Text style={styles.actionText}>{item.metrics?.upvotes || 0}</Text>
                                        <Text style={styles.actionIcon}>⬇️</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionBtn}>
                                        <Text style={styles.actionIcon}>💬</Text>
                                        <Text style={styles.actionText}>{item.metrics?.commentCount || 0} Comments</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionBtnShare}>
                                        <Text style={styles.actionIcon}>↗️ Share</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' }, // Slightly gray bg for reddit feel
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    greeting: { fontSize: 18, fontWeight: 'bold' },
    location: { color: '#666', marginTop: 4, fontSize: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },

    feedContainer: { flex: 1 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', marginBottom: 8 },
    seeAll: { color: theme.colors.primaryGreen, fontWeight: 'bold' },

    listContent: { paddingBottom: 100 },

    issueCard: { backgroundColor: 'white', marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 } },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    authorAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
    authorName: { fontWeight: 'bold', fontSize: 14 },
    timeAgo: { color: '#777', fontSize: 12, marginTop: 2 },

    cardImage: { width: '100%', height: 220 },
    cardContent: { padding: 16 },
    cardTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 12, flex: 1, marginRight: 12, lineHeight: 24 },

    badge: { backgroundColor: 'rgba(0, 200, 83, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
    badgeText: { color: theme.colors.primaryGreen, fontSize: 10, fontWeight: 'bold' },

    actionRow: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EEE' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F7F8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
    actionBtnShare: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
    actionIcon: { fontSize: 16, marginRight: 6 },
    actionText: { fontWeight: 'bold', color: '#666' }
});
