/* ══════════════════════════════════════════════
   WallpaperHub — script.js  (live counters)
══════════════════════════════════════════════ */
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyCzNWt6-3zVZUTqHF2KiXOdzv5Js8Sa-Qw",
  authDomain: "wallpaperhub-59aa5.firebaseapp.com",
  projectId: "wallpaperhub-59aa5",
  storageBucket: "wallpaperhub-59aa5.firebasestorage.app",
  messagingSenderId: "1067631192577",
  appId: "1:1067631192577:web:af3140c350bec490e76e00"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ─────────────────────────────────────────────
   IN-MEMORY COUNTER CACHE
   Stores { [docId]: { views, downloads } }
   so we can update the DOM instantly without
   waiting for the next Firestore read.
───────────────────────────────────────────── */
const counterCache = {};   // keyed by Firestore doc ID
// Maps imageUrl → docId  (built in loadWallpapers)
const urlToDocId   = {};

/* ─────────────────────────────────────────────
   UPDATE A SINGLE CARD'S COUNTER DISPLAY
───────────────────────────────────────────── */
function refreshCardUI(docId) {
  const data = counterCache[docId];
  if (!data) return;

  // Find the card whose data-docid matches
  const card = document.querySelector(`.wallpaper-card[data-docid="${docId}"]`);
  if (!card) return;

  const viewEl     = card.querySelector(".views");
  const downloadEl = card.querySelector(".downloads");

  if (viewEl)     viewEl.textContent = `${data.views}`;
  if (downloadEl) downloadEl.textContent = `${data.downloads}`;
}

/* Refresh ALL cards (called once after load) */
function refreshAllCounters() {
  Object.keys(counterCache).forEach(refreshCardUI);
}

/* ─────────────────────────────────────────────
   INCREMENT VIEW COUNT
   — updates cache, DOM, and Firestore atomically
───────────────────────────────────────────── */
async function incrementView(docId) {
  if (!docId) return;

  // Update local cache instantly → DOM updates immediately
  counterCache[docId].views += 1;
  refreshCardUI(docId);

  // Persist to Firestore in the background
  try {
    await updateDoc(doc(db, "wallpapers", docId), { views: increment(1) });
  } catch (err) {
    console.error("Failed to update view count:", err);
    // Roll back UI on error
    counterCache[docId].views -= 1;
    refreshCardUI(docId);
  }
}

/* ─────────────────────────────────────────────
   INCREMENT DOWNLOAD COUNT
───────────────────────────────────────────── */
async function incrementDownload(docId) {
  if (!docId) return;

  counterCache[docId].downloads += 1;
  refreshCardUI(docId);

  try {
    await updateDoc(doc(db, "wallpapers", docId), { downloads: increment(1) });
  } catch (err) {
    console.error("Failed to update download count:", err);
    counterCache[docId].downloads -= 1;
    refreshCardUI(docId);
  }
}

/* ─────────────────────────────────────────────
   OPEN MODAL  → also increments views
───────────────────────────────────────────── */
async function openModal(src) {
  const modal    = document.getElementById("modal");
  const modalImg = document.getElementById("modalImg");
  const modalDl  = document.getElementById("modalDl");

  modal.classList.add("open");
  modalImg.src        = src;
  modalDl.dataset.src = src;
  document.body.style.overflow = "hidden";
// Increment view for this wallpaper
  const docId = urlToDocId[src];
  if (docId) {
    await incrementView(docId);
    // Update modal stats after increment
    const modalViews     = document.getElementById("modalViews");
    const modalDownloads = document.getElementById("modalDownloads");
    if (modalViews)     modalViews.textContent     = `${counterCache[docId].views} views`;
    if (modalDownloads) modalDownloads.textContent = `${counterCache[docId].downloads} downloads`;
  }
}
window.openModal = openModal;

function closeModal() {
  const modal    = document.getElementById("modal");
  const modalImg = document.getElementById("modalImg");
  modal.classList.remove("open");
  document.body.style.overflow = "";
  modalImg.src = "";
}

/* ─────────────────────────────────────────────
   DOWNLOAD  → increments downloads
───────────────────────────────────────────── */
function downloadWallpaper(src) {
  const docId = urlToDocId[src];
  if (docId) incrementDownload(docId);

  const link = document.createElement("a");
  link.href = src;
  link.download = `wallpaper-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.downloadWallpaper = downloadWallpaper;

/* ─────────────────────────────────────────────
   RENDER FAVORITES SECTION
───────────────────────────────────────────── */
function renderFavorites() {
  const favGrid   = document.getElementById("favoritesGrid");
  const emptyFavs = document.getElementById("emptyFavs");
  if (!favGrid) return;

  favGrid.innerHTML = "";
  const favs = JSON.parse(localStorage.getItem("favs") || "[]");

  if (favs.length === 0) {
    emptyFavs.style.display = "block";
    return;
  }
  emptyFavs.style.display = "none";

  document.querySelectorAll(".wallpaper-card").forEach((card, index) => {
    if (favs.includes(index)) {
      favGrid.appendChild(card.cloneNode(true));
    }
  });
}

/* ─────────────────────────────────────────────
   LOAD FAVORITES FROM FIRESTORE
───────────────────────────────────────────── */
async function loadFavorites() {
  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) return;
  const snap = await getDoc(doc(db, "favorites", userEmail));
  if (snap.exists()) {
    localStorage.setItem("favs", JSON.stringify(snap.data().favs || []));
  }
}

/* ─────────────────────────────────────────────
   FILTER  (search + resolution + category)
───────────────────────────────────────────── */
let currentCategory = "all";

function applyFilters() {
  const query      = (document.getElementById("search")?.value || "").toLowerCase();
  const resolution = (document.getElementById("resolutionFilter")?.value || "all").toLowerCase();
  let visible = 0;

  document.querySelectorAll(".wallpaper-card").forEach(card => {
    const name = (card.dataset.name     || "").toLowerCase();
    const cat  = (card.dataset.category || "").toLowerCase();
    const res  = (card.dataset.res      || "").toLowerCase();

    const show =
      (name.includes(query) || cat.includes(query)) &&
      (currentCategory === "all" || cat === currentCategory) &&
      (resolution === "all" || res === resolution);

    card.style.display = show ? "" : "none";
    if (show) visible++;
  });

  const noResults = document.getElementById("noResults");
  if (noResults) noResults.hidden = visible !== 0;
}

/* ─────────────────────────────────────────────
   ATTACH EVENTS TO CARDS AFTER RENDER
───────────────────────────────────────────── */
function attachCardEvents() {
  const savedFavs = JSON.parse(localStorage.getItem("favs") || "[]");

  document.querySelectorAll(".btn-preview").forEach(btn => {
    btn.onclick = () => openModal(btn.dataset.src);
  });

  document.querySelectorAll(".dl-btn").forEach(btn => {
    btn.onclick = () => downloadWallpaper(btn.dataset.src);
  });

  document.querySelectorAll(".share-btn").forEach(btn => {
    btn.onclick = async () => {
      const url = btn.dataset.src;
      try {
        if (navigator.share) {
          await navigator.share({ title: "WallpaperHub", text: "Check out this wallpaper!", url });
        } else {
          await navigator.clipboard.writeText(url);
          alert("Wallpaper link copied!");
        }
      } catch (err) { console.log(err); }
    };
  });

  document.querySelectorAll(".fav-btn").forEach((btn, index) => {
    if (savedFavs.includes(index)) {
      btn.classList.add("active");
      btn.textContent = "❤️";
    }

    btn.onclick = async () => {
      btn.classList.toggle("active");
      const active = btn.classList.contains("active");
      btn.textContent = active ? "❤️" : "🤍";

      let favs = JSON.parse(localStorage.getItem("favs") || "[]");
      favs = active
        ? [...new Set([...favs, index])]
        : favs.filter(i => i !== index);

      localStorage.setItem("favs", JSON.stringify(favs));

      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        await setDoc(doc(db, "favorites", userEmail), { favs });
      }

      renderFavorites();
    };
  });
}

/* ─────────────────────────────────────────────
   CATEGORY FILTER BUTTONS + NAV LINKS
───────────────────────────────────────────── */
function setupCategoryFilters() {
  document.querySelectorAll(".cat-card").forEach(btn => {
    btn.onclick = () => {
      currentCategory = btn.dataset.cat.toLowerCase();
      document.querySelectorAll(".cat-card").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    };
  });

  document.querySelectorAll(".nav-links a[data-cat]").forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      currentCategory = link.dataset.cat.toLowerCase();
      applyFilters();
      document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
    };
  });
}

/* ─────────────────────────────────────────────
   LOAD WALLPAPERS FROM FIRESTORE
   Reads views/downloads straight from Firestore
   so counts are always accurate on page load.
───────────────────────────────────────────── */
async function loadWallpapers() {
  console.log("Loading wallpapers...");
  const gallery = document.getElementById("galleryGrid");
  if (!gallery) return;

  gallery.innerHTML = "";
  const snapshot = await getDocs(collection(db, "wallpapers"));
  console.log("Docs found:", snapshot.size);

  snapshot.forEach(docSnap => {
    const wall  = docSnap.data();
    const docId = docSnap.id;
    const src   = wall.imageUrl;
    const safeName     = (wall.name     || "").replace(/'/g, "&#39;");
    const safeCategory = (wall.category || "").replace(/'/g, "&#39;");
    const safeRes      = (wall.resolution || "").replace(/'/g, "&#39;");

    // Build lookup maps
    urlToDocId[src] = docId;
    counterCache[docId] = {
      views:     wall.views     || 0,
      downloads: wall.downloads || 0
    };

    gallery.innerHTML += `
      <div class="wallpaper-card"
           data-docid="${docId}"
           data-category="${wall.category.toLowerCase()}"
           data-name="${wall.name.toLowerCase()}"
           data-res="${wall.resolution.toLowerCase()}"
           data-src="${src}">

        <div class="card-image">
          <img src="${src}" alt="${wall.name}" loading="lazy">
          <div class="card-overlay">
            <button class="btn-preview" data-src="${src}" title="Preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="card-info">
          <div class="card-meta">
            <span class="cat-label">${wall.category}</span>
            <span class="res-badge">${wall.resolution}</span>
          </div>
          <div class="card-stats">
            <span class="stat-item">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span class="views">${wall.views || 0}</span>
            </span>
            <span class="stat-item">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span class="downloads">${wall.downloads || 0}</span>
            </span>
            <button class="fav-btn" title="Favourite">🤍</button>
            <button class="share-btn" data-src="${src}" title="Share">📤</button>
            <button class="dl-btn" data-src="${src}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    `;
  });

  attachCardEvents();
  setupCategoryFilters();
  applyFilters();
  refreshAllCounters(); // apply in-memory cache to DOM
}

/* ════════════════════════════════════════════
   DOM CONTENT LOADED
════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", async () => {
  document.body.style.visibility = "visible";
document.body.style.opacity = "1";
  const body = document.body;

  /* ── THEME TOGGLE ── */
  const themeBtn = document.getElementById("themeBtn");
  if (localStorage.getItem("theme") === "light") {
    body.classList.add("light");
    if (themeBtn) themeBtn.textContent = "☀️";
  }
  themeBtn?.addEventListener("click", () => {
    body.classList.toggle("light");
    const isLight = body.classList.contains("light");
    themeBtn.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("theme", isLight ? "light" : "dark");
  });

  /* ── LOGOUT ── */
  const auth = getAuth(app);
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("userEmail");
    localStorage.removeItem("favs");
    window.location.href = "login.html";
  });

  /* ── HAMBURGER ── */
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");
  hamburger?.addEventListener("click", () => navLinks.classList.toggle("open"));
  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });

  /* ── SEARCH + RESOLUTION ── */
  document.getElementById("search")?.addEventListener("input", applyFilters);
  document.getElementById("resolutionFilter")?.addEventListener("change", applyFilters);

  /* ── MODAL CLOSE ── */
  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.getElementById("modal")?.addEventListener("click", e => {
    if (e.target === document.getElementById("modal")) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.getElementById("modal")?.classList.contains("open")) {
      closeModal();
    }
  });

  /* ── MODAL DOWNLOAD ── */
  document.getElementById("modalDl")?.addEventListener("click", () => {
    const src = document.getElementById("modalDl").dataset.src;
    if (src) downloadWallpaper(src);
  });

  /* ── NAVBAR SCROLL ── */
  const navbar = document.querySelector(".navbar");
  window.addEventListener("scroll", () => {
    navbar.style.background = window.scrollY > 20
      ? (body.classList.contains("light") ? "rgba(244,244,240,0.95)" : "rgba(13,13,15,0.95)")
      : "";
  }, { passive: true });

  /* ── LOAD DATA ── */
  await loadFavorites();
  await loadWallpapers();

  renderFavorites();



// ===============================
// CONTACT FORM
// ===============================
const contactForm = document.getElementById("contactForm");

if (contactForm) {

  contactForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("contactName").value;
    const email = document.getElementById("contactEmail").value;
    const message = document.getElementById("contactMessage").value;

    await addDoc(collection(db, "contactMessages"), {
      name,
      email,
      message,
      createdAt: new Date()
    });

    alert("Message sent successfully!");

    contactForm.reset();

  });

}
});
