import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, Alert, ActivityIndicator
} from 'react-native';
import { theme } from '../core/theme';
import { db, auth } from '../core/firebaseConfig';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    serverTimestamp, where, getDocs
} from 'firebase/firestore';

export default function MessagesScreen({ navigation }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);

    // Load groups the current user is part of
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) { setLoading(false); return; }

        const q = query(
            collection(db, 'groups'),
            orderBy('updatedAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            const g = [];
            snap.forEach(doc => {
                const d = doc.data();
                // Show if user is a member or group is public
                if (!d.members || d.members.includes(user.uid) || d.isPublic) {
                    g.push({ id: doc.id, ...d });
                }
            });
            setGroups(g);
            setLoading(false);
        }, (err) => { console.error(err); setLoading(false); });

        return () => unsub();
    }, []);

    const createGroup = async () => {
        if (!newGroupName.trim()) {
            Alert.alert('Required', 'Please enter a group name.');
            return;
        }
        setCreating(true);
        try {
            const user = auth.currentUser;
            const docRef = await addDoc(collection(db, 'groups'), {
                name: newGroupName.trim(),
                createdBy: user?.uid || 'anonymous',
                members: user ? [user.uid] : [],
                isPublic: true,
                lastMessage: '',
                lastSender: '',
                relatedPostId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setShowCreate(false);
            setNewGroupName('');
            navigation.navigate('GroupChat', { groupId: docRef.id, groupName: newGroupName.trim() });
        } catch (e) {
            Alert.alert('Error', 'Could not create group. Please try again.');
            console.error(e);
        }
        setCreating(false);
    };

    const filtered = groups.filter(g =>
        (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (g.lastMessage || '').toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
                    <Text style={styles.createBtnText}>+ New Group</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍  Search groups..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Group List */}
            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primaryGreen} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>💬</Text>
                            <Text style={styles.emptyText}>No groups yet</Text>
                            <Text style={styles.emptySubText}>
                                Create a group or join one from a civic issue post.
                            </Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                                <Text style={styles.emptyBtnText}>+ Create First Group</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.chatTile}
                            onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
                            activeOpacity={0.8}
                        >
                            <View style={styles.avatarCircle}>
                                <Text style={{ fontSize: 22 }}>👥</Text>
                            </View>
                            <View style={styles.chatInfo}>
                                <Text style={styles.chatTitle} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.chatLastMsg} numberOfLines={1}>
                                    {item.lastMessage
                                        ? `${item.lastSender ? item.lastSender + ': ' : ''}${item.lastMessage}`
                                        : 'No messages yet — start the conversation!'}
                                </Text>
                            </View>
                            <View style={styles.chatMeta}>
                                <Text style={styles.chatTime}>{formatTime(item.updatedAt)}</Text>
                                {item.relatedPostId && (
                                    <View style={styles.taskBadge}>
                                        <Text style={styles.taskBadgeText}>Task</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Create Group Modal */}
            <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Create New Group</Text>
                        <Text style={styles.modalSubtitle}>
                            Anyone can join public groups. Groups for civic issues are auto-created
                            when volunteers apply for the same task.
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Group name (e.g. Pothole at MG Road)"
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                            autoFocus
                            autoCapitalize="words"
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, creating && { opacity: 0.6 }]}
                            onPress={createGroup}
                            disabled={creating}
                        >
                            {creating
                                ? <ActivityIndicator size="small" color="white" />
                                : <Text style={styles.modalBtnText}>Create Group</Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowCreate(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                            <Text style={{ color: '#999' }}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    title: { fontSize: 24, fontWeight: '900', color: '#1A1A1A' },
    createBtn: { backgroundColor: theme.colors.primaryGreen, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    searchContainer: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    searchInput: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
    chatTile: { flexDirection: 'row', padding: 16, backgroundColor: 'white', marginTop: 1, alignItems: 'center' },
    avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,200,83,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    chatInfo: { flex: 1 },
    chatTitle: { fontWeight: '700', fontSize: 15, color: '#1A1A1A', marginBottom: 3 },
    chatLastMsg: { color: '#888', fontSize: 13 },
    chatMeta: { alignItems: 'flex-end', marginLeft: 8 },
    chatTime: { color: '#BBB', fontSize: 11, marginBottom: 4 },
    taskBadge: { backgroundColor: 'rgba(0,200,83,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    taskBadgeText: { color: theme.colors.primaryGreen, fontSize: 10, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', padding: 48 },
    emptyIcon: { fontSize: 52, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    emptySubText: { color: '#888', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    emptyBtn: { marginTop: 24, backgroundColor: theme.colors.primaryGreen, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    emptyBtnText: { color: 'white', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
    modalSubtitle: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 20 },
    modalInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
    modalBtn: { backgroundColor: theme.colors.primaryGreen, padding: 16, borderRadius: 12, alignItems: 'center' },
    modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
