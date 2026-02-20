import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../core/theme';

export default function ProfileScreen({ navigation }) {
    const handleLogout = () => {
        navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <View style={styles.profileCard}>
                    <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>M Koushik</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.levelBadge}><Text style={styles.levelText}>Level 4 Civic Hero</Text></View>
                            <Text style={styles.streakText}>🔥 12 day streak</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <StatBox num="12" label="Reported" />
                    <StatBox num="5" label="Completed" />
                    <StatBox num="24" label="Helped" />
                    <StatBox num="1k" label="Coins" />
                </View>

                <View style={styles.impactCard}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>My Impact Zone</Text>
                    <View style={styles.impactMapPlaceholder}>
                        <Text style={{ color: '#666' }}>Impact Map Visualization</Text>
                    </View>
                </View>

                <View style={styles.badgeSection}>
                    <Text style={styles.sectionTitle}>Earned Badges</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
                        <BadgeCard icon="🔰" title="First Report" date="Feb 1" />
                        <BadgeCard icon="🌟" title="Top Helper" date="Feb 12" />
                        <BadgeCard icon="🏆" title="Civic Hero" date="Feb 18" />
                        <BadgeCard icon="📸" title="Eagle Eye" date="Feb 20" />
                    </ScrollView>
                </View>

                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Contributions History</Text>
                    <HistoryItem type="reported" title="Reported massive pothole" location="MG Road" date="Today, 10:30 AM" status="Pending" />
                    <HistoryItem type="volunteered" title="Joined clean-up drive" location="Central Park" date="Yesterday" status="Completed" />
                    <HistoryItem type="donated" title="Donated ₹500 for materials" location="Streetlight Fix" date="Feb 18" status="Processed" />
                    <HistoryItem type="reported" title="Reported broken pipe" location="Main Street" date="Feb 12" status="Resolved" />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const StatBox = ({ num, label }) => (
    <View style={styles.statBox}>
        <Text style={styles.statNum}>{num}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const BadgeCard = ({ icon, title, date }) => (
    <View style={styles.badgeContainer}>
        <View style={styles.badgeCircle}>
            <Text style={styles.badgeIcon}>{icon}</Text>
        </View>
        <Text style={styles.badgeTitle}>{title}</Text>
        <Text style={styles.badgeDate}>{date}</Text>
    </View>
);

const HistoryItem = ({ type, title, location, date, status }) => {
    const isReported = type === 'reported';
    return (
        <View style={styles.historyItem}>
            <View style={[styles.historyIconBg, { backgroundColor: isReported ? '#E3F2FD' : '#E8F5E9' }]}>
                <Text style={{ fontSize: 18 }}>{isReported ? '📢' : type === 'donated' ? '💳' : '🤝'}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>{title}</Text>
                <Text style={styles.historySub}>{location} • {date}</Text>
            </View>
            <View style={[styles.statusBadge, status === 'Resolved' || status === 'Completed' ? styles.statusSuccess : styles.statusPending]}>
                <Text style={[styles.statusText, status === 'Resolved' || status === 'Completed' ? styles.statusSuccessText : styles.statusPendingText]}>{status}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 16, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1 },
    avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16 },
    name: { fontSize: 20, fontWeight: 'bold' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    levelBadge: { backgroundColor: 'rgba(0, 200, 83, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
    levelText: { color: theme.colors.primaryGreen, fontWeight: 'bold', fontSize: 12 },
    streakText: { fontSize: 12, fontWeight: 'bold' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    statBox: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1 },
    statNum: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primaryGreen },
    statLabel: { fontSize: 10, color: '#666', marginTop: 4 },
    impactCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1 },
    impactMapPlaceholder: { height: 120, backgroundColor: '#EEE', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
    badgeSection: { marginBottom: 24 },
    badgeScroll: { paddingBottom: 8 },
    badgeContainer: { alignItems: 'center', marginRight: 16, width: 80 },
    badgeCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 2 },
    badgeIcon: { fontSize: 24 },
    badgeTitle: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    badgeDate: { fontSize: 10, color: '#666', marginTop: 2 },
    historySection: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, marginBottom: 24 },
    historyItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    historyIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    historyTitle: { fontWeight: '600', fontSize: 14 },
    historySub: { fontSize: 12, color: '#666', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
    statusPending: { backgroundColor: '#FFF3E0' },
    statusSuccess: { backgroundColor: '#E8F5E9' },
    statusPendingText: { color: '#F57C00', fontSize: 10, fontWeight: 'bold' },
    statusSuccessText: { color: theme.colors.primaryGreen, fontSize: 10, fontWeight: 'bold' },
    logoutBtn: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
    logoutBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
});
