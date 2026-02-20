import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../core/theme';

export default function MessagesScreen({ navigation }) {
    const chats = [
        { id: '1', title: 'Pothole @ MG Road', lastMsg: 'Koushik: I will bring the cement tomorrow.', time: '10:42 AM', unread: 3 },
        { id: '2', title: 'Beach Cleanup Drive', lastMsg: 'Priya: Can anyone bring extra gloves?', time: 'Yesterday', unread: 0 },
        { id: '3', title: 'Streetlight Fix - 4th Cross', lastMsg: 'Admin: The NGO has claimed this task.', time: 'Monday', unread: 0 },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
                <TouchableOpacity><Text style={{ fontSize: 24 }}>+</Text></TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <TextInput style={styles.searchInput} placeholder="Search groups or messages" />
            </View>

            <FlatList
                data={chats}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.chatTile} onPress={() => navigation.navigate('GroupChat')}>
                        <View style={styles.avatar}>
                            <Text style={{ color: theme.colors.primaryGreen }}>👥</Text>
                        </View>
                        <View style={styles.chatInfo}>
                            <Text style={styles.chatTitle}>{item.title}</Text>
                            <Text style={styles.chatLastMsg} numberOfLines={1}>{item.lastMsg}</Text>
                        </View>
                        <View style={styles.chatMeta}>
                            <Text style={styles.chatTime}>{item.time}</Text>
                            {item.unread > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>{item.unread}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 40, backgroundColor: 'white' },
    title: { fontSize: 24, fontWeight: 'bold' },
    searchContainer: { padding: 16 },
    searchInput: { backgroundColor: '#F0F0F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
    chatTile: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0, 200, 83, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    chatInfo: { flex: 1, justifyContent: 'center' },
    chatTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    chatLastMsg: { color: '#666' },
    chatMeta: { alignItems: 'flex-end', justifyContent: 'center' },
    chatTime: { color: '#999', fontSize: 12, marginBottom: 4 },
    unreadBadge: { backgroundColor: theme.colors.primaryGreen, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center' },
    unreadText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});
