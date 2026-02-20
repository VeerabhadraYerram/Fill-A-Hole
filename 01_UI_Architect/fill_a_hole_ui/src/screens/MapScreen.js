import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { theme } from '../core/theme';
import { RadarPingMapOverlay } from '../components/GeoFencingComponents';
import { db } from '../core/firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function MapScreen({ navigation }) {
    const [filter, setFilter] = useState('All');
    const [posts, setPosts] = useState([]);
    const filters = ['All', 'Urgent', '< 10 min', 'Infrastructure', 'Safety'];

    useEffect(() => {
        const q = query(collection(db, 'posts'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = [];
            snapshot.forEach((doc) => {
                fetchedPosts.push({ id: doc.id, ...doc.data() });
            });
            setPosts(fetchedPosts);
        }, (error) => {
            console.error("Firestore Error in MapScreen:", error);
        });
        return () => unsubscribe();
    }, []);

    const getPinColor = (post) => {
        if (post.status === 'resolved') return 'green';
        if (post.category === 'Safety') return 'orange';
        if (post.category === 'Cleanliness') return 'blue';
        return 'red'; // Default / Infrastructure
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: 16.5062,
                    longitude: 80.6480,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                clusterColor={theme.colors.primaryGreen}
                showsUserLocation={true}
            >
                <RadarPingMapOverlay coordinate={{ latitude: 16.5062, longitude: 80.6480 }} radius={500} />

                {posts.map(post => {
                    if (!post.location || !post.location.lat || !post.location.lng) return null;
                    // Optional basic filtering based on the top bar
                    if (filter !== 'All' && post.category !== filter) return null;

                    return (
                        <Marker
                            key={post.id}
                            coordinate={{ latitude: post.location.lat, longitude: post.location.lng }}
                            pinColor={getPinColor(post)}
                            title={post.title}
                            description="Tap to view details"
                            onCalloutPress={() => {
                                if (navigation) navigation.navigate('PostDetail', { postId: post.id })
                            }}
                        />
                    );
                })}
            </MapView>

            <View style={styles.searchContainer}>
                <TextInput style={styles.searchInput} placeholder="Search issues or location" />
            </View>

            <View style={styles.bottomSheet}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {filters.map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, filter === f && styles.filterChipActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.legend}>
                    <LegendItem color="red" label="Infrastructure" />
                    <LegendItem color="orange" label="Safety" />
                    <LegendItem color="blue" label="Cleanliness" />
                    <LegendItem color="green" label="Resolved" />
                </View>
            </View>

            <TouchableOpacity style={styles.myLocationBtn}>
                <Text style={styles.locationIcon}>📍</Text>
            </TouchableOpacity>
        </View>
    );
}

const LegendItem = ({ color, label }) => (
    <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    searchContainer: {
        position: 'absolute', top: 50, left: 16, right: 16,
        backgroundColor: 'white', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 12,
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2,
    },
    searchInput: { fontSize: 16 },
    myLocationBtn: {
        position: 'absolute', bottom: 150, right: 16,
        backgroundColor: 'white', width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000'
    },
    locationIcon: { fontSize: 24, color: theme.colors.primaryGreen },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingVertical: 16, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1,
    },
    filterScroll: { paddingHorizontal: 16, marginBottom: 16 },
    filterChip: { backgroundColor: '#F0F0F0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    filterChipActive: { backgroundColor: 'rgba(0, 200, 83, 0.2)' },
    filterText: { color: '#333' },
    filterTextActive: { color: theme.colors.primaryGreen, fontWeight: 'bold' },
    legend: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
    legendLabel: { fontSize: 10, fontWeight: 'bold' },
});
