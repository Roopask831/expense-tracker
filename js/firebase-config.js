// js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDfHKghjzW30xqjQpSfe7OFiBlxK0EAye4",
  authDomain:        "expensetracker-35e1f.firebaseapp.com",
  projectId:         "expensetracker-35e1f",
  storageBucket:     "expensetracker-35e1f.firebasestorage.app",
  messagingSenderId: "773465272215",
  appId:             "1:773465272215:web:3063aa8529d45ba9039ed2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);