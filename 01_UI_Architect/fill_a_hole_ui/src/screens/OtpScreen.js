import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../core/theme';

export default function OtpScreen({ navigation }) {
    const [otp, setOtp] = useState(['', '', '', '']);
    const inputs = useRef([]);

    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < 3) {
            inputs.current[index + 1].focus();
        }
    };

    const handleVerify = () => {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
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
