const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {GoogleGenerativeAI, Type} = require("@google/generative-ai");

// Access API Key from Environment/Secret (ensure this is set in Firebase config)
const API_KEY = process.env.GEMINI_API_KEY;

exports.estimateResources = onDocumentCreated("posts/{postId}", async (event) => {
    const postSnapshot = event.data;
    if (!postSnapshot) {
        return;
    }
    const post = postSnapshot.data();

    // Check if the community can step in and solve it, and if it doesn't already have an estimate
    if (!post.isCommunitySolvable || post.aiEstimate) {
        return;
    }

    if (!API_KEY) {
        console.error("Missing Gemini API Key. Cannot run AI estimation.");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    // Using generative-ai for structured JSON output
    const schema = {
        type: Type.OBJECT,
        properties: {
            volunteersNeeded: {
                type: Type.INTEGER,
                description: "Number of volunteers required to solve the issue",
            },
            fundsRequired: {
                type: Type.INTEGER,
                description: "Total estimated funds requested in USD/INR to solve this issue (0 if none)",
            },
            materialsNeeded: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                },
                description: "List of strings describing the materials needed (e.g. '2 bags cement', '1 shovel')",
            },
        },
        required: ["volunteersNeeded", "fundsRequired", "materialsNeeded"],
    };

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    const prompt = `Based on the following civic issue report, estimate the resources needed to solve it.\n\n` +
        `Title: ${post.title}\n` +
        `Description: ${post.description}\n` +
        `Category: ${post.category}`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const aiEstimate = JSON.parse(responseText);

        console.log(`Generated AI Estimate for ${event.params.postId}:`, aiEstimate);

        // Update Firestore
        await postSnapshot.ref.update({
            aiEstimate: aiEstimate
        });
    } catch (error) {
        console.error("Error generating AI estimate:", error);
    }
});
