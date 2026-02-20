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

                <View style={styles.menuSection}>
                    <MenuItem title="My Badges & Rewards" icon="🏆" />
                    <MenuItem title="My Posts" icon="📝" />
                    <MenuItem title="Volunteer History" icon="🤝" />
                    <MenuItem title="Settings" icon="⚙️" />
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

const MenuItem = ({ title, icon }) => (
    <TouchableOpacity style={styles.menuItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuTitle}>{title}</Text>
        </View>
        <Text style={{ color: '#999' }}>›</Text>
    </TouchableOpacity>
);

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
    menuSection: { backgroundColor: 'white', borderRadius: 12, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, marginBottom: 24 },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
    menuIcon: { fontSize: 20, marginRight: 16 },
    menuTitle: { fontSize: 16, fontWeight: '500' },
    logoutBtn: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
    logoutBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
});
