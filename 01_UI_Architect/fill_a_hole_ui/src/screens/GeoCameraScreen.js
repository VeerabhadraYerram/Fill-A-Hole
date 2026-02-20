import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { theme } from '../core/theme';
import { GPSStrengthIndicator } from '../components/TrustAIComponents';

export default function GeoCameraScreen({ navigation }) {
    const [hasPermission, requestPermission] = useCameraPermissions();
    const [location, setLocation] = useState(null);
    const [gpsAccuracy, setGpsAccuracy] = useState(100); // 100m default (weak)
    const [cameraRef, setCameraRef] = useState(null);

    useEffect(() => {
        (async () => {
            const { status: camStatus } = await requestPermission();
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            if (locStatus === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setLocation(loc);
                setGpsAccuracy(loc.coords.accuracy);
            }
        })();
    }, []);

    if (!hasPermission) {
        return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
    }
    if (!hasPermission.granted) {
        return <View style={styles.container}><Text>No access to camera</Text></View>;
    }

    const takePicture = async () => {
        if (gpsAccuracy > 50) {
            alert('GPS Signal too weak to verify location. Please move to an open area.');
            return;
        }
        if (cameraRef) {
            const photo = await cameraRef.takePictureAsync();
            // Proceed to Verification Status Screen
            navigation.navigate('VerificationStatus', { photoUri: photo.uri, location: location.coords });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <CameraView style={styles.camera} ref={(ref) => setCameraRef(ref)}>
                <View style={styles.overlay}>
                    {/* Top Bar: GPS and Close */}
                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                        <GPSStrengthIndicator accuracy={gpsAccuracy} />
                    </View>

                    {/* Crosshair */}
                    <View style={styles.crosshair} />

                    {/* Bottom Bar: Geo Tag Info and Shutter */}
                    <View style={styles.bottomBar}>
                        <View style={styles.geoTagCard}>
                            <Text style={styles.geoTagText}>📍 {location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Locating...'}</Text>
                            <Text style={styles.geoTagText}>🕒 {new Date().toLocaleString()}</Text>
                            <Text style={styles.geoTagText}>🎯 Accuracy: ±{Math.round(gpsAccuracy)}m</Text>
                        </View>

                        <View style={styles.shutterContainer}>
                            <TouchableOpacity
                                style={[styles.shutterBtn, gpsAccuracy > 50 && styles.shutterBtnDisabled]}
                                onPress={takePicture}
                                disabled={gpsAccuracy > 50}
                            >
                                <View style={[styles.shutterInner, gpsAccuracy > 50 && styles.shutterInnerDisabled]} />
                            </TouchableOpacity>
                            {gpsAccuracy > 50 && <Text style={styles.warningText}>Waiting for GPS Lock...</Text>}
                        </View>
                    </View>
                </View>
            </CameraView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    camera: { flex: 1 },
    overlay: { flex: 1, justifyContent: 'space-between' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60, alignItems: 'center' },
    closeBtn: { backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    closeText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    crosshair: { width: 250, height: 250, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed', alignSelf: 'center', backgroundColor: 'transparent' },
    bottomBar: { padding: 20, paddingBottom: 40 },
    geoTagCard: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8, marginBottom: 20 },
    geoTagText: { color: '#00E676', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
    shutterContainer: { alignItems: 'center' },
    shutterBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
    shutterBtnDisabled: { backgroundColor: 'rgba(244,67,54,0.3)' },
    shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' },
    shutterInnerDisabled: { backgroundColor: '#FFCDD2' },
    warningText: { color: '#F44336', fontWeight: 'bold', marginTop: 12, fontSize: 14 }
});
