import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../core/theme';
import { DynamicFormBuilder, FormRenderer, ApplicationStatusWizard } from '../components/NGOFormComponents';
import { db } from '../core/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function NGOFormsScreen({ navigation, route }) {
    const postId = route?.params?.postId || 'General';
    const isAdmin = route?.params?.isAdmin || false;

    const [loading, setLoading] = useState(!isAdmin);
    const [formConfig, setFormConfig] = useState(null);
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        if (isAdmin) return;

        const fetchFormData = async () => {
            try {
                // 1. Fetch Form Schema
                const formRef = doc(db, 'ngo_forms', postId);
                const formSnap = await getDoc(formRef);

                if (!formSnap.exists()) {
                    setLoading(false);
                    return; // Will use fallback or display empty
                }

                const formData = formSnap.data();
                setFormConfig(formData);

                // 2. Check automatic closure logic
                const appsQuery = query(collection(db, 'volunteer_applications'), where('postId', '==', postId));
                const appsSnap = await getDocs(appsQuery);

                if (appsSnap.size >= (formData.volunteerTarget || 999)) {
                    setIsClosed(true);
                }
            } catch (e) {
                console.error("Error fetching form:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchFormData();
    }, [postId, isAdmin]);

    if (isAdmin) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
                        <Text style={{ fontSize: 24 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Form Builder</Text>
                </View>
                <DynamicFormBuilder postId={postId} />
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primaryGreen} />
                <Text style={{ marginTop: 12, color: '#666' }}>Loading application...</Text>
            </View>
        );
    }

    const displayTitle = formConfig?.formTitle || "Volunteer Application";
    const displaySchema = formConfig?.schema || [
        { label: 'Full Name', type: 'text', placeholder: 'Enter your name' },
        { label: 'Available Tools', type: 'multiple-choice', options: ['Shovel', 'Cement Bags', 'Gloves', 'None'] },
        { label: 'Upload ID Proof', type: 'photo' }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
                    <Text style={{ fontSize: 24 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Apply to Volunteer</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View>
                    <Text style={styles.sectionHeading}>My Application Status</Text>
                    <ApplicationStatusWizard currentStep="Applied" />

                    <Text style={[styles.sectionHeading, { marginTop: 24 }]}>{displayTitle}</Text>
                    <Text style={{ color: '#666', marginBottom: 16 }}>Reviewing Organization: Civic Action Group</Text>

                    {isClosed ? (
                        <View style={styles.closedCard}>
                            <Text style={styles.closedCardEmoji}>🛑</Text>
                            <Text style={styles.closedCardTitle}>Application Closed</Text>
                            <Text style={styles.closedCardText}>
                                This application is now closed. The required number of volunteers has been reached. Thank you for your interest!
                            </Text>
                        </View>
                    ) : (
                        <FormRenderer schema={displaySchema} postId={postId} />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    sectionHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#333' },
    closedCard: { backgroundColor: '#FFF3F3', padding: 24, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2', marginTop: 16 },
    closedCardEmoji: { fontSize: 40, marginBottom: 12 },
    closedCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F', marginBottom: 8 },
    closedCardText: { color: '#C62828', textAlign: 'center', lineHeight: 22 }
});
