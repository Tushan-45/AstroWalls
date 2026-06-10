import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth, db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// If already logged in, go straight to main page
onAuthStateChanged(auth, user => {
  if (user) window.location.href = "index.html";
});

let isLogin = true;

const title      = document.getElementById("title");
const subtitle   = document.getElementById("subtitle");
const authBtn    = document.getElementById("authBtn");
const btnText    = document.getElementById("btnText");
const toggle     = document.getElementById("toggle");
const text       = document.getElementById("text");
const forgotLink = document.getElementById("forgotLink");

toggle.addEventListener("click", (e) => {
    e.preventDefault();
    isLogin = !isLogin;

    if (isLogin) {
        title.textContent        = "Welcome back";
        subtitle.textContent     = "Sign in to your account to continue";
        btnText.textContent      = "Sign In";
        text.textContent         = "Don't have an account?";
        toggle.textContent       = "Create one";
        forgotLink.style.display = "block";
    } else {
        title.textContent        = "Create account";
        subtitle.textContent     = "Join AstroWalls and start exploring";
        btnText.textContent      = "Create Account";
        text.textContent         = "Already have an account?";
        toggle.textContent       = "Sign in";
        forgotLink.style.display = "none";
    }
});

authBtn.addEventListener("click", async () => {
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showToast("Please fill in all fields", "error");
        return;
    }

    authBtn.classList.add("loading");
    btnText.textContent = isLogin ? "Signing in…" : "Creating account…";

    try {
       if (isLogin) {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem("userEmail", email);
            // Update lastLogin in Firestore
            await setDoc(doc(db, "users", cred.user.uid), {
                email: email,
                lastLogin: Date.now()
            }, { merge: true });
            showToast("Signed in successfully!", "success");
            setTimeout(() => { window.location.href = "index.html"; }, 800);
        } else {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            localStorage.setItem("userEmail", email);
            // Save new user to Firestore
            await setDoc(doc(db, "users", cred.user.uid), {
                email: email,
                name: email.split("@")[0],
                photo: "",
                createdAt: Date.now(),
                lastLogin: Date.now()
            });
            showToast("Account created! Welcome 🎉", "success");
            setTimeout(() => { window.location.href = "index.html"; }, 800);
        }
    } catch (error) {
        const msg = friendlyError(error.code);
        showToast(msg, "error");
        authBtn.classList.remove("loading");
        btnText.textContent = isLogin ? "Sign In" : "Create Account";
    }
});

function friendlyError(code) {
    const map = {
        "auth/invalid-email":          "Please enter a valid email address.",
        "auth/user-not-found":         "No account found with this email.",
        "auth/wrong-password":         "Incorrect password. Please try again.",
        "auth/invalid-credential":     "Incorrect email or password.",
        "auth/email-already-in-use":   "An account with this email already exists.",
        "auth/weak-password":          "Password must be at least 6 characters.",
        "auth/too-many-requests":      "Too many attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
    };
    return map[code] || "Something went wrong. Please try again.";
}

function showToast(message, type = "info") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className   = "toast";
    toast.textContent = message;

    Object.assign(toast.style, {
        position:     "fixed",
        bottom:       "24px",
        left:         "50%",
        transform:    "translateX(-50%) translateY(8px)",
        background:   type === "error" ? "#2a1a1a" : "#1a2a1a",
        border:       `1px solid ${type === "error" ? "rgba(230,80,80,0.3)" : "rgba(100,200,100,0.3)"}`,
        color:        type === "error" ? "#f87171" : "#86efac",
        padding:      "12px 20px",
        borderRadius: "10px",
        fontSize:     "13px",
        fontFamily:   "'DM Sans', sans-serif",
        fontWeight:   "400",
        whiteSpace:   "nowrap",
        zIndex:       "9999",
        opacity:      "0",
        transition:   "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity   = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
    });

    setTimeout(() => {
        toast.style.opacity   = "0";
        toast.style.transform = "translateX(-50%) translateY(8px)";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}