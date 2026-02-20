import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, ScrollView,
    TouchableOpacity, Alert, ActivityIndicator, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Circle, Marker } from 'react-native-maps';
import { theme } from '../core/theme';
import { db, auth } from '../core/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// ── All available badges ──────────────────────────────────────────────────────
const ALL_BADGES = [
    { id: 'first_report', icon: '🔰', title: 'First Report', desc: 'Submit your first civic issue', xp: 50 },
    { id: 'top_helper', icon: '🌟', title: 'Top Helper', desc: 'Help 5+ people in your area', xp: 100 },
    { id: 'civic_hero', icon: '🏆', title: 'Civic Hero', desc: 'Reach Level 5', xp: 200 },
    { id: 'eagle_eye', icon: '📸', title: 'Eagle Eye', desc: 'Use GeoCamera for 3 reports', xp: 75 },
    { id: 'team_player', icon: '🤝', title: 'Team Player', desc: 'Join 3 volunteer groups', xp: 80 },
    { id: 'impact_maker', icon: '💥', title: 'Impact Maker', desc: 'Get 10 upvotes on a report', xp: 90 },
    { id: 'eco_warrior', icon: '🌿', title: 'Eco Warrior', desc: 'Report 3 garbage issues', xp: 60 },
    { id: 'night_watch', icon: '🌙', title: 'Night Watch', desc: 'Report a streetlight issue', xp: 55 },
    { id: 'road_warrior', icon: '🚧', title: 'Road Warrior', desc: 'Report 3 road issues', xp: 65 },
    { id: 'streak_master', icon: '🔥', title: 'Streak Master', desc: 'Maintain a 7-day streak', xp: 120 },
    { id: 'flood_fighter', icon: '💧', title: 'Flood Fighter', desc: 'Report a flooding issue', xp: 70 },
    { id: 'donation_hero', icon: '💳', title: 'Donation Hero', desc: 'Donate to a civic cause', xp: 110 },
];

// ── Level calculation ─────────────────────────────────────────────────────────
function getLevel(xp = 0) {
    if (xp < 100) return { level: 1, title: 'Newcomer', next: 100 };
    if (xp < 250) return { level: 2, title: 'Civic Starter', next: 250 };
    if (xp < 500) return { level: 3, title: 'Community Guard', next: 500 };
    if (xp < 900) return { level: 4, title: 'Civic Champion', next: 900 };
    if (xp < 1500) return { level: 5, title: 'Civic Hero', next: 1500 };
    return { level: 6, title: '🏅 Legend', next: null };
}

export default function ProfileScreen({ navigation }) {
    const [userData, setUserData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const currentUser = auth.currentUser;

    // Compute earned badges based on stats (deterministic)
    const earnedBadgeIds = React.useMemo(() => {
        if (!userData) return ['first_report'];
        const stats = userData.stats || {};
        const earned = [];
        if ((stats.issuesReported || 0) >= 1) earned.push('first_report');
        if ((stats.peopleHelped || 0) >= 5) earned.push('top_helper');
        const { level } = getLevel(userData.xp || 0);
        if (level >= 5) earned.push('civic_hero');
        if ((stats.geoCamReports || 0) >= 3) earned.push('eagle_eye');
        if ((stats.groupsJoined || 0) >= 3) earned.push('team_player');
        if ((stats.totalUpvotes || 0) >= 10) earned.push('impact_maker');
        if ((stats.garbageReports || 0) >= 3) earned.push('eco_warrior');
        if ((stats.lightReports || 0) >= 1) earned.push('night_watch');
        if ((stats.roadReports || 0) >= 3) earned.push('road_warrior');
        if ((userData.streakDays || 0) >= 7) earned.push('streak_master');
        if ((stats.floodReports || 0) >= 1) earned.push('flood_fighter');
        if ((stats.donations || 0) >= 1) earned.push('donation_hero');
        // Always give at least 2 random badges for new users
        if (earned.length < 2) {
            ['eagle_eye', 'night_watch'].forEach(b => { if (!earned.includes(b)) earned.push(b); });
        }
        return earned;
    }, [userData]);

    useEffect(() => {
        if (!currentUser) { setLoading(false); return; }
        getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
            if (snap.exists()) setUserData(snap.data());
            setLoading(false);
        });
        // Load user's posts
        const q = query(collection(db, 'posts'), where('authorId', '==', currentUser.uid));
        getDocs(q).then(snap => {
            const p = []; snap.forEach(d => p.push({ id: d.id, ...d.data() })); setPosts(p);
        });
    }, []);

    const pickPhoto = async (fromCamera) => {
        try {
            let result;
            if (fromCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
                result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
                result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
            }
            if (!result.canceled && result.assets?.length > 0) {
                const uri = result.assets[0].uri;
                setPhotoLoading(true);
                // In production: upload to Firebase Storage and get download URL
                // For prototype: store local URI in Firestore
                await setDoc(doc(db, 'users', currentUser.uid), { photoURL: uri }, { merge: true });
                setUserData(prev => ({ ...prev, photoURL: uri }));
                setPhotoLoading(false);
            }
        } catch (e) { console.error(e); setPhotoLoading(false); }
    };

    const removePhoto = async () => {
        Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    await setDoc(doc(db, 'users', currentUser.uid), { photoURL: null }, { merge: true });
                    setUserData(prev => ({ ...prev, photoURL: null }));
                }
            }
        ]);
    };

    const showPhotoOptions = () => {
        Alert.alert('Profile Photo', 'Choose an option', [
            { text: '📷 Take Photo', onPress: () => pickPhoto(true) },
            { text: '🖼️ Choose from Gallery', onPress: () => pickPhoto(false) },
            userData?.photoURL ? { text: '🗑️ Remove Photo', onPress: removePhoto, style: 'destructive' } : null,
            { text: 'Cancel', style: 'cancel' },
        ].filter(Boolean));
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout', style: 'destructive', onPress: async () => {
                    try { await signOut(auth); } catch (e) { console.error(e); }
                    navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
                }
            }
        ]);
    };

    if (loading) {
        return <View style={styles.loadingView}><ActivityIndicator size="large" color={theme.colors.primaryGreen} /></View>;
    }

    const name = userData?.displayName || 'Community Member';
    const city = userData?.city || 'Unknown City';
    const xp = userData?.xp || 0;
    const { level, title: levelTitle, next: nextXp } = getLevel(xp);
    const progress = nextXp ? Math.min((xp / nextXp) * 100, 100) : 100;
    const stats = userData?.stats || {};
    const photoURL = userData?.photoURL;
    const avatarUri = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00C853&color=fff&size=200`;

    // Impact zone from user's GPS or posts
    const impactCoord = userData?.location
        ? { latitude: userData.location.latitude, longitude: userData.location.longitude }
        : (posts.length > 0 && posts[0].location)
            ? { latitude: posts[0].location.lat || 12.9716, longitude: posts[0].location.lng || 77.5946 }
            : { latitude: 12.9716, longitude: 77.5946 };

    const earnedBadges = ALL_BADGES.filter(b => earnedBadgeIds.includes(b.id));
    const lockedBadges = ALL_BADGES.filter(b => !earnedBadgeIds.includes(b.id));

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Hero Section ─────────────────────── */}
                <View style={styles.hero}>
                    {/* Avatar */}
                    <TouchableOpacity onPress={showPhotoOptions} style={styles.avatarWrapper}>
                        {photoLoading ? (
                            <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEE' }]}>
                                <ActivityIndicator color={theme.colors.primaryGreen} />
                            </View>
                        ) : (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        )}
                        <View style={styles.editBadge}><Text style={{ color: 'white', fontSize: 12 }}>✏️</Text></View>
                    </TouchableOpacity>

                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.cityText}>📍 {city}</Text>

                    {/* Level + XP bar */}
                    <View style={styles.levelRow}>
                        <View style={styles.levelChip}>
                            <Text style={styles.levelChipText}>Lv {level} · {levelTitle}</Text>
                        </View>
                        {userData?.streakDays > 0 && (
                            <Text style={styles.streakText}>🔥 {userData.streakDays}-day streak</Text>
                        )}
                    </View>
                    <View style={styles.xpBarBg}>
                        <View style={[styles.xpBarFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.xpText}>
                        {xp} XP{nextXp ? ` / ${nextXp} XP to Level ${level + 1}` : ' · Max Level! 🎉'}
                    </Text>
                </View>

                {/* ── Stats ──────────────────────────────── */}
                <View style={styles.statsRow}>
                    <StatBox num={stats.issuesReported || posts.length || 0} label="Reported" icon="📢" />
                    <StatBox num={stats.tasksCompleted || 0} label="Completed" icon="✅" />
                    <StatBox num={stats.peopleHelped || 0} label="Helped" icon="🤝" />
                    <StatBox num={stats.civicCoins || 0} label="Coins" icon="🪙" />
                </View>

                {/* ── Impact Zone ─────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>🗺️ My Impact Zone</Text>
                    <Text style={styles.sectionSub}>Area where you've made a difference</Text>
                    <View style={styles.mapWrapper}>
                        <MapView
                            style={styles.impactMap}
                            initialRegion={{
                                latitude: impactCoord.latitude,
                                longitude: impactCoord.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                        >
                            <Circle
                                center={impactCoord}
                                radius={1500}
                                fillColor="rgba(0,200,83,0.15)"
                                strokeColor="rgba(0,200,83,0.6)"
                                strokeWidth={2}
                            />
                            <Marker coordinate={impactCoord} title={name} description={`${posts.length} reports in this area`} />
                        </MapView>
                        <View style={styles.impactOverlay}>
                            <Text style={styles.impactStat}>{posts.length} report{posts.length !== 1 ? 's' : ''} in your zone</Text>
                        </View>
                    </View>
                </View>

                {/* ── Earned Badges ────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>🏅 Earned Badges</Text>
                    <Text style={styles.sectionSub}>{earnedBadges.length} of {ALL_BADGES.length} unlocked</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                        {earnedBadges.map(b => (
                            <TouchableOpacity key={b.id} style={styles.badgeCard} onPress={() => setSelectedBadge(b)}>
                                <View style={styles.badgeCircle}>
                                    <Text style={{ fontSize: 26 }}>{b.icon}</Text>
                                </View>
                                <Text style={styles.badgeTitle}>{b.title}</Text>
                                <Text style={styles.badgeXp}>+{b.xp} XP</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Locked Badges ────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>🔒 Locked Badges</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                        {lockedBadges.map(b => (
                            <TouchableOpacity key={b.id} style={styles.badgeCard} onPress={() => setSelectedBadge(b)}>
                                <View style={[styles.badgeCircle, { backgroundColor: '#F0F0F0' }]}>
                                    <Text style={{ fontSize: 26, opacity: 0.3 }}>{b.icon}</Text>
                                </View>
                                <Text style={[styles.badgeTitle, { color: '#BBB' }]}>{b.title}</Text>
                                <Text style={[styles.badgeXp, { color: '#CCC' }]}>+{b.xp} XP</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Contributions History ─────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📋 Recent Reports</Text>
                    {posts.length === 0 ? (
                        <Text style={{ color: '#888', marginTop: 8 }}>No reports yet. Go report your first civic issue! 🏘️</Text>
                    ) : (
                        posts.slice(0, 5).map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={styles.historyItem}
                                onPress={() => navigation.navigate('PostDetail', { postId: p.id })}
                            >
                                <View style={styles.historyIcon}><Text>📢</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.historyTitle} numberOfLines={1}>{p.title}</Text>
                                    <Text style={styles.historySub}>{p.category} · {p.location?.lat?.toFixed(3) || '—'}</Text>
                                </View>
                                <View style={[styles.statusBadge, p.status === 'resolved' ? styles.statusSuccess : styles.statusPending]}>
                                    <Text style={[styles.statusText, p.status === 'resolved' ? styles.statusSuccessText : styles.statusPendingText]}>
                                        {p.status === 'resolved' ? 'Resolved' : 'Open'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>🚪 Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Badge Detail Modal */}
            <Modal visible={!!selectedBadge} animationType="fade" transparent onRequestClose={() => setSelectedBadge(null)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedBadge(null)}>
                    <View style={styles.modalCard}>
                        <Text style={{ fontSize: 52, textAlign: 'center', marginBottom: 12 }}>{selectedBadge?.icon}</Text>
                        <Text style={styles.modalTitle}>{selectedBadge?.title}</Text>
                        <Text style={styles.modalDesc}>{selectedBadge?.desc}</Text>
                        <View style={styles.xpChip}>
                            <Text style={styles.xpChipText}>+{selectedBadge?.xp} XP Reward</Text>
                        </View>
                        {earnedBadgeIds.includes(selectedBadge?.id)
                            ? <Text style={styles.earnedText}>✅ You've earned this badge!</Text>
                            : <Text style={styles.lockedText}>🔒 Complete the requirement to unlock</Text>
                        }
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────
const StatBox = ({ num, label, icon }) => (
    <View style={styles.statBox}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <Text style={styles.statNum}>{num}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingBottom: 100 },

    // Hero
    hero: { backgroundColor: 'white', alignItems: 'center', paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    avatarWrapper: { position: 'relative', marginBottom: 12 },
    avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: theme.colors.primaryGreen },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.colors.primaryGreen, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    name: { fontSize: 22, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 },
    cityText: { color: '#888', fontSize: 13, marginTop: 3, marginBottom: 10 },
    levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    levelChip: { backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    levelChipText: { color: theme.colors.primaryGreen, fontWeight: '800', fontSize: 13 },
    streakText: { fontSize: 13, fontWeight: 'bold', color: '#FF6B00' },
    xpBarBg: { width: '100%', height: 6, backgroundColor: '#EEE', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    xpBarFill: { height: '100%', backgroundColor: theme.colors.primaryGreen, borderRadius: 3 },
    xpText: { fontSize: 12, color: '#888' },

    // Stats
    statsRow: { flexDirection: 'row', margin: 16, gap: 8 },
    statBox: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 14, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
    statNum: { fontSize: 18, fontWeight: '900', color: '#1A1A1A', marginTop: 2 },
    statLabel: { fontSize: 10, color: '#888', marginTop: 2, fontWeight: '600' },

    // Section cards
    sectionCard: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
    sectionSub: { fontSize: 12, color: '#999', marginTop: 2 },

    // Impact map
    mapWrapper: { marginTop: 12, borderRadius: 12, overflow: 'hidden', height: 180 },
    impactMap: { height: 180 },
    impactOverlay: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    impactStat: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    // Badges
    badgeCard: { alignItems: 'center', marginRight: 16, width: 80 },
    badgeCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', marginBottom: 6, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3 },
    badgeTitle: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#1A1A1A' },
    badgeXp: { fontSize: 10, color: theme.colors.primaryGreen, fontWeight: 'bold', marginTop: 1 },

    // History
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
    historyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    historyTitle: { fontWeight: '600', fontSize: 14, color: '#1A1A1A' },
    historySub: { fontSize: 12, color: '#888', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
    statusPending: { backgroundColor: '#FFF3E0' },
    statusSuccess: { backgroundColor: '#E8F5E9' },
    statusText: { fontSize: 10, fontWeight: '800' },
    statusPendingText: { color: '#F57C00' },
    statusSuccessText: { color: theme.colors.primaryGreen },

    // Logout
    logoutBtn: { backgroundColor: '#FFEBEE', marginHorizontal: 16, marginBottom: 40, padding: 16, borderRadius: 14, alignItems: 'center' },
    logoutBtnText: { color: '#D32F2F', fontWeight: '800', fontSize: 15 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 6, textAlign: 'center' },
    modalDesc: { color: '#666', textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 16 },
    xpChip: { backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
    xpChipText: { color: theme.colors.primaryGreen, fontWeight: '800' },
    earnedText: { color: theme.colors.primaryGreen, fontWeight: 'bold', fontSize: 14 },
    lockedText: { color: '#AAA', fontSize: 13 },
});
