# 💰 Expense Tracker

A full-featured expense tracker web app with user login, Firebase storage, and Excel export.

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Auth | Firebase Authentication (Email/Password) |
| Database | Firebase Firestore (per-user data) |
| Excel Export | SheetJS (xlsx library) |
| Hosting | GitHub Pages / Firebase Hosting |

---

## 📁 Project Structure

```
expense-tracker/
├── index.html          ← Login / Signup page
├── dashboard.html      ← Main app (protected)
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── firebase-config.js  ← Your Firebase credentials
│   ├── auth.js             ← Login, signup, logout logic
│   ├── db.js               ← Firestore read/write logic
│   ├── app.js              ← Main app logic
│   └── export.js           ← Excel download logic
└── README.md
```

---

## 🚀 Setup Instructions

### Step 1 — Create a Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it (e.g. `expense-tracker`)
3. Disable Google Analytics (optional) → Create project

### Step 2 — Enable Authentication
1. In Firebase Console → **Authentication** → **Get Started**
2. Under Sign-in method → Enable **Email/Password**

### Step 3 — Create Firestore Database
1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Pick a region → Done

### Step 4 — Get Your Firebase Config
1. Go to Project Settings (gear icon) → **Your apps** → click `</>`
2. Register the app → copy the `firebaseConfig` object
3. Paste it into `js/firebase-config.js`

### Step 5 — Run Locally
Just open `index.html` in your browser — no server needed!

### Step 6 — Deploy to GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```
Then in GitHub repo → Settings → Pages → Source: `main` branch → Save.

---

## ✨ Features
- ✅ Email/password login & signup
- ✅ Each user sees only their own data
- ✅ Add income or expense transactions
- ✅ Filter by All / Income / Expense
- ✅ Download expenses as Excel (.xlsx)
- ✅ Real-time balance summary
- ✅ Delete transactions
