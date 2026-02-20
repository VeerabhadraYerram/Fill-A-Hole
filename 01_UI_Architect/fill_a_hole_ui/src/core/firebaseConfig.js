import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB4EBgfwZQt-TKw47mpbJAHgYMMymsnFh8",
    authDomain: "fill-a-hole.firebaseapp.com",
    projectId: "fill-a-hole",
    storageBucket: "fill-a-hole.firebasestorage.app",
    messagingSenderId: "645504403281",
    appId: "1:645504403281:web:9665981237605369a87570",
    measurementId: "G-FF5XZCB6M1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
