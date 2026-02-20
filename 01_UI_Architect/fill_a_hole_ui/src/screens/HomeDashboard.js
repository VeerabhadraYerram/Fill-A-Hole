import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { theme } from '../core/theme';

export default function HomeDashboard() {
    const initialRegion = {
        latitude: 16.5062,
        longitude: 80.6480,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Good morning, Koushik 👋</Text>
                    <Text style={styles.location}>📍 Vijayawada, AP</Text>
                </View>
                <Image style={styles.avatar} source={{ uri: 'https://via.placeholder.com/150' }} />
            </View>

            <View style={styles.mapContainer}>
                <MapView style={styles.map} initialRegion={initialRegion}>
                    <Marker coordinate={{ latitude: 16.5062, longitude: 80.6480 }} pinColor="red" />
                </MapView>
            </View>

            <View style={styles.bottomSheet}>
                <View style={styles.handle} />
                <View style={styles.sheetHeader}>
                    <Text style={theme.typography.displayMedium}>Hot Issues Near You</Text>
                    <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
                    {[1, 2, 3].map((_, idx) => (
                        <View key={idx} style={styles.issueCard}>
                            <Image source={{ uri: 'https://via.placeholder.com/250x120' }} style={styles.cardImage} />
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle} numberOfLines={1}>Massive Pothole on MG Road</Text>
                                <View style={styles.cardMeta}>
                                    <Text style={styles.cardDistance}>1.2 km away</Text>
                                    <Text style={styles.cardUpvotes}>❤️ 124</Text>
                                </View>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Community Solvable</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 40, backgroundColor: 'white' },
    greeting: { fontSize: 18, fontWeight: 'bold' },
    location: { color: '#666', marginTop: 4, fontSize: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    mapContainer: { height: '40%' },
    map: { width: '100%', height: '100%' },
    bottomSheet: { flex: 1, backgroundColor: '#F8F9FA', marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1 },
    handle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
    seeAll: { color: theme.colors.primaryGreen, fontWeight: 'bold' },
    cardsScroll: { paddingLeft: 24 },
    issueCard: { width: 250, backgroundColor: 'white', borderRadius: 12, marginRight: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, marginBottom: 20 },
    cardImage: { width: '100%', height: 120, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    cardContent: { padding: 12 },
    cardTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    cardDistance: { color: '#666', fontSize: 12 },
    cardUpvotes: { color: '#666', fontSize: 12 },
    badge: { backgroundColor: 'rgba(0, 200, 83, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
    badgeText: { color: theme.colors.primaryGreen, fontSize: 10, fontWeight: 'bold' },
});
