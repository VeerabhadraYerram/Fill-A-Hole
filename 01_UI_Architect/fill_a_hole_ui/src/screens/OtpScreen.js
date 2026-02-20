import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { theme } from '../core/theme';
import { auth, db } from '../core/firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

export default function OtpScreen({ navigation, route }) {
    const { phone } = route.params || {};
    const [otp, setOtp] = useState(['', '', '', '']); // Changed back to 4 for mock UI
    const [loading, setLoading] = useState(false);
    const inputs = useRef([]);

    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < 3) {
            inputs.current[index + 1].focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 4) {
            Alert.alert("Error", "Please enter any 4-digit OTP.");
            return;
        }

        setLoading(true);
        try {
            // Expo Go blocks real SMS verification without native certificates.
            // To ensure the backend tests work, we map the phone number to an Email Auth account in Firebase.
            const fakeEmail = `${phone}@fillahole.com`;
            const fakePassword = `Password${phone}`;

            let user;
            try {
                // Try logging in first
                const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, fakePassword);
                user = userCredential.user;
            } catch (loginError) {
                // If account doesn't exist, create it!
                const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, fakePassword);
                user = userCredential.user;
            }

            // Check if user exists in Firestore, if not create them
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    phone: `+91 ${phone}`,
                    role: 'citizen',
                    level: 1,
                    levelTitle: 'Newcomer',
                    streakDays: 0,
                    stats: {
                        issuesReported: 0,
                        tasksCompleted: 0,
                        peopleHelped: 0,
                        civicCoins: 0
                    },
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp()
                });
            } else {
                await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
            }

            setLoading(false);
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

        } catch (error) {
            console.error("Auth Simulation Error:", error);
            Alert.alert("Error", error.message || "Failed to authenticate.");
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.content}>
                <Text style={theme.typography.displayLarge}>Enter OTP</Text>
                <Text style={[theme.typography.bodyMedium, { marginTop: 8, marginBottom: 48 }]}>
                    Code sent to +91 99999 99999
                </Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={el => inputs.current[index] = el}
                            style={styles.otpInput}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={digit}
                            onChangeText={(text) => handleChange(text, index)}
                        />
                    ))}
                </View>

                <TouchableOpacity style={styles.button} onPress={handleVerify}>
                    <Text style={styles.buttonText}>Verify & Continue</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 24 }}>
                    <Text style={{ textAlign: 'center', color: '#666' }}>Resend Code in 00:30</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 48 },
    otpInput: { width: 60, height: 60, backgroundColor: '#EEEEEE', borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: 'bold' },
    button: { backgroundColor: theme.colors.primaryGreen, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
