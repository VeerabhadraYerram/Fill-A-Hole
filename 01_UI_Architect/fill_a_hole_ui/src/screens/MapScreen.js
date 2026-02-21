import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../core/theme';
import { RadarPingMapOverlay } from '../components/GeoFencingComponents';
import { db, auth } from '../core/firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function MapScreen({ navigation, route }) {
    const [filter, setFilter] = useState('All');
    const [posts, setPosts] = useState([]);
    const [anomalies, setAnomalies] = useState([]);
    const [userLocation, setUserLocation] = useState({ latitude: 16.5062, longitude: 80.6480 }); // Fallback
    const [searchQuery, setSearchQuery] = useState('');
    const mapRef = useRef(null);
    const filters = ['All', 'Urgent', '< 10 min', 'Infrastructure', 'Safety'];

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        })();

        const q = query(collection(db, 'posts'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = [];
            const currentUser = auth.currentUser;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'flagged' && data.authorId !== currentUser?.uid) {
                    return;
                }
                fetchedPosts.push({ id: doc.id, ...data });
            });
            setPosts(fetchedPosts);
        }, (error) => console.error("Firestore Error in MapScreen:", error));

        const anomaliesQuery = query(collection(db, 'sensor_anomalies'));
        const unsubAnomalies = onSnapshot(anomaliesQuery, (snapshot) => {
            const fetched = [];
            snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));

            // Basic Clustering Simulation: Group anomalies close to each other
            // For MVP, we just plot them all if severity > threshold
            const highSeverity = fetched.filter(a => a.severityScore > 0);
            setAnomalies(highSeverity);
        });

        return () => {
            unsubscribe();
            unsubAnomalies();
        };
    }, []);

    useEffect(() => {
        if (route?.params?.focusLocation && mapRef.current) {
            const focus = route.params.focusLocation;
            setTimeout(() => {
                mapRef.current.animateToRegion({
                    latitude: focus.lat || focus.latitude,
                    longitude: focus.lng || focus.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }, 1000);
            }, 500);
        }
    }, [route?.params?.focusLocation]);

    const goToMyLocation = () => {
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            const geocoded = await Location.geocodeAsync(searchQuery);
            if (geocoded.length > 0) {
                const { latitude, longitude } = geocoded[0];
                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }, 1000);
                }
            } else {
                Alert.alert("Location not found", "Could not find coordinates for that search.");
            }
        } catch (e) {
            console.error("Geocoding error", e);
        }
    };

    const getPinColor = (post) => {
        if (post.status === 'resolved') return 'green';
        if (post.category === 'Safety') return 'orange';
        if (post.category === 'Cleanliness') return 'blue';
        return 'red'; // Default / Infrastructure
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                clusterColor={theme.colors.primaryGreen}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                <RadarPingMapOverlay coordinate={userLocation} radius={500} />

                {posts.map(post => {
                    if (!post.location || (!post.location.lat && !post.location.latitude) || (!post.location.lng && !post.location.longitude)) return null;
                    if (filter !== 'All' && post.category !== filter) return null;

                    const lat = post.location.lat || post.location.latitude;
                    const lng = post.location.lng || post.location.longitude;

                    return (
                        <Marker
                            key={post.id}
                            coordinate={{ latitude: lat, longitude: lng }}
                            pinColor={getPinColor(post)}
                            title={post.sponsors && post.sponsors.length > 0 ? `❤️ Adopted: ${post.title}` : post.title}
                            description={post.sponsors && post.sponsors.length > 0 ? `Sponsored by ${post.sponsors[0].name}. Tap for details.` : "Tap to view details"}
                            onCalloutPress={() => {
                                if (navigation) navigation.navigate('PostDetail', { postId: post.id })
                            }}
                        />
                    );
                })}

                {anomalies.map(anomaly => {
                    if (!anomaly.location || !anomaly.location.lat) return null;
                    return (
                        <Marker
                            key={anomaly.id}
                            coordinate={{ latitude: anomaly.location.lat, longitude: anomaly.location.lng }}
                            pinColor={'gray'}
                            title={`⚠️ Unverified Problem`}
                            description={`Sensor Anomaly: Severity ${anomaly.severityScore}. Tap to verify.`}
                        />
                    );
                })}
            </MapView>

            <TouchableOpacity
                style={styles.autoSenseBtn}
                onPress={() => navigation.navigate('AutoSense')}
            >
                <Text style={styles.autoSenseIcon}>🚗</Text>
            </TouchableOpacity>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search issues or location"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
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

            <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation}>
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
        position: 'absolute', bottom: 240, right: 16,
        backgroundColor: 'white', width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000'
    },
    autoSenseBtn: {
        position: 'absolute', bottom: 310, right: 16,
        backgroundColor: theme.colors.primaryGreen, width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000'
    },
    autoSenseIcon: { fontSize: 24, paddingLeft: 4, paddingBottom: 2 },
    locationIcon: { fontSize: 24, color: theme.colors.primaryGreen },
    bottomSheet: {
        position: 'absolute', bottom: 90, left: 0, right: 0,
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
