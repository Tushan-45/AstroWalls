// profile.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ══════════════════════════════════════════════
   LOCAL STATS
══════════════════════════════════════════════ */
function loadUserStats() {
  let favorites = [];
  try { favorites = JSON.parse(localStorage.getItem("favs") || "[]"); } catch(e) {}

  let downloads = localStorage.getItem("user_downloads");
  if (downloads === null) {
    downloads = 0;
    localStorage.setItem("user_downloads", "0");
  } else {
    downloads = parseInt(downloads, 10);
  }

  let views = localStorage.getItem("user_views");
  if (views === null) {
    views = 0;
    localStorage.setItem("user_views", "0");
  } else {
    views = parseInt(views, 10);
  }

  // increment views each time profile loads
  views += 1;
  localStorage.setItem("user_views", views.toString());

  return { favorites, downloads, views };
}

async function loadRealStats(uid) {
  try {
    const userSnap   = await getDoc(doc(db, "users", uid));
    const viewEl     = document.getElementById("viewCount");
    const downloadEl = document.getElementById("downloadCount");
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (viewEl)     viewEl.innerText     = data.views     || 0;
      if (downloadEl) downloadEl.innerText = data.downloads || 0;
    } else {
      if (viewEl)     viewEl.innerText     = 0;
      if (downloadEl) downloadEl.innerText = 0;
    }
  } catch(e) {
    console.error("loadRealStats error:", e);
  }
}


/* ══════════════════════════════════════════════
   UPDATE STATS UI
══════════════════════════════════════════════ */
function updateStatsUI() {
  const { favorites, downloads, views } = loadUserStats();

  const favCountEl      = document.getElementById("favCount");
  const downloadCountEl = document.getElementById("downloadCount");
  const viewCountEl     = document.getElementById("viewCount");

  if (favCountEl)      favCountEl.innerText      = favorites.length;
  if (downloadCountEl) downloadCountEl.innerText = downloads;
  if (viewCountEl)     viewCountEl.innerText     = views;

  // dynamic quote
  const quoteSpan = document.getElementById("dynamicQuote");
  if (quoteSpan) {
    if      (downloads > 50)        quoteSpan.innerText = "legendary downloader 🚀";
    else if (views > 200)           quoteSpan.innerText = "viral cosmic explorer 🌌";
    else if (favorites.length > 20) quoteSpan.innerText = "wallpaper galaxy master ✨";
    else if (favorites.length > 5)  quoteSpan.innerText = "curating cosmic favorites";
    else                            quoteSpan.innerText = "start your astro collection today";
  }
}

/* ══════════════════════════════════════════════
   GLOBAL DOWNLOAD INCREMENT HOOK
══════════════════════════════════════════════ */
window.incrementDownloads = function(amount = 1) {
  const current  = parseInt(localStorage.getItem("user_downloads") || "0", 10);
  const newCount = current + amount;
  localStorage.setItem("user_downloads", newCount.toString());
  updateStatsUI();
  return newCount;
};

/* ══════════════════════════════════════════════
   AUTH + PROFILE LOAD
══════════════════════════════════════════════ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const adminEmail  = "tushansinha01@gmail.com";
  const displayName = user.displayName || user.email.split("@")[0] || "AstroWalls User";
  const email       = user.email || "No Email";

  // Update lastLogin in Firestore
 await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    lastLogin: Date.now()
  }, { merge: true }); 

   // ── NAME (will be overridden by Firestore data below)

  const profileNameEl = document.getElementById("profileName");

  // ── EMAIL
  const accountEmailEl = document.getElementById("accountEmail");
  if (accountEmailEl) accountEmailEl.innerText = email;

  const profileEmailEl = document.getElementById("profileEmail");
  if (profileEmailEl) profileEmailEl.innerHTML = `<i class="fas fa-envelope"></i> <span>${email}</span>`;

  // ── ACCOUNT TYPE
  const accountTypeEl = document.getElementById("accountType");
  if (accountTypeEl) {
    accountTypeEl.innerText = email === adminEmail ? "👑 Administrator" : "⭐ Explorer";
  }

  // ── CREATION DATE
  const creationDateEl = document.getElementById("creationDate");
  if (creationDateEl) {
    const creationTime = user.metadata?.creationTime;
    if (creationTime) {
      creationDateEl.textContent = new Date(creationTime).toLocaleDateString("en-US", {
        day: "numeric", month: "long", year: "numeric"
      });
    } else {
      // fallback: read from Firestore
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().createdAt) {
          creationDateEl.textContent = new Date(userSnap.data().createdAt).toLocaleDateString("en-US", {
            day: "numeric", month: "long", year: "numeric"
          });
        } else {
          creationDateEl.textContent = "—";
        }
      } catch(e) {
        creationDateEl.textContent = "—";
      }
    }
  }

  // ── PROFILE PHOTO
  const profilePhoto = document.getElementById("profilePhoto");
  if (profilePhoto) {
    profilePhoto.src = user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D0D0D&color=d9ff3f`;
  }

  // ── LOAD FIRESTORE USER DOC (name/photo overrides)
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      // Use saved name, fallback to email prefix
      const savedName = (data.name && data.name.trim()) ? data.name : displayName;
      if (profileNameEl) profileNameEl.innerText = savedName;
      const editNameEl = document.getElementById("editName");
      if (editNameEl) editNameEl.value = savedName;

      if (data.photo && data.photo.trim() !== "" && profilePhoto) {
        profilePhoto.src = data.photo;
        const editPhotoEl = document.getElementById("editPhoto");
        if (editPhotoEl) editPhotoEl.value = data.photo;
      }
    } else {
      // No doc yet, use displayName fallback
      if (profileNameEl) profileNameEl.innerText = displayName;
    }
  } catch(e) {
    console.error("Failed to load user doc:", e);
    if (profileNameEl) profileNameEl.innerText = displayName;
  }

  // ── COUNTRY VIA IP
  try {
    const res  = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const countryEl = document.getElementById("countryName");
    if (countryEl) countryEl.textContent = data.country_name || "Unknown";
  } catch(e) {
    const countryEl = document.getElementById("countryName");
    if (countryEl) countryEl.textContent = "Unknown";
  }

  // ── STATS
  updateStatsUI();
  await loadRealStats(user.uid);

  // ── STORAGE LISTENER (sync stats across tabs)
  window.addEventListener("storage", (e) => {
    if (["favs", "user_downloads", "user_views"].includes(e.key)) {
      updateStatsUI();
    }
  });
});

/* ══════════════════════════════════════════════
   SAVE PROFILE BUTTON
══════════════════════════════════════════════ */
const saveBtn = document.getElementById("saveProfileBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const user  = auth.currentUser;
    if (!user) return;

    const name  = document.getElementById("editName")?.value.trim();
    const photo = document.getElementById("editPhoto")?.value.trim();

    if (!name && !photo) return;

    try {
      const updates = {};
      if (name)  updates.name  = name;
      if (photo) updates.photo = photo;

      await setDoc(doc(db, "users", user.uid), updates, { merge: true });

      if (name  && document.getElementById("profileName"))  document.getElementById("profileName").innerText = name;
      if (photo && document.getElementById("profilePhoto")) document.getElementById("profilePhoto").src      = photo;

      // visual feedback
      saveBtn.innerText = "✅ Saved!";
      setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Profile';
      }, 2000);
    } catch(e) {
      console.error("Save failed:", e);
      saveBtn.innerText = "❌ Failed";
      setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Profile';
      }, 2000);
    }
  });
}

/* ══════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════ */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      window.location.href = "login.html";
    } catch(e) {
      console.error("Logout error:", e);
    }
  });
}

/* ══════════════════════════════════════════════
   STAT BOX RIPPLE EFFECT
══════════════════════════════════════════════ */
document.querySelectorAll('.stat-box').forEach(box => {
  box.addEventListener('click', () => {
    box.style.transform = 'scale(0.98)';
    setTimeout(() => { box.style.transform = ''; }, 150);
  });
});

/* ══════════════════════════════════════════════
   EXPORTS
══════════════════════════════════════════════ */
export { loadUserStats, updateStatsUI };