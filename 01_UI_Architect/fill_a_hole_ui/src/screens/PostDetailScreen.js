import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, TextInput, Linking, Alert } from 'react-native';
import { theme } from '../core/theme';
import { VerificationBadge, AIResourceSuggestionChip } from '../components/TrustAIComponents';
import { db, auth } from '../core/firebaseConfig';
import { doc, onSnapshot, updateDoc, increment, collection, addDoc, query, orderBy, serverTimestamp, where, getDocs, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function PostDetailScreen({ navigation, route }) {
    const { postId } = route.params || {};
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [taskGroupId, setTaskGroupId] = useState(null);
    const [taskGroupName, setTaskGroupName] = useState('');
    const [userVote, setUserVote] = useState(null); // 'up' | 'down' | null

    useEffect(() => {
        if (!postId) return;

        const unsubscribePost = onSnapshot(doc(db, 'posts', postId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPost({ id: docSnap.id, ...data });
                // Determine this user's current vote
                const uid = auth.currentUser?.uid;
                if (uid) {
                    if ((data.upvoters || []).includes(uid)) setUserVote('up');
                    else if ((data.downvoters || []).includes(uid)) setUserVote('down');
                    else setUserVote(null);
                }
            }
        }, (error) => console.error('Firestore Error in PostDetail:', error));

        const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribeComments = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setComments(commentsData);
        }, (error) => console.error("Error fetching comments:", error));

        return () => { unsubscribePost(); unsubscribeComments(); };
    }, [postId]);

    const handleVote = async (val) => {
        if (!postId) return;
        const uid = auth.currentUser?.uid;
        if (!uid) { Alert.alert('Sign in required', 'You must be logged in to vote.'); return; }

        const postRef = doc(db, 'posts', postId);
        const direction = val > 0 ? 'up' : 'down';
        const oppositeDirection = val > 0 ? 'down' : 'up';

        try {
            if (userVote === direction) {
                // Toggle off — remove vote
                await updateDoc(postRef, {
                    [`${direction}voters`]: arrayRemove(uid),
                    'metrics.upvotes': increment(val > 0 ? -1 : 1),
                });
                setUserVote(null);
            } else {
                // Switch or new vote
                const updates = {
                    [`${direction}voters`]: arrayUnion(uid),
                    'metrics.upvotes': increment(val),
                };
                // Remove old vote in opposite direction if exists
                if (userVote === oppositeDirection) {
                    updates[`${oppositeDirection}voters`] = arrayRemove(uid);
                    updates['metrics.upvotes'] = increment(val > 0 ? 2 : -2); // swing both ways
                }
                await updateDoc(postRef, updates);
                setUserVote(direction);
            }
        } catch (error) { console.error('Error voting:', error); }
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || !postId) return;
        try {
            await addDoc(collection(db, 'posts', postId, 'comments'), {
                text: commentText,
                authorId: auth?.currentUser?.uid || "anonymous",
                authorName: auth?.currentUser?.email?.split('@')[0] || "Anonymous User",
                createdAt: serverTimestamp()
            });
            await updateDoc(doc(db, 'posts', postId), { 'metrics.commentCount': increment(1) });
            setCommentText('');
        } catch (error) { console.error("Error adding comment:", error); }
    };

    const handleVolunteer = async () => {
        if (!postId) return;
        try {
            const user = auth.currentUser;
            await updateDoc(doc(db, 'posts', postId), { 'metrics.volunteersCount': increment(1) });

            // ── Find-or-create a group for this task ─────────────────
            const groupsRef = collection(db, 'groups');
            const q = query(groupsRef, where('relatedPostId', '==', postId));
            const snap = await getDocs(q);

            let gId, gName;
            if (!snap.empty) {
                // Group already exists — join it
                const existing = snap.docs[0];
                gId = existing.id;
                gName = existing.data().name;
                // Add user to members if not already in
                const members = existing.data().members || [];
                if (user && !members.includes(user.uid)) {
                    await updateDoc(doc(db, 'groups', gId), {
                        members: [...members, user.uid]
                    });
                }
            } else {
                // Create a new group for this task
                gName = `Task: ${post?.title?.substring(0, 40) || 'Civic Issue'}`;
                const newGroup = await addDoc(groupsRef, {
                    name: gName,
                    relatedPostId: postId,
                    isPublic: true,
                    createdBy: user?.uid || 'system',
                    members: user ? [user.uid] : [],
                    lastMessage: '🤝 Volunteer group created. Coordinate here!',
                    lastSender: 'System',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                gId = newGroup.id;
                // Add a system welcome message
                await addDoc(collection(db, 'groups', gId, 'messages'), {
                    text: `👋 This group was auto-created for volunteers of: "${post?.title}". Coordinate your efforts here!`,
                    senderId: 'system',
                    senderName: 'System',
                    isSystem: true,
                    createdAt: serverTimestamp(),
                });
            }

            setTaskGroupId(gId);
            setTaskGroupName(gName);

            Alert.alert(
                '🎉 Joined!',
                'You are now a volunteer. A group chat has been set up for all volunteers of this task!',
                [
                    { text: 'Open Group Chat', onPress: () => navigation.navigate('GroupChat', { groupId: gId, groupName: gName }) },
                    { text: 'OK' }
                ]
            );
        } catch (error) { console.error('Error volunteering:', error); }
    };

    const handleDonate = () => {
        Alert.alert("Donate", "Donate money flow would go here (Stripe Integration, etc).");
    };

    const openMaps = () => {
        const lat = post.location?.lat || post.location?.latitude || 0;
        const lng = post.location?.lng || post.location?.longitude || 0;
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    if (!post) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#666' }}>Loading issue details...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView>
                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                    <Image source={{ uri: post.mediaUrls[0] }} style={styles.heroImage} />
                ) : (
                    <View style={[styles.heroImage, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: '#888' }}>No Image Attached</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>←</Text>
                </TouchableOpacity>

                <View style={styles.voteContainer}>
                    <TouchableOpacity
                        onPress={() => handleVote(1)}
                        style={[styles.voteBtn, userVote === 'up' && styles.voteBtnActiveUp]}
                    >
                        <Text style={{ fontSize: 20 }}>👍</Text>
                    </TouchableOpacity>
                    <Text style={styles.voteCount}>{post.metrics?.upvotes || 0}</Text>
                    <TouchableOpacity
                        onPress={() => handleVote(-1)}
                        style={[styles.voteBtn, userVote === 'down' && styles.voteBtnActiveDown]}
                    >
                        <Text style={{ fontSize: 20 }}>👎</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>{post.title}</Text>
                    <View style={styles.metaRow}>
                        {post.verificationData?.isVerified != null && (
                            <VerificationBadge score={post.verificationData.trustScore || 0} />
                        )}
                        <View style={[styles.tagSafety, post.category === 'Infrastructure' && { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}><Text style={[styles.tagSafetyText, post.category === 'Infrastructure' && { color: '#F44336' }]}>{post.category}</Text></View>
                        <Text style={styles.authorText}>by {typeof post.authorId === 'string' ? post.authorId.substring(0, 5) : "Anon"}</Text>
                    </View>

                    <View style={styles.geoLinkBox}>
                        <Text style={styles.geoLinkText}>📍 LAT: {Number(post.location?.lat || post.location?.latitude || 0).toFixed(4)} | LNG: {Number(post.location?.lng || post.location?.longitude || 0).toFixed(4)}</Text>
                        <TouchableOpacity onPress={openMaps}><Text style={styles.geoLinkAction}>Open in Maps ↗</Text></TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>
                        {post.description || "No description provided."}
                    </Text>

                    {post.isCommunitySolvable && (
                        <View style={styles.progressCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.primaryGreen, marginRight: 8 }}>🤖</Text>
                                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>AI Resource Estimates</Text>
                            </View>

                            <View style={styles.aiChipsRow}>
                                {post.aiResources && post.aiResources.length > 0 ? (
                                    post.aiResources.map((res, i) => (
                                        <AIResourceSuggestionChip key={i} suggestion={`📦 ${res}`} />
                                    ))
                                ) : (
                                    <>
                                        {post.volunteersNeeded && <AIResourceSuggestionChip suggestion={`👥 ${post.volunteersNeeded} Volunteers`} />}
                                        {post.fundsRequired && <AIResourceSuggestionChip suggestion={`₹${post.fundsRequired} Est. Cost`} />}
                                        {Array.isArray(post.materialsNeeded) && post.materialsNeeded.map((mat, i) => (
                                            <AIResourceSuggestionChip key={i} suggestion={`📦 ${mat}`} />
                                        ))}
                                        {!post.volunteersNeeded && (!post.materialsNeeded || !Array.isArray(post.materialsNeeded)) && (
                                            <Text style={{ color: '#666', fontStyle: 'italic', marginTop: 8 }}>Gemini is analyzing this report...</Text>
                                        )}
                                    </>
                                )}
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                                <Text>Current Progress ({post.metrics?.volunteersCount || 0} Vols)</Text>
                                <Text>{post.metrics?.volunteersCount ? 'In Progress' : '0%'}</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: post.metrics?.volunteersCount ? '30%' : '0%' }]} />
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.volunteerBtn} onPress={() => { handleVolunteer(); navigation.navigate('NGOForms', { postId }); }}>
                        <Text style={styles.volunteerBtnText}>🤝 Apply to Volunteer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.donateBtn} onPress={handleDonate}>
                        <Text style={styles.donateBtnText}>₹ Donate Money</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.chatBtn} onPress={() => {
                        const gId = taskGroupId;
                        const gName = taskGroupName || `Task: ${post.title?.substring(0, 40)}`;
                        if (gId) {
                            navigation.navigate('GroupChat', { groupId: gId, groupName: gName });
                        } else {
                            // Try to find the group first
                            const groupsRef = collection(db, 'groups');
                            getDocs(query(groupsRef, where('relatedPostId', '==', postId))).then(snap => {
                                if (!snap.empty) {
                                    const g = snap.docs[0];
                                    navigation.navigate('GroupChat', { groupId: g.id, groupName: g.data().name });
                                } else {
                                    Alert.alert('No Group Yet', 'Apply to volunteer first to create the group chat for this task.');
                                }
                            });
                        }
                    }}>
                        <Text style={styles.chatBtnText}>💬 Join Group Chat</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Comments ({post.metrics?.commentCount || 0})</Text>

                    {comments.length > 0 ? comments.map(c => (
                        <Comment key={c.id} name={c.authorName} text={c.text} />
                    )) : (
                        <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 16 }}>Be the first to comment!</Text>
                    )}

                    <View style={styles.commentInputRow}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            value={commentText}
                            onChangeText={setCommentText}
                        />
                        <TouchableOpacity style={styles.commentSendBtn} onPress={handleCommentSubmit}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Send</Text>
                        </TouchableOpacity>
                    </View>
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
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8, marginBottom: 16 },
    tagSafety: { backgroundColor: 'rgba(255, 152, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    tagSafetyText: { color: '#FF9800', fontWeight: 'bold', fontSize: 12 },
    authorText: { color: '#666', fontSize: 12 },
    geoLinkBox: { backgroundColor: '#F0F0F0', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    geoLinkText: { fontFamily: 'monospace', fontSize: 12, color: '#333', fontWeight: 'bold' },
    geoLinkAction: { color: '#2196F3', fontWeight: 'bold', fontSize: 12 },
    sectionTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 8, marginTop: 8 },
    description: { lineHeight: 24, color: '#333' },
    progressCard: { backgroundColor: 'rgba(0, 200, 83, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 200, 83, 0.3)', borderRadius: 12, padding: 16, marginVertical: 24 },
    aiChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
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
    commentName: { fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
    voteContainer: { position: 'absolute', top: 180, right: 16, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1 },
    voteBtn: { padding: 8, borderRadius: 20 },
    voteBtnActiveUp: { backgroundColor: 'rgba(0,200,83,0.18)' },
    voteBtnActiveDown: { backgroundColor: 'rgba(244,67,54,0.14)' },

    voteCount: { fontWeight: 'bold', fontSize: 16, marginHorizontal: 4 },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    commentInput: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 12 },
    commentSendBtn: { backgroundColor: theme.colors.primaryGreen, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }
});
