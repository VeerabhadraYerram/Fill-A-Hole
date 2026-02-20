import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../core/theme';

export default function GroupChatScreen({ navigation }) {
    const [msg, setMsg] = useState('');

    const messages = [
        { id: '1', sender: 'System', text: 'You joined the group', isSystem: true },
        { id: '2', sender: 'Ravi', text: 'Hi everyone! I just bought 2 bags of cement.', isMe: false },
        { id: '3', sender: 'Priya', text: 'Awesome Ravi. I will bring water and a shovel.', isMe: false },
        { id: '4', sender: 'Koushik (You)', text: "I can be there at 9 AM tomorrow. Let's get this done!", isMe: true },
    ];

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ fontSize: 24, marginRight: 16 }}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Pothole @ MG Road</Text>
                    <Text style={styles.headerSubtitle}>3 volunteers online</Text>
                </View>
                <TouchableOpacity><Text style={{ fontSize: 24 }}>ℹ️</Text></TouchableOpacity>
            </View>

            <View style={styles.pinned}>
                <Text style={styles.pinnedIcon}>📌</Text>
                <Text style={styles.pinnedText}>Task: Fill pothole by Sunday. Progress: 3/5</Text>
                <TouchableOpacity><Text style={styles.pinnedAction}>View</Text></TouchableOpacity>
            </View>

            <FlatList
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    item.isSystem ? (
                        <View style={styles.sysMsgContainer}>
                            <Text style={styles.sysMsg}>{item.text}</Text>
                        </View>
                    ) : (
                        <View style={[styles.bubbleWrapper, item.isMe ? styles.bubbleWrapperMe : null]}>
                            {!item.isMe && (
                                <View style={styles.avatar}><Text style={{ fontSize: 10 }}>👤</Text></View>
                            )}
                            <View style={[styles.bubble, item.isMe ? styles.bubbleMe : styles.bubbleOther]}>
                                {!item.isMe && <Text style={styles.senderName}>{item.sender}</Text>}
                                <Text style={item.isMe ? { color: 'white' } : { color: '#333' }}>{item.text}</Text>
                            </View>
                        </View>
                    )
                )}
            />

            <View style={styles.inputArea}>
                <TouchableOpacity><Text style={{ fontSize: 24, padding: 8, color: 'grey' }}>📷</Text></TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={msg}
                    onChangeText={setMsg}
                />
                <TouchableOpacity>
                    <Text style={{ fontSize: 24, padding: 8, color: theme.colors.primaryGreen }}>➤</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 16, fontWeight: 'bold' },
    headerSubtitle: { fontSize: 12, color: theme.colors.primaryGreen },
    pinned: { flexDirection: 'row', backgroundColor: '#FFF3E0', padding: 12, alignItems: 'center' },
    pinnedIcon: { marginRight: 8 },
    pinnedText: { flex: 1, color: '#E65100', fontSize: 12, fontWeight: 'bold' },
    pinnedAction: { color: '#E65100', fontSize: 12, fontWeight: 'bold' },
    sysMsgContainer: { alignItems: 'center', marginVertical: 12 },
    sysMsg: { backgroundColor: '#F0F0F0', color: '#666', fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    bubbleWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end', maxWidth: '80%' },
    bubbleWrapperMe: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    bubble: { padding: 12, borderRadius: 16 },
    bubbleOther: { backgroundColor: '#F0F0F0', borderBottomLeftRadius: 0 },
    bubbleMe: { backgroundColor: theme.colors.primaryGreen, borderBottomRightRadius: 0 },
    senderName: { fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 4 },
    inputArea: { flexDirection: 'row', padding: 8, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE' },
    input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 8 },
});
