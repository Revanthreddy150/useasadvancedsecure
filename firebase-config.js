// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDt8SROwFORTZFqVe5xLc3nlDukbOAgdzs",
    authDomain: "useasnotes.firebaseapp.com",
    projectId: "useasnotes",
    storageBucket: "useasnotes.firebasestorage.app",
    appId: "1:1066601715098:web:3b424d6e097d9112d09623"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Pre-defined document references
export const docRef = doc(db, "portal", "final_v4_data");
export const countRef = doc(db, "portal", "visitor_stats");
export const settingsRef = doc(db, "portal", "app_settings");
export const msgRef = doc(db, "portal", "messages");
