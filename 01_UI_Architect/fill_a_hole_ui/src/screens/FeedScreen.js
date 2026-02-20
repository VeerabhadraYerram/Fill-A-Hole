import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { theme } from '../core/theme';
import { VerificationBadge } from '../components/TrustAIComponents';

const FeedList = ({ navigation }) => {
    return (
        <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={item => item.toString()}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('PostDetail')}>
                    <View style={styles.postCard}>
                        <Image source={{ uri: 'https://via.placeholder.com/100' }} style={styles.postImage} />
                        <View style={styles.postContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={styles.postTitle}>Huge Pothole causing traffic</Text>
                                <VerificationBadge score={92} />
                            </View>
                            <Text style={styles.postMeta}>📍 1.2 km away • 2 hrs ago</Text>

                            <View style={styles.tagsRow}>
                                <View style={styles.tagSafety}><Text style={styles.tagSafetyText}>Safety</Text></View>
                                <View style={styles.tagCommunity}><Text style={styles.tagCommunityText}>Community Solvable</Text></View>
                            </View>

                            <View style={styles.postFooter}>
                                <Text style={styles.volunteerText}>👥 3 volunteers joined</Text>
                                <Text style={styles.upvoteText}>❤️ 124</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            )}
        />
    );
};

const Tab = createMaterialTopTabNavigator();

export default function FeedScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community Posts</Text>
            </View>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: theme.colors.primaryGreen,
                    tabBarInactiveTintColor: 'gray',
                    tabBarIndicatorStyle: { backgroundColor: theme.colors.primaryGreen },
                    tabBarLabelStyle: { fontWeight: 'bold' }
                }}
            >
                <Tab.Screen name="Nearby" component={FeedList} />
                <Tab.Screen name="Trending" component={FeedList} />
                <Tab.Screen name="All" component={FeedList} />
            </Tab.Navigator>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { paddingTop: 40, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: 'white' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    postCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 } },
    postImage: { width: 100, height: 100, borderRadius: 8 },
    postContent: { flex: 1, marginLeft: 12 },
    postTitle: { fontWeight: 'bold', fontSize: 16, flex: 1, marginRight: 8 },
    postMeta: { color: '#666', fontSize: 12, marginTop: 4 },
    tagsRow: { flexDirection: 'row', marginTop: 8 },
    tagSafety: { backgroundColor: 'rgba(255, 152, 0, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
    tagSafetyText: { color: '#FF9800', fontSize: 10 },
    tagCommunity: { backgroundColor: 'rgba(0, 200, 83, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    tagCommunityText: { color: theme.colors.primaryGreen, fontSize: 10 },
    postFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    volunteerText: { fontSize: 12, fontWeight: 'bold' },
    upvoteText: { color: '#666', fontSize: 12 },
});
