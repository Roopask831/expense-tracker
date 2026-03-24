// js/db.js — v3
import { db } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp, updateDoc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function txCol(uid)     { return collection(db, "users", uid, "transactions"); }
function budgetDoc(uid) { return doc(db, "users", uid, "settings", "budgets"); }

// ── Transactions ─────────────────────────────────────────────
export async function addTransaction(uid, tx) {
  await addDoc(txCol(uid), { ...tx, createdAt: serverTimestamp() });
}

export async function getTransactions(uid) {
  const q = query(txCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteTransaction(uid, txId) {
  await deleteDoc(doc(db, "users", uid, "transactions", txId));
}

export async function updateTransaction(uid, txId, data) {
  await updateDoc(doc(db, "users", uid, "transactions", txId), data);
}

// ── Budgets ──────────────────────────────────────────────────
export async function saveBudgets(uid, budgets) {
  await setDoc(budgetDoc(uid), budgets);
}

export async function getBudgets(uid) {
  const snap = await getDoc(budgetDoc(uid));
  return snap.exists() ? snap.data() : {};
}