import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../core/theme';

export const QuestionCard = ({ label, type = 'text', placeholder, options = [] }) => {
    return (
        <View style={styles.qCard}>
            <Text style={styles.qLabel}>{label}</Text>
            {type === 'text' && (
                <TextInput style={styles.input} placeholder={placeholder} />
            )}
            {type === 'multiple-choice' && (
                <View style={styles.optionsContainer}>
                    {options.map((opt, i) => (
                        <TouchableOpacity key={i} style={styles.optionBtn}>
                            <Text style={styles.optionText}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            {type === 'photo' && (
                <TouchableOpacity style={styles.photoUploadBtn}>
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>📸</Text>
                    <Text style={{ color: '#666' }}>Tap to upload verified photo</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export const FormRenderer = ({ schema = [] }) => {
    return (
        <View style={styles.formRenderer}>
            {schema.map((item, index) => (
                <QuestionCard key={index} {...item} />
            ))}
            <TouchableOpacity style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Submit Application</Text>
            </TouchableOpacity>
        </View>
    );
};

export const DynamicFormBuilder = () => {
    return (
        <View style={styles.builderContainer}>
            <Text style={styles.builderTitle}>Dynamic Form Builder (Admin)</Text>
            <View style={styles.builderToolbar}>
                <TouchableOpacity style={styles.toolBtn}><Text style={styles.toolText}>+ Text Field</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn}><Text style={styles.toolText}>+ Multiple Choice</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn}><Text style={styles.toolText}>+ Photo Upload</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.builderCanvas}>
                <View style={styles.builderItem}>
                    <Text style={{ fontWeight: 'bold' }}>Q1: Multiple Choice</Text>
                    <TextInput style={styles.builderInput} value="What tools can you bring?" />
                </View>
                <View style={styles.builderItem}>
                    <Text style={{ fontWeight: 'bold' }}>Q2: Photo Upload</Text>
                    <TextInput style={styles.builderInput} value="Upload ID Proof" />
                </View>
            </ScrollView>
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
