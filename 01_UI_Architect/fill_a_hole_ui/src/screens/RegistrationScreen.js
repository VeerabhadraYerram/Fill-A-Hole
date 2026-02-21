import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert,
    ActivityIndicator, Dimensions, Modal
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../core/theme';
import { db, auth } from '../core/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

export default function RegistrationScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);

    // Location state
    const [gpsLoading, setGpsLoading] = useState(true);
    const [mapRegion, setMapRegion] = useState({
        latitude: 17.3850,   // default: Hyderabad
        longitude: 78.4867,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
    });
    const [pinCoord, setPinCoord] = useState({
        latitude: 17.3850,
        longitude: 78.4867,
    });
    const [reversedAddress, setReversedAddress] = useState(null);
    const [reverseLoading, setReverseLoading] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const mapRef = useRef(null);

    // Auto-detect GPS on mount
    useEffect(() => {
        detectGPS();
    }, []);

    const detectGPS = async () => {
        setGpsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setGpsLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coord = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };
            setPinCoord(coord);
            setMapRegion({ ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 });
            await reverseGeocode(coord);
        } catch (e) {
            console.warn('GPS detect failed:', e);
        }
        setGpsLoading(false);
    };

    const reverseGeocode = async (coord) => {
        setReverseLoading(true);
        try {
            const [place] = await Location.reverseGeocodeAsync(coord);
            if (place) {
                setReversedAddress({
                    street: place.street || '',
                    district: place.district || place.subregion || '',
                    city: place.city || place.subregion || place.region || 'Unknown City',
                    state: place.region || '',
                    pincode: place.postalCode || '',
                    country: place.country || 'India',
                });
            }
        } catch (e) {
            console.warn('Reverse geocode error:', e);
        }
        setReverseLoading(false);
    };

    const onMapPress = async (e) => {
        const coord = e.nativeEvent.coordinate;
        setPinCoord(coord);
        await reverseGeocode(coord);
    };

    const onMarkerDragEnd = async (e) => {
        const coord = e.nativeEvent.coordinate;
        setPinCoord(coord);
        await reverseGeocode(coord);
    };

    const handleRegister = async () => {
        if (!fullName.trim()) {
            Alert.alert('Required', 'Please enter your full name.');
            return;
        }
        if (!reversedAddress) {
            Alert.alert('Location Required', 'Please select your location on the map first.');
            return;
        }
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No authenticated user.');
            await updateProfile(user, { displayName: fullName.trim() });
            await setDoc(doc(db, 'users', user.uid), {
                displayName: fullName.trim(),
                city: reversedAddress.city,
                address: [reversedAddress.street, reversedAddress.district, reversedAddress.city].filter(Boolean).join(', '),
                pincode: reversedAddress.pincode,
                state: reversedAddress.state,
                location: {
                    latitude: pinCoord.latitude,
                    longitude: pinCoord.longitude,
                },
                profileComplete: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } catch (e) {
            Alert.alert('Error', 'Could not save your profile. Try again.');
            console.error(e);
        }
        setLoading(false);
    };

    const cityLabel = reversedAddress?.city
        ? `${reversedAddress.city}${reversedAddress.state ? ', ' + reversedAddress.state : ''}`
        : gpsLoading ? 'Detecting location…' : 'Tap map to select location';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                {/* Header */}
                <Text style={styles.headerEmoji}>🏘️</Text>
                <Text style={styles.headerTitle}>Complete Your Profile</Text>
                <Text style={styles.headerSub}>
                    Tell us who you are and pin your location so we can show local civic issues near you.
                </Text>

                {/* Full Name */}
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Ravi Kumar"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                />

                {/* Location Map Section */}
                <Text style={styles.label}>Your Location *</Text>
                <Text style={styles.labelHint}>
                    Drag the 📍 pin or tap anywhere on the map to select your exact area.
                </Text>

                {/* Inline mini-map */}
                <TouchableOpacity style={styles.mapContainer} onPress={() => setShowMapModal(true)} activeOpacity={0.9}>
                    <MapView
                        ref={mapRef}
                        style={styles.miniMap}
                        region={mapRegion}
                        onPress={onMapPress}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        pointerEvents="none"
                    >
                        <Marker
                            coordinate={pinCoord}
                            draggable
                            onDragEnd={onMarkerDragEnd}
                            title="Your Location"
                        />
                    </MapView>
                    <View style={styles.mapOverlayBtn}>
                        <Text style={styles.mapOverlayBtnText}>🗺️ Tap to expand & pick location</Text>
                    </View>
                </TouchableOpacity>

                {/* Detected Address Card */}
                <View style={styles.addressCard}>
                    {reverseLoading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={theme.colors.primaryGreen} style={{ marginRight: 8 }} />
                            <Text style={{ color: '#888' }}>Detecting address…</Text>
                        </View>
                    ) : reversedAddress ? (
                        <>
                            <Text style={styles.addressCity}>📍 {cityLabel}</Text>
                            {reversedAddress.street ? (
                                <Text style={styles.addressDetail}>
                                    {[reversedAddress.street, reversedAddress.district].filter(Boolean).join(', ')}
                                </Text>
                            ) : null}
                            {reversedAddress.pincode ? (
                                <Text style={styles.addressDetail}>PIN: {reversedAddress.pincode}</Text>
                            ) : null}
                            <Text style={styles.addressCoords}>
                                {pinCoord.latitude.toFixed(5)}, {pinCoord.longitude.toFixed(5)}
                            </Text>
                        </>
                    ) : (
                        <Text style={{ color: '#888' }}>
                            {gpsLoading ? '🔍 Getting your GPS position…' : '👆 Tap the map to pin your location'}
                        </Text>
                    )}
                </View>

                {/* Re-detect GPS */}
                <TouchableOpacity style={styles.gpsBtn} onPress={detectGPS} disabled={gpsLoading}>
                    {gpsLoading
                        ? <ActivityIndicator size="small" color={theme.colors.primaryGreen} />
                        : <Text style={styles.gpsBtnText}>📡 Re-detect my GPS location</Text>
                    }
                </TouchableOpacity>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator size="small" color="white" />
                        : <Text style={styles.submitBtnText}>Get Started →</Text>
                    }
                </TouchableOpacity>

                <Text style={styles.privacyNote}>
                    🔒 Your location is only used to show nearby civic issues. Never shared publicly.
                </Text>
            </ScrollView>

            {/* Full-screen map picker modal */}
            <Modal visible={showMapModal} animationType="slide" onRequestClose={() => setShowMapModal(false)}>
                <View style={{ flex: 1 }}>
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1 }}
                        region={mapRegion}
                        onPress={onMapPress}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                    >
                        <Marker
                            coordinate={pinCoord}
                            draggable
                            onDragEnd={onMarkerDragEnd}
                            title="Your Location"
                            description={reversedAddress?.city || ''}
                        />
                    </MapView>

                    {/* Address overlay at bottom */}
                    <View style={styles.modalBottomSheet}>
                        <Text style={styles.modalTitle}>📍 Drag pin or tap to select</Text>
                        {reverseLoading ? (
                            <ActivityIndicator color={theme.colors.primaryGreen} />
                        ) : reversedAddress ? (
                            <Text style={styles.modalAddress}>{cityLabel}</Text>
                        ) : (
                            <Text style={{ color: '#888' }}>Tap on the map to select your area</Text>
                        )}
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => {
                                setMapRegion({ ...pinCoord, latitudeDelta: 0.02, longitudeDelta: 0.02 });
                                setShowMapModal(false);
                            }}
                        >
                            <Text style={styles.confirmBtnText}>✅ Confirm Location</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    scroll: { padding: 24, paddingTop: 56, paddingBottom: 48 },

    headerEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 10 },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', letterSpacing: -0.5 },
    headerSub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 20 },

    label: { fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.8 },
    labelHint: { fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 18 },
    input: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: 'white' },

    // Mini map
    mapContainer: { borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.primaryGreen, height: 200 },
    miniMap: { height: 200, width: '100%' },
    mapOverlayBtn: {
        position: 'absolute', bottom: 10, alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    },
    mapOverlayBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },

    // Address card
    addressCard: {
        backgroundColor: 'white', borderRadius: 12, padding: 14, marginTop: 12,
        borderWidth: 1, borderColor: '#EEE', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05,
    },
    addressCity: { fontWeight: '800', fontSize: 15, color: '#1A1A1A', marginBottom: 4 },
    addressDetail: { color: '#555', fontSize: 13, marginBottom: 2 },
    addressCoords: { color: '#AAA', fontSize: 11, fontFamily: 'monospace', marginTop: 4 },

    // GPS
    gpsBtn: {
        marginTop: 14, borderWidth: 1.5, borderColor: theme.colors.primaryGreen,
        borderRadius: 12, padding: 13, backgroundColor: 'rgba(0,200,83,0.06)', alignItems: 'center',
    },
    gpsBtnText: { color: theme.colors.primaryGreen, fontWeight: '700', fontSize: 14 },

    // Submit
    submitBtn: { backgroundColor: theme.colors.primaryGreen, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 28 },
    submitBtnText: { color: 'white', fontWeight: '900', fontSize: 17 },
    privacyNote: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 18, lineHeight: 18 },

    // Modal
    modalBottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40, elevation: 20,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
    },
    modalTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
    modalAddress: { fontSize: 16, color: theme.colors.primaryGreen, fontWeight: '700', marginBottom: 16 },
    confirmBtn: { backgroundColor: theme.colors.primaryGreen, padding: 16, borderRadius: 14, alignItems: 'center' },
    confirmBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
});
