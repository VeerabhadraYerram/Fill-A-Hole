import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../core/theme';
import { db } from '../core/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

export const QuestionCard = ({ label, type = 'text', placeholder, options = [], value, onChange }) => {

    const toggleOption = (opt) => {
        let current = Array.isArray(value) ? value : [];
        if (current.includes(opt)) {
            onChange(current.filter(o => o !== opt));
        } else {
            onChange([...current, opt]);
        }
    };

    const handlePhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll permissions needed');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            base64: true
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            onChange('data:image/jpeg;base64,' + result.assets[0].base64.substring(0, 100) + '...');
            Alert.alert("Success", "ID Proof uploaded successfully!");
        }
    };

    return (
        <View style={styles.qCard}>
            <Text style={styles.qLabel}>{label}</Text>
            {type === 'text' && (
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    value={value || ''}
                    onChangeText={onChange}
                />
            )}
            {type === 'multiple-choice' && (
                <View style={styles.optionsContainer}>
                    {options.map((opt, i) => {
                        const isSelected = Array.isArray(value) && value.includes(opt);
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[styles.optionBtn, isSelected && { backgroundColor: theme.colors.primaryGreen }]}
                                onPress={() => toggleOption(opt)}
                            >
                                <Text style={[styles.optionText, isSelected && { color: 'white' }]}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
            {type === 'photo' && (
                <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePhoto}>
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>{value ? '✅' : '📸'}</Text>
                    <Text style={{ color: '#666' }}>{value ? 'ID Proof Uploaded!' : 'Tap to upload ID proof'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export const FormRenderer = ({ schema = [], postId }) => {
    const [formData, setFormData] = useState({});
    const navigation = useNavigation();

    const handleUpdate = (label, val) => {
        setFormData(prev => ({ ...prev, [label]: val }));
    };

    const handleSubmit = async () => {
        try {
            await addDoc(collection(db, 'volunteer_applications'), {
                postId: postId || 'General',
                applicationData: formData,
                status: 'Under Review',
                submittedAt: serverTimestamp()
            });
            Alert.alert("Success! 🎉", "Your volunteer application has been submitted to the NGO.");
            navigation.goBack();
        } catch (e) {
            Alert.alert("Error", "Could not submit form.");
            console.error(e);
        }
    };

    return (
        <View style={styles.formRenderer}>
            {schema.map((item, index) => (
                <QuestionCard
                    key={index}
                    {...item}
                    value={formData[item.label]}
                    onChange={(val) => handleUpdate(item.label, val)}
                />
            ))}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Submit Application</Text>
            </TouchableOpacity>
        </View>
    );
};

export const DynamicFormBuilder = ({ postId }) => {
    const [fields, setFields] = useState([]);
    const [formTitle, setFormTitle] = useState('');
    const [volunteerTarget, setVolunteerTarget] = useState('');
    const navigation = useNavigation();

    const addField = (type) => {
        const newField = {
            id: `field_${Date.now()}`,
            type: type,
            label: "",
            options: type === 'multiple-choice' ? ['Option 1'] : [],
            required: true
        };
        setFields([...fields, newField]);
    };

    const updateFieldLabel = (id, text) => {
        setFields(fields.map(f => f.id === id ? { ...f, label: text } : f));
    };

    const updateFieldOptions = (id, text) => {
        setFields(fields.map(f => f.id === id ? { ...f, options: text.split(',').map(s => s.trim()) } : f));
    };

    const handlePostForm = async () => {
        if (!formTitle.trim() || !volunteerTarget.trim()) {
            Alert.alert("Missing Details", "Please provide a Form Title and Volunteer Target.");
            return;
        }
        try {
            await setDoc(doc(db, 'ngo_forms', postId || 'General'), {
                formTitle,
                volunteerTarget: parseInt(volunteerTarget, 10),
                schema: fields,
                createdAt: serverTimestamp()
            });
            Alert.alert("Success", "Form posted successfully!");
            if (navigation.canGoBack()) navigation.goBack();
        } catch (e) {
            Alert.alert("Error", "Could not post form.");
            console.error(e);
        }
    };

    return (
        <View style={styles.builderContainer}>
            <Text style={styles.builderTitle}>Create NGO Application Form</Text>

            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="Form Title (e.g., Park Cleanup App)" value={formTitle} onChangeText={setFormTitle} />
            <TextInput style={[styles.input, { marginBottom: 16 }]} placeholder="Volunteer Target (e.g., 5)" value={volunteerTarget} onChangeText={setVolunteerTarget} keyboardType="numeric" />

            <View style={styles.builderToolbar}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addField('text')}><Text style={styles.toolText}>+ Text Field</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addField('multiple-choice')}><Text style={styles.toolText}>+ Multiple Choice</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addField('photo')}><Text style={styles.toolText}>+ Photo Upload</Text></TouchableOpacity>
            </View>

            <ScrollView style={styles.builderCanvas}>
                {fields.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>Add your first field above to start building the form!</Text>
                ) : (
                    fields.map((field, index) => (
                        <View key={field.id} style={styles.builderItem}>
                            <Text style={{ fontWeight: 'bold' }}>Q{index + 1}: {field.type.toUpperCase()}</Text>
                            <TextInput
                                style={styles.builderInput}
                                placeholder={`Enter question title...`}
                                value={field.label}
                                onChangeText={(text) => updateFieldLabel(field.id, text)}
                            />
                            {field.type === 'multiple-choice' && (
                                <TextInput
                                    style={[styles.builderInput, { marginTop: 4, fontStyle: 'italic', fontSize: 12 }]}
                                    placeholder={`Comma-separated options (e.g., Shovel, Cement)`}
                                    value={field.options.join(', ')}
                                    onChangeText={(text) => updateFieldOptions(field.id, text)}
                                />
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            <TouchableOpacity style={[styles.submitBtn, { marginTop: 16 }]} onPress={handlePostForm}>
                <Text style={styles.submitBtnText}>Post Form</Text>
            </TouchableOpacity>
        </View>
    );
};

export const ApplicationStatusWizard = ({ currentStep }) => {
    const steps = ['Applied', 'Under Review', 'Accepted'];
    const activeIndex = steps.indexOf(currentStep) !== -1 ? steps.indexOf(currentStep) : 0;

    return (
        <View style={styles.wizardContainer}>
            {steps.map((step, index) => {
                const isActive = index <= activeIndex;
                const isLast = index === steps.length - 1;
                return (
                    <View key={step} style={styles.stepWrapper}>
                        <View style={styles.stepIndicator}>
                            <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                                {isActive && <Text style={{ color: 'white', fontSize: 10 }}>✓</Text>}
                            </View>
                            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step}</Text>
                        </View>
                        {!isLast && <View style={[styles.stepLine, isActive && styles.stepLineActive]} />}
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    qCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
    qLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 12, color: '#333' },
    input: { borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, fontSize: 14 },
    optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.primaryGreen, backgroundColor: 'rgba(0, 200, 83, 0.05)' },
    optionText: { color: theme.colors.primaryGreen, fontWeight: 'bold' },
    photoUploadBtn: { height: 100, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CCC', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
    formRenderer: { paddingVertical: 16 },
    submitBtn: { backgroundColor: theme.colors.primaryGreen, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    builderContainer: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#DDD' },
    builderTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 16 },
    builderToolbar: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    toolBtn: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    toolText: { color: 'white', fontSize: 12 },
    builderCanvas: { flex: 1 },
    builderItem: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 8, elevation: 1 },
    builderInput: { borderBottomWidth: 1, borderBottomColor: '#CCC', marginTop: 8, paddingVertical: 4 },
    wizardContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 16 },
    stepWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    stepIndicator: { alignItems: 'center', width: 60 },
    stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    stepCircleActive: { backgroundColor: theme.colors.primaryGreen },
    stepLabel: { fontSize: 10, color: '#999', textAlign: 'center' },
    stepLabelActive: { color: theme.colors.primaryGreen, fontWeight: 'bold' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: -10, marginTop: -16 },
    stepLineActive: { backgroundColor: theme.colors.primaryGreen },
});
