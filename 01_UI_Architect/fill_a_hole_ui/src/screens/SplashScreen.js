import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import PagerView from 'react-native-pager-view';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
    const pagerRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);

    const pages = [
        {
            title: '5 minutes = Real change in your neighbourhood',
            isFirst: true,
        },
        {
            title: 'How it works',
            items: [
                { title: 'Report', sub: 'Snap a photo of the issue' },
                { title: 'Volunteer', sub: 'Join others to fix it' },
                { title: 'Impact', sub: 'See your city transform' }
            ]
        },
        {
            title: 'Choose your role',
            roles: ['I’m a Citizen / Volunteer', 'I’m an NGO / Authority']
        }
    ];

    return (
        <View style={styles.container}>
            <PagerView
                style={styles.pagerView}
                initialPage={0}
                ref={pagerRef}
                onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
            >
                {/* Page 1 */}
                <View key="1" style={styles.page}>
                    <Text style={styles.title}>{pages[0].title}</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => pagerRef.current?.setPage(1)}
                    >
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.replace('Login')}>
                        <Text style={styles.link}>Already have account? Sign in</Text>
                    </TouchableOpacity>
                </View>

                {/* Page 2 */}
                <View key="2" style={styles.page}>
                    <Text style={styles.title}>{pages[1].title}</Text>
                    {pages[1].items.map((item, i) => (
                        <View key={i} style={styles.card}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardSub}>{item.sub}</Text>
                        </View>
                    ))}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => pagerRef.current?.setPage(2)}
                    >
                        <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                </View>

                {/* Page 3 */}
                <View key="3" style={styles.page}>
                    <Text style={styles.title}>{pages[2].title}</Text>
                    {pages[2].roles.map((role, i) => (
                        <View key={i} style={styles.roleCard}>
                            <Text style={styles.roleText}>{role}</Text>
                        </View>
                    ))}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => navigation.replace('Login')}
                    >
                        <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </PagerView>

            <View style={styles.dots}>
                {pages.map((_, idx) => (
                    <View key={idx} style={[styles.dot, currentPage === idx && styles.activeDot]} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    pagerView: { flex: 1 },
    page: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
    button: { backgroundColor: '#00C853', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, minWidth: 250, marginBottom: 16 },
    buttonText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    link: { color: '#00C853', fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: 16, borderRadius: 12, width: '100%', marginBottom: 12, elevation: 2 },
    cardTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
    cardSub: { color: '#666' },
    roleCard: { backgroundColor: 'white', padding: 20, borderRadius: 12, width: '100%', marginBottom: 16, borderWidth: 1, borderColor: '#ccc' },
    roleText: { fontWeight: 'bold', fontSize: 16 },
    dots: { flexDirection: 'row', position: 'absolute', bottom: 40, alignSelf: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc', marginHorizontal: 4 },
    activeDot: { backgroundColor: '#00C853', width: 24 },
});
