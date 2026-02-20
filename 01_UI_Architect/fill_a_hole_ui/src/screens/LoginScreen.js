import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../core/theme';

export default function LoginScreen({ navigation }) {
    const [phone, setPhone] = useState('');

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.content}>
                <Text style={theme.typography.displayLarge}>Enter your phone number</Text>
                <Text style={[theme.typography.bodyMedium, { marginTop: 8, marginBottom: 48 }]}>
                    We will send you a 4-digit code to verify your account.
                </Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.prefix}>+91</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="phone-pad"
                        placeholder="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Otp')}
                >
                    <Text style={styles.buttonText}>Send OTP</Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.or}>OR</Text>
                    <View style={styles.divider} />
                </View>

                <TouchableOpacity style={styles.googleButton}>
                    <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 16, height: 56, marginBottom: 24, backgroundColor: 'white' },
    prefix: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
    input: { flex: 1, fontSize: 16 },
    button: { backgroundColor: theme.colors.primaryGreen, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
    divider: { flex: 1, height: 1, backgroundColor: '#ccc' },
    or: { marginHorizontal: 16, color: '#666', fontWeight: 'bold' },
    googleButton: { height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    googleText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});
