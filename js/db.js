// js/db.js
// Handles all Firestore (database) read / write / delete operations
// Each user's data is stored under: users/{userId}/transactions/{txId}

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Helper: reference to a user's transactions sub-collection ─
function txCollection(userId) {
  return collection(db, "users", userId, "transactions");
}

// ── Add a new transaction ─────────────────────────────────────
export async function addTransaction(userId, tx) {
  // tx = { desc, amount, date, category, type }
  await addDoc(txCollection(userId), {
    ...tx,
    createdAt: serverTimestamp()   // lets us sort newest-first
  });
}

// ── Fetch all transactions for a user ─────────────────────────
export async function getTransactions(userId) {
  const q = query(txCollection(userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Delete a single transaction ───────────────────────────────
export async function deleteTransaction(userId, txId) {
  const ref = doc(db, "users", userId, "transactions", txId);
  await deleteDoc(ref);
}
