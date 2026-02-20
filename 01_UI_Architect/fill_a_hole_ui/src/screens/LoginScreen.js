import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../core/theme';
import { auth, db } from '../core/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Required", "Please enter both email and password.");
            return;
        }
        if (password.length < 7) {
            Alert.alert("Invalid Password", "Password must be at least 7 characters long.");
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                // Login Flow
                const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
                const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
                setLoading(false);

                if (!userDoc.exists() || !userDoc.data()?.profileComplete) {
                    navigation.reset({ index: 0, routes: [{ name: 'Registration' }] });
                } else {
                    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
                }
            } else {
                // Sign Up Flow
                const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

                // Initialize user document in Firestore
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    email: email.trim(),
                    role: 'citizen',
                    level: 1,
                    xp: 0,
                    streakDays: 0,
                    stats: {
                        issuesReported: 0,
                        tasksCompleted: 0,
                        peopleHelped: 0,
                        civicCoins: 0,
                    },
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp(),
                    profileComplete: false,
                });

                setLoading(false);
                Alert.alert("Success", "Account created successfully! Please complete your profile.", [
                    { text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Registration' }] }) }
                ]);
            }
        } catch (error) {
            console.error("Auth Error:", error);
            let msg = "Authentication failed. Please try again.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                msg = "Invalid email or password.";
            } else if (error.code === 'auth/email-already-in-use') {
                msg = "This email is already registered. Please sign in.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Please enter a valid email address.";
            } else if (error.code === 'auth/weak-password') {
                msg = "Password is too weak. Please use a stronger password.";
            }
            Alert.alert("Error", msg);
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.content}>

                <Text style={theme.typography.displayLarge}>
                    {isLogin ? "Welcome back" : "Create an account"}
                </Text>
                <Text style={[theme.typography.bodyMedium, { marginTop: 8, marginBottom: 40 }]}>
                    {isLogin
                        ? "Sign in to continue making an impact."
                        : "Join the community and start fixing your neighborhood."}
                </Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={isLogin ? "Password" : "Password (min 7 characters)"}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && { opacity: 0.7 }]}
                    onPress={handleAuth}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={styles.buttonText}>{isLogin ? "Sign In" : "Sign Up"}</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.toggleContainer}>
                    <Text style={styles.toggleText}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                    </Text>
                    <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); }}>
                        <Text style={styles.toggleLink}>
                            {isLogin ? "Sign Up" : "Sign In"}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
        paddingHorizontal: 16, height: 56, marginBottom: 16,
        backgroundColor: 'white'
    },
    inputIcon: { fontSize: 18, marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#1A1A1A' },
    button: {
        backgroundColor: theme.colors.primaryGreen,
        height: 56, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginTop: 16,
    },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    toggleContainer: {
        flexDirection: 'row', justifyContent: 'center', marginTop: 32
    },
    toggleText: { color: '#666', fontSize: 14 },
    toggleLink: { color: theme.colors.primaryGreen, fontWeight: 'bold', fontSize: 14 }
});
