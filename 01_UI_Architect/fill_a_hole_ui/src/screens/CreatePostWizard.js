import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    ScrollView, Switch, Alert, ActivityIndicator, Image
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { theme } from '../core/theme';
import { AILoadingIndicator } from '../components/TrustAIComponents';
import { auth, db } from '../core/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ─── AI Analysis Engine ───────────────────────────────────────────────────────

/**
 * Analyzes the geo-tagged photo + description + visual image for authenticity signals.
 * Uses: GPS accuracy, EXIF, and Grok Multi-modal Vision API to literally look at the image.
 * Returns: { score, verdict, details }
 */
async function analyzePhotoAuthenticity(photoUri, location, captureTime, description, exif, title, category, base64Image) {
    const signals = [];
    let deductions = 0;

    // 1. Was a real GPS location captured?
    if (!location) {
        signals.push({ icon: '❌', text: 'No GPS data attached — photo unverifiable', weight: 40 });
        deductions += 40;
    } else {
        const accuracy = location.accuracy || location.coords?.accuracy || 999;
        if (accuracy > 1000) {
            signals.push({ icon: '⚠️', text: `Weak GPS signal: ±${Math.round(accuracy)}m accuracy`, weight: 20 });
            deductions += 20;
        } else if (accuracy > 500) {
            signals.push({ icon: '⚠️', text: `GPS accuracy marginal: ±${Math.round(accuracy)}m`, weight: 8 });
            deductions += 8;
        } else {
            signals.push({ icon: '✅', text: `GPS locked — acceptable accuracy: ±${Math.round(accuracy)}m`, weight: 0 });
        }
    }

    // 2. Was the photo taken recently?
    const now = Date.now();
    const taken = captureTime || now;
    const ageMinutes = (now - taken) / 60000;
    if (ageMinutes > 30) {
        signals.push({ icon: '❌', text: `Photo is ${Math.round(ageMinutes)} min old — may not be live`, weight: 25 });
        deductions += 25;
    } else if (ageMinutes > 5) {
        signals.push({ icon: '⚠️', text: `Photo taken ${Math.round(ageMinutes)} min ago`, weight: 5 });
        deductions += 5;
    } else {
        signals.push({ icon: '✅', text: 'Photo captured just now — live evidence', weight: 0 });
    }

    // 3. URI source check — is it from GeoCamera (temp expo path) or gallery?
    const isGeoCamUri = photoUri &&
        (photoUri.includes('Camera') || photoUri.includes('tmp') || photoUri.includes('cache'));
    if (!isGeoCamUri && photoUri) {
        signals.push({ icon: '❌', text: 'Photo may be from gallery, not live camera', weight: 25 });
        deductions += 25;
    } else if (photoUri) {
        signals.push({ icon: '✅', text: 'Photo from secure GeoCamera session', weight: 0 });
    }

    // 4. GPS coordinates plausibility (basic sanity check)
    if (location) {
        const lat = location.latitude || location.coords?.latitude;
        const lng = location.longitude || location.coords?.longitude;
        if (lat && lng) {
            const isPlausible = lat > -90 && lat < 90 && lng > -180 && lng < 180;
            if (!isPlausible) {
                signals.push({ icon: '❌', text: 'GPS coordinates out of valid range — spoofed?', weight: 30 });
                deductions += 30;
            } else {
                signals.push({ icon: '✅', text: `Valid coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, weight: 0 });
            }
        }
    }

    // 5. Deep AI Contextual Check (Grok) & EXIF presence
    if (exif) {
        signals.push({ icon: '✅', text: 'Hardware EXIF metadata embedded', weight: 0 });
    } else {
        signals.push({ icon: '⚠️', text: 'No EXIF data verified', weight: 5 });
        deductions += 5;
    }

    const apiKey = process.env.EXPO_PUBLIC_XAI_API_KEY;
    if (apiKey && description && base64Image) {
        try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "grok-2-vision-1212",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/jpeg;base64,${base64Image}`,
                                        detail: "high"
                                    }
                                },
                                {
                                    type: "text",
                                    text: `You are a ZERO-TOLERANCE anti-fraud AI for a civic issue reporting app (like potholes, garbage, broken infrastructure). 
Analyze the user's photo against Title: "${title}", Category: "${category}", Description: "${description}".
CRITICAL DIRECTIVE: You MUST be extremely skeptical. If the photo shows an indoor item (table, laptop, house, pet) or anything that is clearly NOT outdoor public civic infrastructure, it is a FAKE submission.
If the photo does NOT definitively prove the civic issue described exists, you MUST set "isAuthentic" to false, set "confidenceDeduction" to 100, and provide a harsh "reason" (e.g., "This is a photo of a wooden table indoors, not a street pothole.").
Provide your answer strictly as a raw JSON object matching EXACTLY this structure:\n{\n  "isAuthentic": true,\n  "reason": "Clear explanation of what is in the photo",\n  "confidenceDeduction": 0\n}\nDo NOT include markdown tags like \`\`\`json. Return ONLY the raw JSON object.`
                                }
                            ]
                        }
                    ],
                    temperature: 0.1
                })
            });

            if (response.ok) {
                const data = await response.json();
                let rc = data.choices[0].message.content.trim();

                // Extremely aggressive cleanup for unexpected Grok formats
                if (rc.startsWith("```json")) rc = rc.replace(/^```json/, "");
                if (rc.startsWith("```")) rc = rc.replace(/^```/, "");
                if (rc.endsWith("```")) rc = rc.replace(/```$/, "");
                rc = rc.trim();

                try {
                    const aiEval = JSON.parse(rc);
                    if (typeof aiEval.isAuthentic !== 'undefined') {
                        if (!aiEval.isAuthentic) {
                            const deduction = parseInt(aiEval.confidenceDeduction) || 20;
                            signals.push({ icon: '🚨', text: `AI Flag: ${aiEval.reason}`, weight: deduction });
                            deductions += deduction;
                        } else {
                            signals.push({ icon: '🧠', text: 'AI Verification: Details look authentic', weight: 0 });
                        }
                    }
                } catch (parseError) {
                    console.warn("Failed to parse Grok strict JSON. Raw text:", rc);
                }
            }
        } catch (e) {
            console.warn("Grok verification failed, falling back", e);
        }
    } else if (!description || description.trim().length < 15) {
        signals.push({ icon: '⚠️', text: 'Description is too brief to correlate with photo', weight: 15 });
        deductions += 15;
    }

    const score = Math.max(0, 100 - deductions);
    let verdict;
    if (score >= 85) verdict = { label: 'HIGH TRUST', color: '#4CAF50', emoji: '🛡️' };
    else if (score >= 60) verdict = { label: 'MEDIUM TRUST', color: '#FF9800', emoji: '⚠️' };
    else verdict = { label: 'LOW TRUST — Possible Fake', color: '#F44336', emoji: '🚨' };

    return { score, verdict, signals };
}

/**
 * AI Volunteer, Cost & Resource Estimation Engine (Vision-Enabled).
 * Analyzes the attached image + text data + location to estimate funding and manpower.
 */
async function analyzePreviewEstimation(title, description, category, location, base64Image) {
    const locStr = location ? `Lat: ${location.lat || location.latitude}, Lng: ${location.lng || location.longitude}` : 'Unknown';
    const textContext = `Issue Title: ${title}\nCategory: ${category}\nDescription: ${description}\nLocation: ${locStr}`;

    const getFallback = () => {
        let base = {
            volunteers: { count: 3, skills: ['General volunteers'] },
            materials: ['Basic supplies'],
            equipment: ['Safety gear'],
            estimatedHours: 2,
            fundsRequired: 500, // INR fallback
            urgency: category === 'Safety' ? 'High' : 'Normal',
            recruitement: ['🙋 3 community volunteers']
        };

        if (textContext.toLowerCase().includes('pothole') || textContext.toLowerCase().includes('road')) {
            base.volunteers.count = 4;
            base.materials = ['Gravel (2 bags)', 'Cold-mix asphalt'];
            base.equipment = ['Shovel', 'Tamper', 'Traffic cones'];
            base.fundsRequired = 1500;
        } else if (textContext.toLowerCase().includes('garbage')) {
            base.volunteers.count = 6;
            base.materials = ['Heavy-duty bags', 'Disinfectant'];
            base.equipment = ['Gloves', 'Picker tools'];
            base.fundsRequired = 800;
        }
        return base;
    };

    const apiKey = process.env.EXPO_PUBLIC_XAI_API_KEY;
    if (!apiKey) {
        console.warn("No XAI_API_KEY provided. Using fallback heuristic estimation.");
        return getFallback();
    }

    try {
        const messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `You are an expert, highly FRUGAL civic infrastructure estimator and a strict anti-fraud detector. Analyze the image and text:
${textContext}

CRITICAL RULES:
1. Anti-Fraud: If the image is unrelated (e.g., table, indoor room, computer screen, face) and NOT outdoor civic infrastructure, you MUST return 0 for everything, empty arrays, and set urgency to "INVALID - FAKE PHOTO".
2. Frugality: If the issue is valid, estimate the absolute MINIMUM realistic cost (in INR ₹), manpower, and time using cheap local labor and basic materials. Do not over-engineer. Be extremely cheap.
3. Output Format: Return STRICTLY raw JSON matching this structure exactly, with NO markdown formatting:
{
  "volunteers": { "count": 2, "skills": ["Skill"] },
  "materials": ["Material 1"],
  "equipment": ["Tool 1"],
  "estimatedHours": 2,
  "fundsRequired": 800,
  "urgency": "High",
  "recruitement": ["Emoji + Req"]
}`
                    }
                ]
            }
        ];

        if (base64Image) {
            messages[0].content.unshift({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: "high"
                }
            });
        }

        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: base64Image ? "grok-2-vision-1212" : "grok-2-latest",
                messages: messages,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            console.warn(`xAI API error: ${response.status}`);
            return getFallback();
        }

        const data = await response.json();
        let resultContent = data.choices[0].message.content;

        if (resultContent.includes("\`\`\`json")) {
            resultContent = resultContent.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
        } else if (resultContent.includes("\`\`\`")) {
            resultContent = resultContent.replace(/\`\`\`/g, "").trim();
        }

        const parsedResult = JSON.parse(resultContent);
        return {
            volunteers: parsedResult.volunteers || { count: 3, skills: ['General'] },
            materials: parsedResult.materials || [],
            equipment: parsedResult.equipment || [],
            estimatedHours: parsedResult.estimatedHours || 2,
            fundsRequired: parsedResult.fundsRequired || 500,
            urgency: parsedResult.urgency || 'Normal',
            recruitement: parsedResult.recruitement || []
        };
    } catch (error) {
        console.error("Error calling Grok Vision API:", error);
        return getFallback();
    }
}

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'infrastructure', label: 'Infrastructure', icon: '⛏️' },
    { id: 'safety', label: 'Safety', icon: '🛡️' },
    { id: 'garbage', label: 'Garbage', icon: '🗑️' },
    { id: 'streetlight', label: 'Streetlight', icon: '💡' },
    { id: 'flooding', label: 'Flooding', icon: '🌊' },
    { id: 'tree', label: 'Fallen Tree', icon: '🌳' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreatePostWizard({ navigation, route }) {
    const pagerRef = useRef(null);
    const [step, setStep] = useState(0);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('infrastructure');
    const [communitySolvable, setCommunitySolvable] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiResources, setAiResources] = useState(null);       // volunteer/resource suggestions
    const [aiAuth, setAiAuth] = useState(null);                  // photo authenticity result
    const [loading, setLoading] = useState(false);
    const [mediaUri, setMediaUri] = useState(null);
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    const [tagNgo, setTagNgo] = useState(false);
    const [captureTime, setCaptureTime] = useState(null);

    const [previewAnalyzed, setPreviewAnalyzed] = useState(false);

    // ── Receive photo from GeoCamera → here ──
    useEffect(() => {
        if (route.params?.photoUri && mediaUri !== route.params.photoUri) {
            setMediaUri(route.params.photoUri);
            setCaptureTime(Date.now());
            if (step === 0) {
                setTimeout(() => pagerRef.current?.setPage(1), 100);
            }
        }
        else if (route.params?.capturedPhotoUri && mediaUri !== route.params.capturedPhotoUri) {
            setMediaUri(route.params.capturedPhotoUri);
            setCaptureTime(Date.now());
            if (step === 0) {
                setTimeout(() => pagerRef.current?.setPage(1), 100);
            }
        }
    }, [route.params?.photoUri, route.params?.capturedPhotoUri]);

    // ── AI Vision Estimation triggered instantly ONLY entering Step 3 (Preview) ──
    useEffect(() => {
        if (step === 3 && !previewAnalyzed) {
            setAiAnalyzing(true);
            const runVisionAnalysis = async () => {
                const loc = route.params?.location || route.params?.capturedLocation;
                const b64 = route.params?.capturedBase64;
                const catLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;

                // Pass the high-res base64 image + user text logic directly to Vision AI
                const resources = await analyzePreviewEstimation(title, description, catLabel, loc, b64);
                setAiResources(resources);

                // Auto-add category tag if not present based on inference
                if (catLabel && !tags.includes(catLabel)) {
                    setTags(prev => prev.includes(catLabel) ? prev : [catLabel, ...prev]);
                }

                setAiAnalyzing(false);
                setPreviewAnalyzed(true);
            };
            runVisionAnalysis();
        }
    }, [step]);

    // ─────────────────────────────────────────────────────────────────────────
    const addTag = () => {
        const trimmed = newTag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed]);
        }
        setNewTag('');
        setShowTagInput(false);
    };

    const removeTag = (tagToRemove) => {
        setTags(prev => prev.filter(t => t !== tagToRemove));
    };

    const nextStep = async () => {
        if (step < 3) {
            pagerRef.current?.setPage(step + 1);
        } else {
            if (!title.trim()) {
                Alert.alert('Error', 'Please enter a title for your report.');
                return;
            }
            if (!mediaUri) {
                Alert.alert('No Photo', 'Please capture a photo using the GeoCamera first.');
                return;
            }
            // We run AI auth directly in submitPost now
            await submitPost();
        }
    };

    const submitPost = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            const catLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;
            const loc = route.params?.location || route.params?.capturedLocation;

            // Run AI Validation check NOW, including the visual Base64 image
            const finalAuth = await analyzePhotoAuthenticity(
                mediaUri,
                loc,
                captureTime,
                description.trim(),
                route.params?.capturedExif,
                title.trim(),
                catLabel,
                route.params?.capturedBase64
            );

            // Determine status
            // If the verification score is < 60, we flag the post so it's hidden from the feed
            const postStatus = finalAuth.score < 60 ? 'flagged' : 'open';

            // Map signals to Strings for Firestore and the next UI screen to prevent crash
            const uiSignals = finalAuth.signals.map(s => `${s.icon} ${s.text}`);

            const newPost = {
                authorId: user ? user.uid : 'anonymous',
                authorName: user ? (user.displayName || (user.email ? user.email.split('@')[0] : 'Citizen')) : 'Citizen',
                title: title.trim(),
                description: description.trim(),
                category: catLabel,
                isCommunitySolvable: communitySolvable,
                status: postStatus,      // 'open' or 'flagged'
                location: {
                    geohash: 'tdr1vzc',
                    lat: loc?.lat || loc?.latitude || 12.9716,
                    lng: loc?.lng || loc?.longitude || 77.5946,
                },
                mediaUrls: mediaUri ? [mediaUri] : [],
                tags: tags,
                notifyNgos: tagNgo,
                aiResources: aiResources ? {
                    volunteers: aiResources.volunteers,
                    materials: aiResources.materials,
                    equipment: aiResources.equipment,
                    estimatedHours: aiResources.estimatedHours,
                    urgency: aiResources.urgency,
                    recruitement: aiResources.recruitement,
                    fundsRequired: aiResources.fundsRequired,
                } : {},
                verificationData: {
                    isVerified: finalAuth.score >= 85,
                    trustScore: finalAuth.score,
                    verdict: finalAuth.verdict.label,
                    signals: uiSignals,
                },
                metrics: { upvotes: 0, commentCount: 0, shares: 0, volunteersCount: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'posts'), newPost);
            setLoading(false);

            // Navigate to the VerificationStatus screen to see the AI result
            navigation.replace('VerificationStatus', {
                postId: docRef.id,
                score: finalAuth.score,
                verdict: finalAuth.verdict.label,
                signals: uiSignals,
                isFlagged: postStatus === 'flagged'
            });

        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert('Error', 'Failed to submit report. Please try again.');
            setLoading(false);
        }
    };

    const prevStep = () => {
        if (step > 0) { pagerRef.current?.setPage(step - 1); }
        else { navigation.goBack(); }
    };

    return (
        <View style={styles.container}>
            {/* App Bar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={prevStep}>
                    <Text style={styles.iconBtn}>{step === 0 ? '✕' : '←'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Create Report — Step {step + 1}/4</Text>
                <View style={styles.iconBtn} />
            </View>

            {/* Progress */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} />
            </View>

            <PagerView
                style={styles.pagerView}
                initialPage={0}
                ref={pagerRef}
                scrollEnabled={false}
                onPageSelected={(e) => setStep(e.nativeEvent.position)}
            >
                {/* ── Step 1: GeoCamera ── */}
                <View key="0" style={styles.page}>
                    <Text style={theme.typography.displayLarge}>Acquire Evidence</Text>
                    <Text style={styles.subtitle}>
                        Use the GeoCamera to capture live, GPS-verified photo evidence.
                        Our AI will analyse its authenticity automatically.
                    </Text>

                    {mediaUri ? (
                        <>
                            <Image source={{ uri: mediaUri }} style={styles.capturedImage} />
                            {aiAuth && (
                                <View style={[styles.trustCard, { borderColor: aiAuth.verdict.color }]}>
                                    <View style={styles.trustHeader}>
                                        <Text style={styles.trustEmoji}>{aiAuth.verdict.emoji}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.trustLabel, { color: aiAuth.verdict.color }]}>
                                                {aiAuth.verdict.label}
                                            </Text>
                                            <Text style={styles.trustScore}>
                                                AI Trust Score: <Text style={{ fontWeight: '900', color: aiAuth.verdict.color }}>{aiAuth.score}</Text>/100
                                            </Text>
                                        </View>
                                    </View>
                                    {aiAuth.signals.map((sig, i) => (
                                        <View key={i} style={styles.signalRow}>
                                            <Text style={{ marginRight: 8 }}>{sig.icon}</Text>
                                            <Text style={styles.signalText}>{sig.text}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            <TouchableOpacity style={styles.retakeBtn} onPress={() => navigation.navigate('GeoCamera')}>
                                <Text style={styles.retakeBtnText}>📸 Retake with GeoCamera</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.geoCameraBtn} onPress={() => navigation.navigate('GeoCamera')}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>📸</Text>
                            <Text style={styles.geoCameraBtnText}>Launch Secure GeoCamera</Text>
                            <Text style={styles.geoCameraSubText}>Requires GPS Lock · No Edited Photos</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Step 2: Category & Tags ── */}
                <ScrollView key="1" style={{ flex: 1 }} contentContainerStyle={styles.page}>
                    <Text style={theme.typography.displayLarge}>Category & Tags</Text>

                    <Text style={styles.sectionLabel}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.catCard, selectedCategory === cat.id && styles.catCardSelected]}
                                onPress={() => setSelectedCategory(cat.id)}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: 28 }}>{cat.icon}</Text>
                                <Text style={[styles.catCardText, selectedCategory === cat.id && styles.catCardTextSelected]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Tags</Text>
                    <View style={styles.tagsContainer}>
                        {tags.map((tag, idx) => (
                            <View key={idx} style={styles.tagChip}>
                                <Text style={styles.tagChipText}>{tag}</Text>
                                <TouchableOpacity onPress={() => removeTag(tag)} style={styles.tagRemoveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Text style={styles.tagRemoveText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {showTagInput ? (
                            <TextInput
                                style={styles.tagInput}
                                value={newTag}
                                onChangeText={setNewTag}
                                placeholder="Tag name"
                                onSubmitEditing={addTag}
                                onBlur={addTag}
                                autoFocus
                                returnKeyType="done"
                            />
                        ) : (
                            <TouchableOpacity onPress={() => setShowTagInput(true)} style={styles.addTagBtn}>
                                <Text style={styles.addTagText}>+ Add Tag</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.toggleCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>Tag Local NGOs</Text>
                            <Text style={{ color: '#666', fontSize: 12 }}>Notify NGOs in this area.</Text>
                        </View>
                        <Switch value={tagNgo} onValueChange={setTagNgo} thumbColor={theme.colors.primaryGreen} trackColor={{ true: 'rgba(0, 200, 83, 0.4)' }} />
                    </View>
                </ScrollView>

                {/* ── Step 3: Details & AI Resource Analysis ── */}
                <ScrollView key="2" style={{ flex: 1 }} contentContainerStyle={styles.page}>
                    <Text style={theme.typography.displayLarge}>Details</Text>

                    <TextInput style={styles.input} placeholder="Issue Title *" value={title} onChangeText={setTitle} />
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        placeholder="Description (recommended for better AI analysis)"
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />

                    <View style={styles.toggleCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>Community Solvable</Text>
                            <Text style={{ color: '#666', fontSize: 12 }}>Check this if you think local volunteers could fix this issue.</Text>
                        </View>
                        <Switch value={communitySolvable} onValueChange={setCommunitySolvable} thumbColor={theme.colors.primaryGreen} trackColor={{ true: 'rgba(0, 200, 83, 0.4)' }} />
                    </View>
                </ScrollView>

                {/* ── Step 4: Preview ── */}
                <ScrollView key="3" style={{ flex: 1 }} contentContainerStyle={styles.page}>
                    <Text style={theme.typography.displayLarge}>Final Preview & AI Estimation</Text>
                    <Text style={styles.subtitle}>
                        Our Vision AI is calculating the projected required cost and manpower based on your photo.
                    </Text>

                    <View style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            {mediaUri
                                ? <Image source={{ uri: mediaUri }} style={styles.previewImageMock} />
                                : <View style={[styles.previewImageMock, { backgroundColor: '#DDD', justifyContent: 'center', alignItems: 'center' }]}><Text>📷</Text></View>
                            }
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{title || 'Issue Title'}</Text>
                                <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                                    {CATEGORIES.find(c => c.id === selectedCategory)?.icon} {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                                </Text>
                            </View>
                        </View>

                        <Text style={{ fontWeight: 'bold', marginTop: 16 }}>Description:</Text>
                        <Text style={{ color: '#555', marginTop: 4 }}>{description || 'No description provided.'}</Text>

                        {tags.length > 0 && (
                            <View style={[styles.tagsContainer, { marginTop: 12 }]}>
                                {tags.map((t, i) => (
                                    <View key={i} style={[styles.tagChip, { backgroundColor: 'rgba(0,200,83,0.12)' }]}>
                                        <Text style={[styles.tagChipText, { color: theme.colors.primaryGreen }]}>{t}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {tagNgo && (
                            <View style={[styles.previewBadge, { backgroundColor: '#E8EAF6', marginTop: 8 }]}>
                                <Text style={[styles.previewBadgeText, { color: '#3949AB' }]}>📢 NGOs will be notified</Text>
                            </View>
                        )}
                    </View>

                    {/* AI Vision Estimation Box */}
                    <View style={styles.aiSection}>
                        <Text style={styles.aiSectionTitle}>🤖 Vision AI Resolution Estimate</Text>
                        {aiAnalyzing ? (
                            <AILoadingIndicator />
                        ) : aiResources ? (
                            <>
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                    <View style={[styles.urgencyBadge, { flex: 1, backgroundColor: '#E3F2FD' }]}>
                                        <Text style={{ fontWeight: 'bold', color: '#1565C0', fontSize: 16 }}>
                                            ₹{aiResources.fundsRequired?.toLocaleString() || "N/A"}
                                        </Text>
                                        <Text style={{ color: '#1565C0', fontSize: 11, marginTop: 2 }}>Est. Cost</Text>
                                    </View>

                                    <View style={[styles.urgencyBadge, { flex: 1, backgroundColor: '#FFF3E0' }]}>
                                        <Text style={{ fontWeight: 'bold', color: '#E65100', fontSize: 16 }}>
                                            ⏱️ {aiResources.estimatedHours}h
                                        </Text>
                                        <Text style={{ color: '#E65100', fontSize: 11, marginTop: 2 }}>Completion Time</Text>
                                    </View>

                                    <View style={[styles.urgencyBadge, { flex: 1, backgroundColor: '#E8F5E9' }]}>
                                        <Text style={{ fontWeight: 'bold', color: '#2E7D32', fontSize: 16 }}>
                                            👥 {aiResources.volunteers?.count || 0}
                                        </Text>
                                        <Text style={{ color: '#2E7D32', fontSize: 11, marginTop: 2 }}>Manpower</Text>
                                    </View>
                                </View>

                                <Text style={styles.aiSubhead}>🛠️ Materials & Equipment Required</Text>
                                {(aiResources.materials || []).concat(aiResources.equipment || []).slice(0, 5).map((m, i) => (
                                    <View key={i} style={styles.materialRow}>
                                        <Text style={{ color: '#555', fontSize: 13 }}>• {m}</Text>
                                    </View>
                                ))}
                            </>
                        ) : (
                            <Text style={{ color: '#666', fontStyle: 'italic' }}>AI data unavailable</Text>
                        )}
                    </View>
                </ScrollView>


            </PagerView>

            <TouchableOpacity
                style={[styles.bottomBtn, loading && { opacity: 0.7 }]}
                onPress={nextStep}
                disabled={loading}
            >
                <Text style={styles.bottomBtnText}>
                    {loading ? 'Submitting...' : step === 3 ? '🚀 Submit Report' : 'Next →'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    appBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 44, alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    iconBtn: { fontSize: 24, width: 32, textAlign: 'center' },
    title: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
    progressBar: { height: 3, backgroundColor: '#EEE', width: '100%' },
    progressFill: { height: '100%', backgroundColor: theme.colors.primaryGreen },
    pagerView: { flex: 1 },
    page: { padding: 24, paddingBottom: 100 },
    subtitle: { color: '#666', marginTop: 12, marginBottom: 20, lineHeight: 20 },
    sectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 16 },

    // GeoCamera
    geoCameraBtn: { backgroundColor: '#0D0D0D', padding: 28, borderRadius: 20, alignItems: 'center', marginVertical: 16 },
    geoCameraBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginTop: 4 },
    geoCameraSubText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6 },
    capturedImage: { width: '100%', height: 200, borderRadius: 14, marginBottom: 16 },
    retakeBtn: { marginTop: 12, borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 10, alignItems: 'center' },
    retakeBtnText: { color: '#555', fontWeight: '600' },

    // Trust Card
    trustCard: { borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, backgroundColor: '#FAFAFA' },
    trustHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    trustEmoji: { fontSize: 28, marginRight: 12 },
    trustLabel: { fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    trustScore: { color: '#555', fontSize: 13, marginTop: 2 },
    signalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
    signalText: { color: '#444', fontSize: 13, flex: 1 },

    // Category
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCard: { width: '30%', backgroundColor: '#F8F8F8', borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8 },
    catCardSelected: { borderColor: theme.colors.primaryGreen, backgroundColor: 'rgba(0, 200, 83, 0.08)' },
    catCardText: { marginTop: 6, fontSize: 11, color: '#666', textAlign: 'center' },
    catCardTextSelected: { color: theme.colors.primaryGreen, fontWeight: 'bold' },

    // Tags
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    tagChipText: { color: theme.colors.primaryGreen, fontWeight: '600', fontSize: 13 },
    tagRemoveBtn: { marginLeft: 6 },
    tagRemoveText: { color: theme.colors.primaryGreen, fontWeight: 'bold', fontSize: 11 },
    tagInput: { borderWidth: 1.5, borderColor: theme.colors.primaryGreen, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, minWidth: 100, fontSize: 13 },
    addTagBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#DDD' },
    addTagText: { color: '#555', fontSize: 13 },
    toggleCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 14, padding: 16, marginTop: 20 },

    // AI Section
    aiSection: { marginTop: 20, backgroundColor: '#F0FFF4', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(0,200,83,0.2)' },
    aiSectionTitle: { fontWeight: 'bold', fontSize: 15, color: '#1B5E20', marginBottom: 12 },
    aiSubhead: { fontWeight: 'bold', color: '#333', marginTop: 14, marginBottom: 6, fontSize: 13 },
    urgencyBadge: { borderRadius: 10, padding: 10, marginBottom: 8 },
    recruitRow: { backgroundColor: 'white', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#E0F2E9' },
    recruitText: { color: '#1B5E20', fontSize: 13, fontWeight: '500' },
    materialRow: { paddingVertical: 3, paddingLeft: 4 },

    // Input
    input: { borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, padding: 14, marginTop: 14, fontSize: 15, color: '#1A1A1A' },

    // Preview
    previewCard: { backgroundColor: 'white', borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, padding: 16, borderWidth: 1, borderColor: '#EEE' },
    previewHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    previewImageMock: { width: 64, height: 64, borderRadius: 10 },
    previewBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
    previewBadgeText: { fontSize: 12, fontWeight: 'bold' },

    // Bottom
    bottomBtn: { backgroundColor: theme.colors.primaryGreen, padding: 18, marginHorizontal: 16, marginBottom: 20, borderRadius: 14, alignItems: 'center' },
    bottomBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
