# AstroWalls

## Overview

AstroWalls is a modern wallpaper platform designed to provide users with a seamless experience for discovering, downloading, and managing high-quality wallpapers. The application combines a clean user interface with Firebase-powered authentication, cloud database integration, and an administrative dashboard for content management.

The project was developed as a full-stack web application using HTML, CSS, JavaScript, Firebase Authentication, and Cloud Firestore.

---

# Features

## User Authentication

AstroWalls uses Firebase Authentication to provide secure user access.

Supported authentication methods:

* Google Sign-In
* Session persistence
* Automatic login state detection
* Secure logout functionality

Features:

* Users remain logged in across sessions
* Unauthorized users are redirected appropriately
* Admin-only routes are protected

---

# User Dashboard

Each registered user has access to a personalized profile dashboard.

The profile page includes:

* Profile photo
* Username
* Email address
* Account creation date
* Account type
* Favorites count
* Download count
* View count
* Last login information
* Country detection
* Profile editing functionality

Users can update:

* Display name
* Profile photo URL

Profile information is stored inside Firestore.

Example:

```text
users
 └ uid
    ├ email
    ├ name
    ├ photo
    └ lastLogin
```

---

# Wallpaper Management

Users can:

* Browse wallpapers
* Download wallpapers
* Add wallpapers to favorites
* View wallpaper details

Each wallpaper contains:

```text
name
category
resolution
imageUrl
downloads
views
createdAt
```

Example:

```text
wallpapers
 └ documentId
    ├ name: "Naruto Neon"
    ├ category: "Anime"
    ├ resolution: "4K"
    ├ imageUrl: "https://..."
    ├ downloads: 152
    ├ views: 987
```

---

# Favorites System

Users can save wallpapers to a personal favorites list.

Features:

* Add to favorites
* Remove from favorites
* Favorite counter
* Persistent storage

Favorites are stored locally and displayed on the profile page.

---

# Download Tracking

AstroWalls records wallpaper downloads.

Each download automatically updates Firestore:

```javascript
downloads: increment(1)
```

Benefits:

* Real download statistics
* Popular wallpaper identification
* Analytics generation

---

# View Tracking

Wallpaper views are tracked in Firestore.

Every wallpaper card interaction updates:

```javascript
views: increment(1)
```

This provides:

* Engagement tracking
* Popularity ranking
* User behavior analysis

---

# Admin Dashboard

The Admin Console allows administrators to manage the entire platform.

Only authorized email addresses can access:

```javascript
const ALLOWED_ADMINS = [
  "admin@example.com"
];
```

Unauthorized users are:

* Signed out
* Redirected automatically

---

## Admin Features

### Upload Wallpapers

Administrators can publish new wallpapers by providing:

* Title
* Category
* Resolution
* Image URL

Data is instantly stored in Firestore.

---

### Edit Wallpapers

Administrators can modify:

* Wallpaper name
* Category
* Resolution
* Image URL

without deleting the wallpaper.

---

### Delete Wallpapers

Administrators can permanently remove wallpapers.

Deletion is reflected immediately in:

* Firestore
* Dashboard statistics
* Recent uploads feed

---

### Analytics Dashboard

The dashboard provides real-time statistics.

Metrics include:

#### Total Wallpapers

Displays:

```text
Total Wallpapers: 62
```

#### Total Downloads

Displays:

```text
Total Downloads: 845
```

#### Total Views

Displays:

```text
Total Views: 5320
```

#### Most Downloaded Wallpaper

Displays:

```text
Most Downloaded: Naruto Neon
```

#### Registered Users

Displays:

```text
Registered Users: 37
```

All analytics are generated directly from Firestore.

---

# Firebase Integration

AstroWalls uses Firebase services for:

### Firebase Authentication

Responsible for:

* Login
* Logout
* Session persistence
* Account management

---

### Cloud Firestore

Responsible for:

* Wallpaper storage
* User profiles
* Analytics
* Download tracking
* View tracking

---

# Project Structure

```text
AstroWalls/
│
├── index.html
├── login.html
├── profile.html
├── admin.html
│
├── style.css
├── profile.css
├── admin.css
│
├── script.js
├── profile.js
├── admin.js
├── firebase-config.js
│
├── images/
├── assets/
└── README.md
```

---

# Database Structure

## Users Collection

```text
users
 └ uid
    ├ email
    ├ name
    ├ photo
    ├ country
    └ lastLogin
```

## Wallpapers Collection

```text
wallpapers
 └ wallpaperId
    ├ name
    ├ category
    ├ resolution
    ├ imageUrl
    ├ downloads
    ├ views
    └ createdAt
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/AstroWalls.git
```

Navigate into the project:

```bash
cd AstroWalls
```

---

# Firebase Setup

## Step 1

Create a Firebase project.

## Step 2

Enable:

```text
Authentication
 └ Google Provider
```

## Step 3

Enable:

```text
Cloud Firestore
```

## Step 4

Add Firebase configuration to:

```javascript
firebase-config.js
```

Example:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

---

# Deployment

## Firebase Hosting

Install Firebase CLI:

```bash
npm install -g firebase-tools
```

Login:

```bash
firebase login
```

Initialize Hosting:

```bash
firebase init hosting
```

Deploy:

```bash
firebase deploy
```

---

## GitHub Pages

1. Push repository to GitHub.
2. Open Settings.
3. Open Pages.
4. Select:

```text
Source: Deploy from a Branch
Branch: main
Folder: /root
```

5. Save.

Your website will be available at:

```text
https://YOUR_USERNAME.github.io/AstroWalls/
```

---

# Security

AstroWalls implements:

* Admin route protection
* Authentication-based access control
* Firestore security rules
* User session verification
* Automatic unauthorized redirects

---


# Author

Tushan Kumar Sinha

Bachelor of Technology

Computer Science and Engineering


---

# License

This project is intended for educational, learning, portfolio, and demonstration purposes.