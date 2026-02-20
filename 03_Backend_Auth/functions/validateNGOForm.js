const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { validateFormSchema, validateApplicationResponse } = require("./ngoFormEngine");

/**
 * Callable Function: validateFormSchemaAPI
 * Validates a newly created dynamic form schema before it is saved to Firestore.
 */
exports.validateFormSchemaAPI = onCall((request) => {
    const { schema } = request.data;

    // Ensure the user is authenticated (Optional based on security rules, but good practice here)
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in to validate form schemas.");
    }

    const result = validateFormSchema(schema);

    if (!result.isValid) {
        throw new HttpsError("invalid-argument", result.error);
    }

    return { success: true, message: "Schema is valid" };
});

/**
 * Callable Function: validateApplicationAPI
 * Validates a volunteer's form response against the associated schema before saving.
 */
exports.validateApplicationAPI = onCall((request) => {
    const { schema, answers } = request.data;

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in to apply.");
    }

    const result = validateApplicationResponse(schema, answers);

    if (!result.isValid) {
        throw new HttpsError("invalid-argument", result.error);
    }

    return { success: true, message: "Application is valid" };
});
