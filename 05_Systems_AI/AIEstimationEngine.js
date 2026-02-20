/**
 * AIEstimationEngine.js
 * 
 * AI integration using Grok (xAI) for suggesting volunteer count and time 
 * based on civic issue descriptions.
 * 
 * API: https://api.x.ai/v1/chat/completions
 */

/**
 * Estimates volunteer count and time required for a given issue description using Grok (xAI) API.
 * 
 * @param {string} issueDescription - The description of the civic issue.
 * @param {Object} options - Optional parameters.
 * @param {string} options.apiKey - The xAI API key. If not provided, standard env `XAI_API_KEY` is used.
 * @returns {Promise<Object>} The estimation result { volunteers: number, timeHours: number, confidence: number }
 */
async function estimateRequirements(issueDescription, options = {}) {
    const apiKey = options.apiKey || process.env.XAI_API_KEY;

    // Use native fetch (requires Node 18+)
    const fetchFn = typeof fetch !== "undefined" ? fetch : require("node-fetch");

    if (!apiKey) {
        console.warn("No XAI_API_KEY provided. Using fallback heuristic estimation.");
        return fallbackHeuristicEstimation(issueDescription);
    }

    try {
        const response = await fetchFn("https://api.x.ai/v1/chat/completions", {
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
                        content: "You are an AI assistant for a civic issue tracking platform. Given an issue description, estimate the required number of volunteers and the estimated time in hours to resolve it. Return your answer strictly as a JSON object with exactly these properties: 'volunteers' (number), 'timeHours' (number), and 'confidence' (number between 0 and 1)."
                    },
                    {
                        role: "user",
                        content: issueDescription
                    }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let resultContent = data.choices[0].message.content;

        // Clean up markdown formatting if the model returns it
        if (resultContent.includes("```json")) {
            resultContent = resultContent.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        const parsedResult = JSON.parse(resultContent);
        return parsedResult;
    } catch (error) {
        console.error("Error calling xAI API, falling back to heuristic:", error);
        return fallbackHeuristicEstimation(issueDescription);
    }
}

/**
 * Fallback heuristics used when API key is missing or API fails.
 */
function fallbackHeuristicEstimation(description) {
    const text = description.toLowerCase();
    let volunteers = 1;
    let timeHours = 1;

    if (text.includes("massive") || text.includes("large") || text.includes("huge")) {
        volunteers += 3;
        timeHours += 4;
    }

    if (text.includes("quick") || text.includes("small") || text.includes("minor")) {
        timeHours = Math.max(0.5, timeHours - 0.5);
    }

    if (text.includes("heavy") || text.includes("cleanup") || text.includes("debris")) {
        volunteers += 2;
        timeHours += 2;
    }

    return {
        volunteers,
        timeHours,
        confidence: 0.6 // Lower confidence for heuristic fallback
    };
}

module.exports = {
    estimateRequirements
};
