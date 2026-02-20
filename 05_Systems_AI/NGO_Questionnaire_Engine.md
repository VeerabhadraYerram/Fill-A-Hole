# NGO Dynamic Questionnaire Engine

This document outlines the architecture and design of the dynamic mini-form engine utilized by NGOs to create custom questionnaires for volunteer job applications within the Fill-A-Hole platform.

---

## 1. Standardized Schema Structure (`ngo_forms` collection)

Each job post can have one associated dynamic form. The form structure is stored as a JSON document in the root-level `ngo_forms` collection.

**Collection:** `ngo_forms`
**Document ID:** Same as `postId` (1:1 relationship)

**Schema Specification:**
- `formId` (String): Unique identifier for the form.
- `postId` (String): Reference to the job post.
- `fields` (Array of Objects): The dynamic form elements.
  - `id` (String): Unique identifier for the field (e.g., "experience_years").
  - `type` (String): Must be one of `text`, `number`, `checkbox`, `select`, `file_upload`.
  - `label` (String): The question shown to the user.
  - `required` (Boolean): Defines if the field is mandatory.
  - `options` (Array of Strings): Only used if `type` is `select`.

---

## 2. Validation Logic

The backend uses a Node.js module (`ngoFormEngine.js`) to rigorously validate both the creation of the schema and the volunteer's submitted responses.

### `validateFormSchema(schema)`
1. Ensures all required envelope keys exist.
2. Iterates over `fields` to ensure valid `id`, `label`, `type`, and `required` parameters.
3. Enforces that `type` is one of the 5 allowed properties.
4. If `type === 'select'`, verifies the presence of an `options` array.
5. **Security:** Throws an error if any unauthorized keys are injected into the field definition to prevent schema pollution.

### `validateApplicationResponse(schema, answers)`
1. Verifies that the volunteer's answers object is strictly a dictionary map of `{ fieldId: value }`.
2. Evaluates the answers against the specific `type` defined in the schema (e.g., throwing an error if a user passes a string to a `number` field).
3. **Security:** Rejects submissions that contain `fieldId`s not present in the original schema (prevents adding arbitrary admin flags like `{ isAdmin: true }`).
4. Checks explicitly for the presence of all `required: true` fields.

---

## 3. Example Form JSON

Below is an example of what an NGO submits to configure their questionnaire.

```json
{
  "formId": "form_102938",
  "postId": "post_7748AAA",
  "fields": [
    {
      "id": "full_name",
      "type": "text",
      "label": "What is your full name?",
      "required": true
    },
    {
      "id": "age",
      "type": "number",
      "label": "What is your age?",
      "required": true
    },
    {
      "id": "has_transport",
      "type": "checkbox",
      "label": "Do you have your own transportation?",
      "required": false
    },
    {
      "id": "shift_preference",
      "type": "select",
      "label": "Which shift do you prefer?",
      "required": true,
      "options": ["Morning (8 AM - 12 PM)", "Afternoon (1 PM - 5 PM)"]
    },
    {
      "id": "id_proof",
      "type": "file_upload",
      "label": "Please upload an ID proof (Firebase Storage URL)",
      "required": true
    }
  ]
}
```

---

## 4. Example Application Submission JSON

Below is an example of what the frontend mobile app sends when a volunteer applies for the job.

**Collection:** `applications`
**Document ID:** Auto-generated

```json
{
  "applicationId": "app_99881122",
  "postId": "post_7748AAA",
  "applicantId": "user_citizen_456",
  "status": "pending",
  "submittedAt": "2026-02-20T19:30:00Z",
  "answers": {
    "full_name": "Lalit Sharma",
    "age": 28,
    "has_transport": true,
    "shift_preference": "Morning (8 AM - 12 PM)",
    "id_proof": "https://firebasestorage.googleapis.com/.../id_proof.jpg"
  }
}
```

---

## 5. Backend Flow Explanation

The process follows a strict 3-tier flow from creation to application submission to ensure data integrity and security.

### Phase 1: NGO Creates the Form (Schema Definition)
1. **Frontend:** NGO creates a custom form via the UI.
2. **Cloud Function / Firestore Rule:** Payload hits the backend.
3. **Engine Evaluation:** The backend passes the payload to `validateFormSchema(schema)`.
4. **Storage:** If valid, the document is written to the `ngo_forms` collection. No extra, undefined properties bypass the sanitizer.

### Phase 2: Volunteer Fetches the Form
1. Mobile app displays the job post.
2. App queries the `ngo_forms` collection using the `postId`.
3. The UI dynamically renders text inputs, numerical inputs, checkboxes, dropdowns, and file upload modules based strictly on the JSON `fields` array.

### Phase 3: Volunteer Submits Application
1. **Action:** Volunteer taps "Submit Application". The form data is bundled into an `answers` object.
2. **Cloud Function Interception (`onApplicationSubmit`):**
   - The backend retrieves the authoritative schema directly from the `ngo_forms` collection.
   - It executes `validateApplicationResponse(schema, incomingAnswers)`.
3. **Security Check:**
   - Type verification ensures `age` is effectively an integer, not a malicious string.
   - Requirement verification ensures no `required: true` fields were bypassed.
   - Extra-field verification ensures a user didn't attach `"approved": true` in the answers payload to cheat the system.
4. **Storage:** The verified application is committed to the `applications` collection. An admin notification can subsequently be fired off to the NGO.
