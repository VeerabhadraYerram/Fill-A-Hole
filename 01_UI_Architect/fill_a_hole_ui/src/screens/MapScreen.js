import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { theme } from '../core/theme';

export default function MapScreen() {
    const [filter, setFilter] = useState('All');
    const filters = ['All', 'Urgent', '< 10 min', 'Infrastructure', 'Safety'];

    const markers = [
        { id: '1', lat: 16.5062, lng: 80.6480, color: 'red' },
        { id: '2', lat: 16.5100, lng: 80.6400, color: 'orange' },
        { id: '3', lat: 16.5000, lng: 80.6500, color: 'blue' },
        { id: '4', lat: 16.5020, lng: 80.6380, color: 'green' },
    ];

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
                showsUserLocation={true}
            >
                {markers.map(m => (
                    <Marker key={m.id} coordinate={{ latitude: m.lat, longitude: m.lng }} pinColor={m.color} />
                ))}
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
