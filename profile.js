// profile.js
import { auth } from "./firebase-config.js";
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

import { db } from "./firebase-config.js";

// Helper to get dynamic downloads & views from localStorage (simulate activity)
// We extend original logic: downloads + views counters can be stored separately for richer stats
function loadUserStats() {
  // favorites from localStorage (preserved from your original)
  const favsRaw = localStorage.getItem("favs");
  let favorites = [];
  try {
    favorites = favsRaw ? JSON.parse(favsRaw) : [];
  } catch(e) { favorites = []; }
  
  // Downloads: store separate count for demo realism
  let downloads = localStorage.getItem("user_downloads");
  if (downloads === null) {
    // seed some random starter number? just make it 0 initially but you can keep persistent
    downloads = 0;
    localStorage.setItem("user_downloads", "0");
  } else {
    downloads = parseInt(downloads, 10);
  }
  
  // Views: store separate simulated counter based on page visits or increment logic
  let views = localStorage.getItem("user_views");
  if (views === null) {
    views = 42;  // a little starting charm
    localStorage.setItem("user_views", views.toString());
  } else {
    views = parseInt(views, 10);
  }
  
  // increase views by 1 each time profile loads (realistic user stats)
  views += 1;
  localStorage.setItem("user_views", views.toString());
  
  return { favorites, downloads, views };
}

async function loadRealStats() {

  const snapshot = await getDocs(
    collection(db, "wallpapers")
  );

  let totalViews = 0;
  let totalDownloads = 0;

  snapshot.forEach((doc) => {

    const wall = doc.data();

    totalViews += wall.views || 0;
    totalDownloads += wall.downloads || 0;

  });

  const viewEl =
    document.getElementById("viewCount");

  const downloadEl =
    document.getElementById("downloadCount");

  if (viewEl) {
    viewEl.innerText = totalViews;
  }

  if (downloadEl) {
    downloadEl.innerText = totalDownloads;
  }

}

function updateStatsUI() {
  const { favorites, downloads, views } = loadUserStats();
  const favCountEl = document.getElementById("favCount");
  const downloadCountEl = document.getElementById("downloadCount");
  const viewCountEl = document.getElementById("viewCount");
  
  if (favCountEl) favCountEl.innerText = favorites.length;
  if (downloadCountEl) downloadCountEl.innerText = downloads;
  if (viewCountEl) viewCountEl.innerText = views;
  
  // dynamic quote based on stats
  const quoteSpan = document.getElementById("dynamicQuote");
  if (quoteSpan) {
    const totalFavs = favorites.length;
    if (totalFavs > 20) quoteSpan.innerText = "wallpaper galaxy master ✨";
    else if (totalFavs > 5) quoteSpan.innerText = "curating cosmic favorites";
    else quoteSpan.innerText = "start your astro collection today";
    
    if (downloads > 50) quoteSpan.innerText = "legendary downloader 🚀";
    else if (views > 200) quoteSpan.innerText = "viral cosmic explorer 🌌";
  }
}

// increment downloads simulation if needed? already the download count will only be changed when user downloads elsewhere.
// But to maintain consistency we also provide a method that could be used on wallpaper page. For profile, we update UI.

// Add event listener for manual download increment (example cross-module hook not required, but we add global function for dev)
window.incrementDownloads = function(amount = 1) {
  let current = localStorage.getItem("user_downloads");
  let newCount = (current ? parseInt(current, 10) : 0) + amount;
  localStorage.setItem("user_downloads", newCount.toString());
  updateStatsUI();
  return newCount;
};

// onAuthStateChanged handles redirect and display of user info
// ==============================
// AUTH CHECK + LOAD USER PROFILE
// ==============================
// ==============================
// AUTH CHECK + LOAD USER PROFILE
// ==============================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await setDoc(
  doc(db, "users", user.uid),
  {
    email: user.email,
    name: user.displayName || "",
    lastLogin: Date.now()
  },
  { merge: true }
);

const userRef = doc(db, "users", user.uid);
const userSnap = await getDoc(userRef);

const displayName =
  userSnap.exists()
    ? userSnap.data().name || "AstroWalls User"
    : "AstroWalls User";

  const email =
    user.email || "No Email";

  // Name
  document.getElementById("profileName").innerText =
    displayName;

  // Email
  document.getElementById("accountEmail").innerText =
    email;

  document.getElementById("profileEmail").innerHTML =
    `<i class="fas fa-envelope"></i> <span>${email}</span>`;

  // Account Creation Date
  const creationDateEl =
    document.getElementById("creationDate");

  if (creationDateEl) {

   const creationTime = user.metadata?.creationTime;
    if (creationTime) {
      const createdDate = new Date(creationTime);
     creationDateEl.textContent = createdDate.toLocaleDateString("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric"
});
    } else {
      creationDateEl.textContent = "Not available";
    }

  }

  // Profile Photo
  const profilePhoto =document.getElementById("profilePhoto");

  if (profilePhoto) {

    if (user.photoURL) {

      profilePhoto.src = user.photoURL;

    } else {

      profilePhoto.src =
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(displayName);

    }

  }
const accountTypeEl =
  document.getElementById("accountType");

const adminEmail = "tushansinha01@gmail.com";

if (accountTypeEl) {

  if (email === adminEmail) {

    accountTypeEl.innerText =
      "👑 Administrator";

  } else {

    accountTypeEl.innerText =
      "⭐ Explorer";

  }

}

const userRef = doc(db, "users", user.uid);

const userSnap = await getDoc(userRef);

if (userSnap.exists()) {

  const data = userSnap.data();

  if (data.name) {
    document.getElementById("profileName").innerText =
      data.name;
  }

  if (data.photo) {
    document.getElementById("profilePhoto").src =
      data.photo;
  }

}
  // Stats
  updateStatsUI();
  await loadRealStats();

  // Storage listener
  window.addEventListener("storage", (e) => {

    if (
      e.key === "favs" ||
      e.key === "user_downloads" ||
      e.key === "user_views"
    ) {
      updateStatsUI();
    }

  });

});

try {

  const response =
    await fetch("https://ipapi.co/json/");

  const data =
    await response.json();

  document.getElementById("countryName")
    .textContent = data.country_name;

} catch (error) {

  document.getElementById("countryName")
    .textContent = "Unknown";

}

const saveBtn =
  document.getElementById("saveProfileBtn");

if (saveBtn) {

  saveBtn.addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user) return;

    const name =
      document.getElementById("editName").value.trim();

    const photo =
      document.getElementById("editPhoto").value.trim();

    try {

      await setDoc(
        doc(db, "users", user.uid),
        {
          name,
          photo
        },
        { merge: true }
      );

      alert("✅ Profile Updated");

      location.reload();

    } catch (err) {

      console.error(err);
      alert("❌ Update Failed");

    }

  });

}

// handle logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      // clear all app data? original clears all localStorage, we do the same but keep only if required.
      // original had localStorage.clear(); we keep to match expected behavior, but we also clear stats.
      localStorage.clear();
      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}

// if user wants to add demo downloads increment from the UI double-click stat-box? Not needed but you can extend.
// For better synergy, attach a small ripple effect on stats boxes (cosmetic)
document.querySelectorAll('.stat-box').forEach(box => {
  box.addEventListener('click', () => {
    // just a fun micro-interaction, doesn't break flow
    box.style.transform = 'scale(0.98)';
    setTimeout(() => { box.style.transform = ''; }, 150);
  });
});

// Export utility for external pages (optional but safe)
export { loadUserStats, updateStatsUI };