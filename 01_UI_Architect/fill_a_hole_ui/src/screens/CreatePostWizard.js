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
                                    text: `You are a strict civic issue verification AI. Analyze the photo I attached. Determine if the photo matches the Title: "${title}", Category: "${category}", and Description: "${description}". Are they telling the truth about the issue shown in the picture? Ensure the photo is not completely unrelated (like a picture of a dog for a pothole). Provide your answer strictly as a raw JSON object matching EXACTLY this structure:\n{\n  "isAuthentic": true,\n  "reason": "Clear explanation of what is in the photo",\n  "confidenceDeduction": 0\n}\nDo NOT include markdown tags like \`\`\`json. Return ONLY the raw JSON object.`
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
 * AI Volunteer & Resource Matching Engine.
 * Analyzes title + description + category to suggest what's needed.
 */
async function analyzeResourceRequirements(title, description, category) {
    const text = `${title} ${description} ${category}`.toLowerCase();

    // Fallback heuristic in case API fails or key is missing
    const getFallback = () => {
        let base = {
            volunteers: { count: 3, skills: ['General civic volunteers'] },
            materials: ['Basic supplies'],
            equipment: ['Gloves', 'Safety vest'],
            estimatedHours: 2,
            urgency: category === 'Safety' ? 'High' : 'Normal',
            recruitement: ['🙋 3 general community volunteers', '📋 1 coordinator']
        };

        if (text.includes('pothole') || text.includes('road')) {
            base.volunteers = { count: 4, skills: ['Manual labour', 'Traffic management'] };
            base.materials = ['Gravel (2 bags)', 'Cold-mix asphalt', 'Sand'];
            base.equipment = ['Shovel', 'Tamper', 'Traffic cones (6)', 'Hi-vis vests'];
            base.estimatedHours = 3;
            base.urgency = 'High — vehicle hazard';
            base.recruitement = [
                '🚧 4 volunteers with manual labour experience',
                '🦺 1 trained traffic marshal',
                '🔨 1 person with road repair knowledge'
            ];
        } else if (text.includes('garbage') || text.includes('waste')) {
            base.volunteers = { count: 6, skills: ['Waste handling', 'Sorting'] };
            base.materials = ['Heavy-duty garbage bags (20)', 'Disinfectant spray', 'Recycling bins'];
            base.equipment = ['Gloves', 'Safety mask', 'Picker tools'];
            base.estimatedHours = 2;
            base.urgency = 'Medium — health risk';
            base.recruitement = [
                '🗑️ 6 volunteers for clean-up',
                '🧤 Any volunteers — basic gear provided',
                '♻️ 1 person familiar with waste sorting'
            ];
        }
        return base;
    };

    const apiKey = process.env.EXPO_PUBLIC_XAI_API_KEY;
    if (!apiKey) {
        console.warn("No XAI_API_KEY provided. Using fallback heuristic estimation.");
        return getFallback();
    }

    try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "grok-2-latest",
                messages: [
                    {
                        role: "system",
                        content: `You are an AI assistant for a local civic issue tracking platform. Given a civic issue (title, category, and description), estimate the necessary resources to solve it. Return your answer STRICTLY as a JSON object matching this exact structure, with no markdown formatting around it:
{
    "volunteers": { "count": 2, "skills": ["Skill 1", "Skill 2"] },
    "materials": ["Material 1", "Material 2"],
    "equipment": ["Tool 1", "Tool 2"],
    "estimatedHours": 3,
    "urgency": "Normal / High / Critical",
    "recruitement": ["Emoji + Requirement 1", "Emoji + Requirement 2"]
}
Keep realistic and community-focused.`
                    },
                    {
                        role: "user",
                        content: `Issue Title: ${title}\nCategory: ${category}\nDescription: ${description}`
                    }
                ],
                temperature: 0.2
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
        // Ensure default properties exist in case Grok hallucinates the schema slightly
        return {
            volunteers: parsedResult.volunteers || { count: 3, skills: ['General'] },
            materials: parsedResult.materials || [],
            equipment: parsedResult.equipment || [],
            estimatedHours: parsedResult.estimatedHours || 2,
            urgency: parsedResult.urgency || 'Normal',
            recruitement: parsedResult.recruitement || []
        };
    } catch (error) {
        console.error("Error calling Grok API, falling back to heuristic:", error);
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

    // ── Receive photo from GeoCamera → here ──
    useEffect(() => {
        if (route.params?.photoUri && mediaUri !== route.params.photoUri) {
            setMediaUri(route.params.photoUri);
            setCaptureTime(Date.now());
            // We NO LONGER run authenticity here. It runs on submit.
            // Jump to step 1 (categories)
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

    // ── AI resource analysis (triggered when community solvable + enough info) ──
    useEffect(() => {
        if (!communitySolvable) { setAiResources(null); return; }
        setAiAnalyzing(true);
        const timer = setTimeout(async () => {
            const resources = await analyzeResourceRequirements(title, description, selectedCategory);
            setAiResources(resources);
            // Auto-add category tag if not already present
            const catLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || '';
            if (catLabel && !tags.includes(catLabel)) {
                setTags(prev => prev.includes(catLabel) ? prev : [catLabel, ...prev]);
            }
            setAiAnalyzing(false);
        }, 1800);
        return () => clearTimeout(timer);
    }, [communitySolvable, title, description, selectedCategory]);

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
                            <Text style={{ color: '#666', fontSize: 12 }}>Enable AI volunteer & resource matching.</Text>
                        </View>
                        <Switch value={communitySolvable} onValueChange={setCommunitySolvable} thumbColor={theme.colors.primaryGreen} trackColor={{ true: 'rgba(0, 200, 83, 0.4)' }} />
                    </View>

                    {communitySolvable && (
                        <View style={styles.aiSection}>
                            <Text style={styles.aiSectionTitle}>🤖 AI Resource Analysis</Text>
                            {aiAnalyzing ? (
                                <AILoadingIndicator />
                            ) : aiResources ? (
                                <>
                                    <View style={[styles.urgencyBadge, {
                                        backgroundColor: aiResources.urgency.includes('Critical') ? '#FFEBEE' :
                                            aiResources.urgency.includes('High') ? '#FFF3E0' : '#E8F5E9'
                                    }]}>
                                        <Text style={{ fontWeight: 'bold', color: aiResources.urgency.includes('Critical') ? '#C62828' : aiResources.urgency.includes('High') ? '#E65100' : '#2E7D32', fontSize: 12 }}>
                                            ⚡ Urgency: {aiResources.urgency}
                                        </Text>
                                        <Text style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                                            Est. {aiResources.estimatedHours}h to resolve
                                        </Text>
                                    </View>

                                    <Text style={styles.aiSubhead}>👥 Volunteers Needed</Text>
                                    {aiResources.recruitement.map((r, i) => (
                                        <View key={i} style={styles.recruitRow}>
                                            <Text style={styles.recruitText}>{r}</Text>
                                        </View>
                                    ))}

                                    <Text style={styles.aiSubhead}>🧱 Materials Required</Text>
                                    {aiResources.materials.map((m, i) => (
                                        <View key={i} style={styles.materialRow}>
                                            <Text style={{ color: '#555', fontSize: 13 }}>• {m}</Text>
                                        </View>
                                    ))}

                                    <Text style={styles.aiSubhead}>🔧 Equipment</Text>
                                    {aiResources.equipment.map((e, i) => (
                                        <View key={i} style={styles.materialRow}>
                                            <Text style={{ color: '#555', fontSize: 13 }}>• {e}</Text>
                                        </View>
                                    ))}
                                </>
                            ) : null}
                        </View>
                    )}
                </ScrollView>

                {/* ── Step 4: Preview ── */}
                <ScrollView key="3" style={{ flex: 1 }} contentContainerStyle={styles.page}>
                    <Text style={theme.typography.displayLarge}>Preview</Text>
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

                        {aiAuth && (
                            <View style={[styles.previewBadge, { backgroundColor: aiAuth.verdict.color + '22', marginTop: 12 }]}>
                                <Text style={[styles.previewBadgeText, { color: aiAuth.verdict.color }]}>
                                    {aiAuth.verdict.emoji} AI Trust: {aiAuth.score}/100 · {aiAuth.verdict.label}
                                </Text>
                            </View>
                        )}

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

                        {communitySolvable && aiResources && (
                            <View style={[styles.previewBadge, { backgroundColor: '#E3F2FD', marginTop: 8 }]}>
                                <Text style={[styles.previewBadgeText, { color: '#1565C0' }]}>
                                    🤖 AI: {aiResources.volunteers.count} volunteers · {aiResources.estimatedHours}h · {aiResources.urgency}
                                </Text>
                            </View>
                        )}

                        {tagNgo && (
                            <View style={[styles.previewBadge, { backgroundColor: '#E8EAF6', marginTop: 8 }]}>
                                <Text style={[styles.previewBadgeText, { color: '#3949AB' }]}>📢 NGOs will be notified</Text>
                            </View>
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
