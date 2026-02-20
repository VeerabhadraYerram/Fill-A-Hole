/**
 * ngoFormEngine.js
 * 
 * Dynamic Questionnaire Engine for NGO job posts.
 * Includes validation logic to enforce schema rules for dynamic forms and user submissions.
 */

const ALLOWED_FIELD_TYPES = ['text', 'number', 'checkbox', 'select', 'file_upload'];

/**
 * Validates the structure of a dynamic form schema created by an NGO.
 * 
 * @param {Object} schema - The form schema to validate.
 * @returns {Object} { isValid: boolean, error: string | null }
 */
function validateFormSchema(schema) {
    if (!schema || typeof schema !== 'object') {
        return { isValid: false, error: 'Schema must be a valid JSON object.' };
    }

    if (!schema.formId || typeof schema.formId !== 'string') {
        return { isValid: false, error: 'Schema must contain a string "formId".' };
    }

    if (!schema.postId || typeof schema.postId !== 'string') {
        return { isValid: false, error: 'Schema must contain a string "postId" linking to the job post.' };
    }

    if (!Array.isArray(schema.fields)) {
        return { isValid: false, error: '"fields" must be an array.' };
    }

    const seenIds = new Set();

    for (const field of schema.fields) {
        if (!field.id || typeof field.id !== 'string') {
            return { isValid: false, error: 'Each field must have a string "id".' };
        }

        if (seenIds.has(field.id)) {
            return { isValid: false, error: `Duplicate field id found: ${field.id}` };
        }
        seenIds.add(field.id);

        if (!ALLOWED_FIELD_TYPES.includes(field.type)) {
            return { isValid: false, error: `Invalid field type "${field.type}" for field "${field.id}". Allowed types: ${ALLOWED_FIELD_TYPES.join(', ')}` };
        }

        if (!field.label || typeof field.label !== 'string') {
            return { isValid: false, error: `Field "${field.id}" must have a string "label".` };
        }

        if (typeof field.required !== 'boolean') {
            return { isValid: false, error: `Field "${field.id}" must have a boolean "required" property.` };
        }

        // Specific rules for 'select' type (dropdown)
        if (field.type === 'select') {
            if (!Array.isArray(field.options) || field.options.length === 0) {
                return { isValid: false, error: `Field "${field.id}" of type "select" must have a non-empty "options" array.` };
            }
            if (!field.options.every(opt => typeof opt === 'string')) {
                return { isValid: false, error: `Field "${field.id}" options must be strings.` };
            }
        }

        // Ensure no extra fields to prevent schema pollution
        const allowedKeys = ['id', 'type', 'label', 'required', 'options'];
        const actualKeys = Object.keys(field);
        const extraKeys = actualKeys.filter(k => !allowedKeys.includes(k));
        if (extraKeys.length > 0) {
            return { isValid: false, error: `Field "${field.id}" contains unauthorized keys: ${extraKeys.join(', ')}` };
        }
    }

    return { isValid: true, error: null };
}

/**
 * Validates a volunteer's application responses against the NGO's form schema.
 * 
 * @param {Object} schema - The validated form schema.
 * @param {Object} answers - The volunteer's submitted responses as key-value pairs { fieldId: value }.
 * @returns {Object} { isValid: boolean, error: string | null }
 */
function validateApplicationResponse(schema, answers) {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return { isValid: false, error: 'Answers must be a JSON object mapping field IDs to values.' };
    }

    const schemaFields = new Map(schema.fields.map(f => [f.id, f]));

    // Check for required fields
    for (const field of schema.fields) {
        const hasAnswer = answers.hasOwnProperty(field.id);
        if (field.required && (!hasAnswer || answers[field.id] === "" || answers[field.id] === null || answers[field.id] === undefined)) {
            return { isValid: false, error: `Required field "${field.id}" is missing.` };
        }
    }

    // Validate provided answers and prevent injection of extra fields
    for (const [key, value] of Object.entries(answers)) {
        if (!schemaFields.has(key)) {
            return { isValid: false, error: `Invalid field ID "${key}" provided in answers.` };
        }

        const fieldSchema = schemaFields.get(key);

        // Type validation
        switch (fieldSchema.type) {
            case 'text':
            case 'file_upload':
                if (typeof value !== 'string') {
                    return { isValid: false, error: `Field "${key}" must be a string.` };
                }
                break;
            case 'number':
                if (typeof value !== 'number') {
                    return { isValid: false, error: `Field "${key}" must be a number.` };
                }
                break;
            case 'checkbox':
                if (typeof value !== 'boolean') {
                    return { isValid: false, error: `Field "${key}" must be a boolean.` };
                }
                break;
            case 'select':
                if (typeof value !== 'string') {
                    return { isValid: false, error: `Field "${key}" must be a string.` };
                }
                if (!fieldSchema.options.includes(value)) {
                    return { isValid: false, error: `Value "${value}" for field "${key}" is not a valid option.` };
                }
                break;
            default:
                return { isValid: false, error: `Unknown field type in schema for field "${key}".` };
        }
    }

    return { isValid: true, error: null };
}

module.exports = {
    validateFormSchema,
    validateApplicationResponse
};
