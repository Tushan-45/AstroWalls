import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzNWt6-3zVZUTqHF2KiXOdzv5Js8Sa-Qw",
  authDomain: "wallpaperhub-59aa5.firebaseapp.com",
  projectId: "wallpaperhub-59aa5",
  storageBucket: "wallpaperhub-59aa5.firebasestorage.app",
  messagingSenderId: "1067631192577",
  appId: "1:1067631192577:web:af3140c350bec490e76e00",
  measurementId: "G-LWKGRB0ZMV"
};

const app =
  getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);