import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../core/theme';
import { VerificationBadge } from '../components/TrustAIComponents';

const SAMPLE_ISSUES = [
    { id: '1', title: 'Massive Pothole', location: 'MG Road', category: 'Infrastructure', trustScore: 98 },
    { id: '2', title: 'Broken Streetlight', location: 'Park Ave', category: 'Safety', trustScore: 85 },
    { id: '3', title: 'Overflowing Garbage', location: 'Market Street', category: 'Cleanliness', trustScore: 40 },
    { id: '4', title: 'Fallen Tree Branch', location: '4th Cross Road', category: 'Infrastructure', trustScore: 95 },
];

export default function IssuesListScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredIssues = SAMPLE_ISSUES.filter(issue =>
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.issueCard} onPress={() => navigation.navigate('PostDetail')}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <VerificationBadge score={item.trustScore} />
            </View>
            <Text style={styles.cardSub}>{item.category} • {item.location}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
                    <Text style={{ fontSize: 24 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Local Issues</Text>
            </View>

            <View style={styles.searchContainer}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by title, location, or keyword..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredIssues}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No issues found matching "{searchQuery}"</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 16, paddingHorizontal: 16, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1 },
    searchInput: { flex: 1, height: 48, fontSize: 16 },
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    issueCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { fontWeight: 'bold', fontSize: 16, flex: 1, marginRight: 8 },
    cardSub: { color: '#666', marginTop: 8, fontSize: 14 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999' }
});
