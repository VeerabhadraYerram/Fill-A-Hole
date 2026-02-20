# Frontend Integration of NGO Questionnaire

This document explains how the React Native frontend application (`fill_a_hole_ui`) integrates with the backend NGO Dynamic Form Engine. 

---

## 1. UI Architecture Location
The dynamic form views are located in the `01_UI_Architect/fill_a_hole_ui/src` folder:
- **Screen:** `src/screens/NGOFormsScreen.js`
- **Component Logic:** `src/components/NGOFormComponents.js`

The interface dynamically switches between two views using `useState('volunteer')`:
1. **Volunteer View:** Displays an `ApplicationStatusWizard` and uses the `FormRenderer` to parse the dynamic JSON schema to show inputs.
2. **Admin View:** Currently uses a mocked `DynamicFormBuilder` which allows administrators to drag-and-drop or define the form fields (text, multiple choice, photo upload). 

---

## 2. Dynamic Form Renderer Implementation

The `FormRenderer` (found in `src/components/NGOFormComponents.js`) receives the JSON schema directly from the `jobForms` Firestore collection and dynamically loops over the instructions to render native React Components.

### Example Schematic Conversion in Frontend:

If the Firestore schema returns:
```json
 { "label": "Upload ID Proof", "type": "photo" }
```

The frontend map function dynamically returns the `QuestionCard` component matching type `'photo'`:
```javascript
// From src/components/NGOFormComponents.js
{type === 'photo' && (
    <TouchableOpacity style={styles.photoUploadBtn}>
        <Text style={{ fontSize: 24, marginBottom: 4 }}>📸</Text>
        <Text style={{ color: '#666' }}>Tap to upload verified photo</Text>
    </TouchableOpacity>
)}
```

### Capturing Answers:
While the current UI is a mockup, the fully integrated version will utilize React state within `FormRenderer` to capture the responses.
```javascript
// Example integrated React state for FormRenderer
const [answers, setAnswers] = useState({});

const handleChange = (fieldId, value) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
};
```

---

## 3. Invoking the Backend Validation Logic

The backend validation engine (`ngoFormEngine.js`) acts as the gatekeeper. The frontend does not rewrite this complex logic; it simply handles the UI state and API requests.

### Admin Side (Form Creation)
1. The `DynamicFormBuilder` on the frontend generates the JSON schema array based on the admin's GUI inputs.
2. When the Admin hits "Publish Form", the app calls the Firebase Cloud Function.
3. **Backend check:** The Node framework runs the payload through `validateFormSchema()`.
4. **Result:** If it passes, the form is published. If it fails, the backend throws an HTTP 400 error, which the React Native app catches to show a red error toast on the screen.

### Volunteer Side (Application Submission)
1. The volunteer presses the submit button in `FormRenderer`.
2. The React `answers` dictionary is submitted as a payload to the backend.
3. **Backend check:** The backend fetches the authoritative schema from Firestore and executes `validateApplicationResponse(schema, payload)`.
4. **Result:** If it falls short of requirements (e.g., missed a `required: true` or sent a string instead of a number), the application is blocked and the user gets a UI popup informing them of the missing field.
