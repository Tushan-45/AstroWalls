import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ══════════════════════════════════════════════
   STEP 1 — Hide the entire page immediately on
   script load, before ANY async auth check runs.
   This prevents the "press back = access" exploit.
══════════════════════════════════════════════ */
document.documentElement.style.visibility = "hidden";
document.documentElement.style.pointerEvents = "none";

const ALLOWED_ADMINS = ["tushansinha01@gmail.com"];

/* ─────────────────────────────────────────────
   AUTH GUARD — runs once Firebase resolves
───────────────────────────────────────────── */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const displaySpan =
    document.getElementById("adminEmailDisplay");

  if (displaySpan) {
    displaySpan.innerText =
      `${user.email} · admin`;
  }

  // No user logged in → hard redirect, keep page hidden
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  // Logged in but NOT an admin → sign out + redirect
  if (!ALLOWED_ADMINS.includes(user.email)) {
    await signOut(auth);
    window.location.replace("index.html");
    return;
  }

  // Verified admin — reveal the page and boot the app
  document.documentElement.style.visibility = "";
  document.documentElement.style.pointerEvents = "";
  initAdminApp(user);
});

/* ══════════════════════════════════════════════
   ADMIN APP — only called after auth confirmed
══════════════════════════════════════════════ */
function initAdminApp(user) {
  const uploadBtn = document.getElementById("uploadBtn");
  if (uploadBtn) uploadBtn.addEventListener("click", handleUpload);

  ["wallName", "wallCategory", "wallUrl"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keypress", e => { if (e.key === "Enter") handleUpload(); });
  });
const homeBtn =
  document.getElementById("homeBtn");

if (homeBtn) {

  homeBtn.addEventListener("click", () => {

    window.location.href =
      "index.html";

  });

}
  const logoutBtn =
  document.getElementById("logoutAdminBtn");

if (logoutBtn) {

  logoutBtn.addEventListener("click", async () => {

    if (!confirm("Logout from Admin Panel?"))
      return;

    try {

      await signOut(auth);

      window.location.href =
        "login.html";

    } catch (error) {

      console.error(error);

    }

  });

}

  document.querySelectorAll(".adm-nav-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".adm-nav-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      if (this.getAttribute("data-nav") !== "upload") {
        showToast(`Navigation: ${this.getAttribute("data-nav") || "section"} (demo layout)`);
      } else {
        document.getElementById("uploadCard")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  renderRecentWallpapers();
  updateTotalStats();
}

/* ─── TOAST ─── */
function showToast(message, isError = false) {
  const existing = document.querySelector(".toast-message");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.style.background  = isError ? "#2A1018" : "#12121C";
  toast.style.borderColor = isError ? "#FF6B6B" : "#D4F53C";
  toast.style.color       = isError ? "#FF9F9F" : "#D4F53C";
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

/* ─── RECENT WALLPAPERS ─── */
async function renderRecentWallpapers() {
  const container = document.getElementById("recentListContainer");
  if (!container) return;
  try {
    const q = query(collection(db, "wallpapers"), orderBy("createdAt", "desc"), limit(5));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      container.innerHTML = `<div class="adm-row"><div class="adm-row-left"><div class="adm-dot"></div><div class="adm-thumb">📭</div><div><p class="adm-row-name">No wallpapers yet, add first!</p></div></div></div>`;
      return;
    }
    let html = "";
    snapshot.forEach(doc => {
      const data       = doc.data();
      const name       = data.name       || "Untitled";
      const category   = data.category   || "General";
      const resolution = data.resolution || "HD";
      const imageRef   = data.imageUrl
        ? (data.imageUrl.length > 35 ? data.imageUrl.slice(0, 32) + "..." : data.imageUrl)
        : "no url";
      let pillClass = "pill-anime";
      if (category.toLowerCase().includes("car"))   pillClass = "pill-cars";
      if (category.toLowerCase().includes("space")) pillClass = "pill-space";
    html += `
<div class="adm-row">
  <div class="adm-row-left">
    <div class="adm-dot active"></div>
    <div class="adm-thumb">🖼️</div>

    <div>
      <p class="adm-row-name">${escapeHtml(name)}</p>

      <div class="adm-row-meta">
        <span class="adm-pill ${pillClass}">
          ${escapeHtml(category)}
        </span>

        <span title="${escapeHtml(data.imageUrl || "")}">
          ${escapeHtml(imageRef)}
        </span>
      </div>
    </div>
  </div>

  <div style="display:flex;gap:10px;align-items:center;">
    <span class="adm-res">
      ${escapeHtml(resolution)}
    </span>

 <button
  class="edit-btn"
  onclick="editWallpaper('${doc.id}',
  '${name}',
  '${category}',
  '${resolution}',
  '${data.imageUrl || ""}')">
  ✏️
</button>

<button
  class="delete-btn"
  onclick="deleteWallpaper('${doc.id}')">
  🗑
</button>
  </div>
</div>
`;
    });
    container.innerHTML = html;
  } catch (err) {
    console.error("recent fetch error", err);
    container.innerHTML = `<div class="adm-row"><div class="adm-row-left"><div class="adm-dot"></div><div><p class="adm-row-name">⚠️ Failed to load</p></div></div></div>`;
  }
}

/* ─── TOTAL STATS ─── */
async function updateTotalStats() {

  try {

    const snap =
      await getDocs(
        collection(db, "wallpapers")
      );

      const userSnap = await getDocs(
  collection(db, "users")
);

console.log("Users Count:", userSnap.size);

const usersElem =
  document.getElementById("statUsers");

if (usersElem) {
  usersElem.innerText = userSnap.size;
}

    // Total wallpapers
    document.getElementById("statTotal")
      .innerText = snap.size;

    let totalViews = 0;
    let totalDownloads = 0;

    let topWallpaper = "None";
    let highestDownloads = 0;

    const categoriesSet =
      new Set();

    snap.forEach((docSnap) => {

      const wall =
        docSnap.data();

      totalViews +=
        wall.views || 0;

      totalDownloads +=
        wall.downloads || 0;

      if (wall.category) {

        categoriesSet.add(
          wall.category
        );

      }

      if (
        (wall.downloads || 0) >
        highestDownloads
      ) {

        highestDownloads =
          wall.downloads || 0;

        topWallpaper =
          wall.name || "Unnamed";

      }

    });

    // Categories
    document.getElementById(
      "statCategories"
    ).innerText =
      categoriesSet.size;

    // Downloads
    const downloadsEl =
      document.getElementById(
        "statDownloads"
      );

    if (downloadsEl) {

      downloadsEl.innerText =
        totalDownloads;

    }

    // Views
    const viewsEl =
      document.getElementById(
        "statViews"
      );

    if (viewsEl) {

      viewsEl.innerText =
        totalViews;

    }

    // Top Wallpaper
    const topEl =
      document.getElementById(
        "statTopWallpaper"
      );

    if (topEl) {

      topEl.innerText =
        topWallpaper;

    }

  } catch (error) {

    console.error(
      "Analytics Error:",
      error
    );

  }

}

/* ─── ESCAPE HTML ─── */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
}

/* ─── HANDLE UPLOAD ─── */
async function handleUpload() {

  const name       = document.getElementById("wallName").value.trim();
  const category   = document.getElementById("wallCategory").value.trim();
  const resolution = document.getElementById("wallResolution").value;
  const imageUrl   = document.getElementById("wallUrl").value.trim();

  if (!name || !imageUrl) {
    showToast("❌ Name and Image URL are required", true);
    return;
  }

  if (
    !imageUrl.startsWith("http://") &&
    !imageUrl.startsWith("https://")
  ) {
    showToast("⚠️ Please enter a valid image URL", true);
    return;
  }

  const uploadBtn = document.getElementById("uploadBtn");

  uploadBtn.disabled = true;
  uploadBtn.innerHTML =
    '<i class="ti ti-loader"></i> Publishing...';

  try {

    await addDoc(collection(db, "wallpapers"), {
      name,
      category: category || "Uncategorized",
      resolution,
      imageUrl,
      views: 0,
      downloads: 0,
      createdAt: Date.now()
    });

    showToast("✅ Wallpaper published!");

    document.getElementById("wallName").value = "";
    document.getElementById("wallCategory").value = "";
    document.getElementById("wallUrl").value = "";

    await renderRecentWallpapers();
    await updateTotalStats();

  } catch (error) {

    console.error(error);

    showToast(
      "🔥 Upload failed: " + error.message,
      true
    );

  } finally {

    uploadBtn.disabled = false;
    uploadBtn.innerHTML =
      '<i class="ti ti-plus"></i> Publish wallpaper';
  }
}
window.deleteWallpaper = async function(docId) {

  const ok =
    confirm("Delete this wallpaper?");

  if (!ok) return;

  try {

    await deleteDoc(
      doc(db, "wallpapers", docId)
    );

    showToast("🗑 Wallpaper deleted");

    await renderRecentWallpapers();
    await updateTotalStats();

  } catch (error) {

    console.error(error);

    showToast(
      "❌ Delete failed",
      true
    );

  }

};
window.editWallpaper = async function(
  docId,
  oldName,
  oldCategory,
  oldResolution,
  oldUrl
) {

  const name =
    prompt("Wallpaper Name:", oldName);

  if (name === null) return;

  const category =
    prompt("Category:", oldCategory);

  if (category === null) return;

  const resolution =
    prompt("Resolution:", oldResolution);

  if (resolution === null) return;

  const imageUrl =
    prompt("Image URL:", oldUrl);

  if (imageUrl === null) return;

  try {

    await updateDoc(
      doc(db, "wallpapers", docId),
      {
        name,
        category,
        resolution,
        imageUrl
      }
    );

    showToast("✏️ Wallpaper updated");

    await renderRecentWallpapers();

  } catch (error) {

    console.error(error);

    showToast(
      "❌ Update failed",
      true
    );

  }

};