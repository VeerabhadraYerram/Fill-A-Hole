const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { estimateRequirements } = require("./AIEstimationEngine");

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

    const descriptionText = `Title: ${post.title}\nDescription: ${post.description}\nCategory: ${post.category}`;

    try {
        const aiEstimate = await estimateRequirements(descriptionText);

        console.log(`Generated AI Estimate from Grok for ${event.params.postId}:`, aiEstimate);

        // Update Firestore
        await postSnapshot.ref.update({
            aiEstimate: aiEstimate
        });
    } catch (error) {
        console.error("Error generating AI estimate:", error);
    }
});
