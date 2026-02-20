import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, RefreshControl, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../core/theme';
import { VerificationBadge, AIResourceSuggestionChip } from '../components/TrustAIComponents';
import { db, auth } from '../core/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function HomeDashboard({ navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [posts, setPosts] = useState([]);
    const [userName, setUserName] = useState('there');
    const [userCity, setUserCity] = useState('your area');
    const [userAvatar, setUserAvatar] = useState(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Load current user profile from Firestore
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        getDoc(doc(db, 'users', user.uid)).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.displayName) setUserName(data.displayName.split(' ')[0]); // First name only
                if (data.city) setUserCity(data.city);
                if (data.photoURL) setUserAvatar(data.photoURL);
            }
        }).catch(console.error);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = [];
            const currentUser = auth.currentUser;
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Hide flagged posts unless the current user is the author
                if (data.status === 'flagged' && data.authorId !== currentUser?.uid) {
                    return;
                }
                fetchedPosts.push({ id: doc.id, ...data });
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
                    <Text style={styles.greeting}>{getGreeting()}, {userName} 👋</Text>
                    <Text style={styles.location}>📍 {userCity}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('NGOForms')} style={{ marginRight: 12, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 16 }}>
                        <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: 'bold' }}>NGO Portal</Text>
                    </TouchableOpacity>
                    <Image
                        style={styles.avatar}
                        source={{ uri: userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=00C853&color=fff&size=150` }}
                    />
                </View>
            </View>

            <View style={styles.feedContainer}>
                <View style={styles.sheetHeader}>
                    <Text style={theme.typography.displayMedium}>Issues in {userCity}</Text>
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
                                <View style={[styles.cardImage, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Feather name="image" size={32} color="#9CA3AF" />
                                    <Text style={{ color: '#6B7280', marginTop: 8, fontWeight: '500' }}>No Image Attached</Text>
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
                                    <View style={styles.upvoteContainer}>
                                        <TouchableOpacity style={styles.iconBtn}>
                                            <Feather name="arrow-up" size={20} color="#878A8C" />
                                        </TouchableOpacity>
                                        <Text style={styles.upvoteText}>{item.metrics?.upvotes || 0}</Text>
                                        <TouchableOpacity style={styles.iconBtn}>
                                            <Feather name="arrow-down" size={20} color="#878A8C" />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity style={styles.actionBtn}>
                                        <Feather name="message-square" size={18} color="#878A8C" style={styles.actionIcon} />
                                        <Text style={styles.actionText}>{item.metrics?.commentCount || 0} Comments</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                                        try {
                                            await Share.share({ message: `Check out this civic issue on Fill-A-Hole: ${item.title}` });
                                        } catch (error) {
                                            console.error('Error sharing:', error);
                                        }
                                    }}>
                                        <Feather name="share-2" size={18} color="#878A8C" style={styles.actionIcon} />
                                        <Text style={styles.actionText}>Share</Text>
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
    container: { flex: 1, backgroundColor: '#F4F6F8' }, // Lighter, modern off-white background
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        zIndex: 10
    },
    greeting: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
    location: { color: '#687076', marginTop: 4, fontSize: 13, fontWeight: '500' },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    feedContainer: { flex: 1 },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'transparent'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.3
    },
    seeAll: { color: theme.colors.primaryGreen, fontWeight: '700', fontSize: 14 },

    listContent: { paddingBottom: 110, paddingHorizontal: 16 },

    issueCard: {
        backgroundColor: '#FFFFFF',
        marginBottom: 20,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        overflow: 'hidden'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    authorAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    authorName: { fontWeight: '700', fontSize: 14, color: '#111827' },
    timeAgo: { color: '#6B7280', fontSize: 12, marginTop: 2, fontWeight: '500' },

    cardImage: { width: '100%', height: 240 },
    cardContent: { padding: 16 },
    cardTitle: {
        fontWeight: '800',
        fontSize: 17,
        marginBottom: 12,
        flex: 1,
        marginRight: 12,
        lineHeight: 24,
        color: '#111827',
        letterSpacing: -0.4
    },

    badge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 2
    },
    badgeText: { color: theme.colors.primaryGreen, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

    actionRow: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        alignItems: 'center'
    },
    upvoteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 100,
        paddingHorizontal: 6,
        paddingVertical: 4,
        marginRight: 16
    },
    iconBtn: { padding: 6 },
    upvoteText: { fontWeight: '700', color: '#374151', fontSize: 14, marginHorizontal: 6 },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 100,
        marginRight: 12
    },
    actionIcon: { marginRight: 6 },
    actionText: { fontWeight: '700', color: '#4B5563', fontSize: 13 }
});
