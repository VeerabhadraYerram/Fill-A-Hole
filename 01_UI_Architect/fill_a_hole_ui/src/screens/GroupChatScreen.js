import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, FlatList,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator
} from 'react-native';
import { theme } from '../core/theme';
import { db, auth } from '../core/firebaseConfig';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    serverTimestamp, doc, updateDoc, getDoc
} from 'firebase/firestore';

export default function GroupChatScreen({ navigation, route }) {
    const { groupId, groupName } = route.params || {};
    const [msg, setMsg] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [userName, setUserName] = useState('You');
    const flatListRef = useRef(null);
    const currentUser = auth.currentUser;

    // Load current user's display name
    useEffect(() => {
        if (!currentUser) return;
        getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
            if (snap.exists() && snap.data().displayName) {
                setUserName(snap.data().displayName.split(' ')[0]);
            }
        });
    }, []);

    // Load group members count
    useEffect(() => {
        if (!groupId) return;
        getDoc(doc(db, 'groups', groupId)).then(snap => {
            if (snap.exists()) {
                setMemberCount((snap.data().members || []).length);
            }
        });
    }, [groupId]);

    // Subscribe to messages
    useEffect(() => {
        if (!groupId) { setLoading(false); return; }
        const q = query(
            collection(db, 'groups', groupId, 'messages'),
            orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
            const msgs = [];
            snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
            setMessages(msgs);
            setLoading(false);
            // Scroll to bottom on new messages
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }, err => { console.error(err); setLoading(false); });
        return () => unsub();
    }, [groupId]);

    const sendMessage = async () => {
        const text = msg.trim();
        if (!text || !groupId) return;
        setSending(true);
        setMsg('');
        try {
            const uid = currentUser?.uid || 'anonymous';
            // Add message to subcollection
            await addDoc(collection(db, 'groups', groupId, 'messages'), {
                text,
                senderId: uid,
                senderName: userName,
                createdAt: serverTimestamp(),
            });
            // Update group's last message for preview
            await updateDoc(doc(db, 'groups', groupId), {
                lastMessage: text,
                lastSender: userName,
                updatedAt: serverTimestamp(),
            });
        } catch (e) {
            console.error('Send error:', e);
        }
        setSending(false);
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item, index }) => {
        if (item.isSystem) {
            return (
                <View style={styles.sysMsgContainer}>
                    <Text style={styles.sysMsg}>{item.text}</Text>
                </View>
            );
        }
        const isMe = item.senderId === currentUser?.uid;
        // Group consecutive messages from same sender
        const prevItem = messages[index - 1];
        const showSenderName = !isMe && item.senderId !== prevItem?.senderId;

        return (
            <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
                {!isMe && (
                    <View style={styles.avatarSmall}>
                        <Text style={{ fontSize: 10 }}>
                            {(item.senderName || '?')[0].toUpperCase()}
                        </Text>
                    </View>
                )}
                <View style={{ maxWidth: '75%' }}>
                    {showSenderName && (
                        <Text style={styles.senderName}>{item.senderName}</Text>
                    )}
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextOther}>
                            {item.text}
                        </Text>
                        <Text style={[styles.timeText, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: '#AAA' }]}>
                            {formatTime(item.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={{ fontSize: 22 }}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{groupName || 'Group Chat'}</Text>
                    <Text style={styles.headerSubtitle}>
                        {memberCount > 0 ? `${memberCount} member${memberCount !== 1 ? 's' : ''}` : 'Open group'}
                    </Text>
                </View>
                <View style={styles.onlineDot} />
            </View>

            {/* Messages */}
            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primaryGreen} style={{ flex: 1 }} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messageList}
                    renderItem={renderMessage}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <Text style={{ fontSize: 40 }}>👋</Text>
                            <Text style={styles.emptyChatText}>No messages yet</Text>
                            <Text style={styles.emptyChatSub}>Be the first to say something!</Text>
                        </View>
                    }
                />
            )}

            {/* Input Bar */}
            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={msg}
                    onChangeText={setMsg}
                    multiline
                    maxLength={500}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!msg.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={sendMessage}
                    disabled={!msg.trim() || sending}
                >
                    {sending
                        ? <ActivityIndicator size="small" color="white" />
                        : <Text style={styles.sendIcon}>➤</Text>
                    }
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingTop: 48, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE', elevation: 2 },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
    headerSubtitle: { fontSize: 12, color: theme.colors.primaryGreen, marginTop: 1 },
    onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primaryGreen, marginLeft: 8 },
    messageList: { padding: 16, paddingBottom: 8 },
    sysMsgContainer: { alignItems: 'center', marginVertical: 12 },
    sysMsg: { backgroundColor: 'rgba(0,0,0,0.08)', color: '#666', fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    bubbleWrapper: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
    bubbleWrapperMe: { justifyContent: 'flex-end' },
    avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
    senderName: { fontSize: 11, fontWeight: '700', color: theme.colors.primaryGreen, marginBottom: 3, marginLeft: 2 },
    bubble: { padding: 12, borderRadius: 18, marginBottom: 2 },
    bubbleOther: { backgroundColor: 'white', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05 },
    bubbleMe: { backgroundColor: theme.colors.primaryGreen, borderBottomRightRadius: 4 },
    bubbleTextOther: { color: '#1A1A1A', fontSize: 14, lineHeight: 20 },
    bubbleTextMe: { color: 'white', fontSize: 14, lineHeight: 20 },
    timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    inputArea: { flexDirection: 'row', padding: 8, paddingHorizontal: 12, backgroundColor: 'white', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#EEE' },
    input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, fontSize: 15, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primaryGreen, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { backgroundColor: '#CCC' },
    sendIcon: { color: 'white', fontSize: 18 },
    emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyChatText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 12 },
    emptyChatSub: { color: '#888', marginTop: 4 },
});
