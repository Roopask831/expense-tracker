// js/app.js
// Main dashboard logic: renders transactions, handles form submit,
// wires up delete and export buttons.

import { watchAuth, logOut }                    from "./auth.js";
import { addTransaction, getTransactions, deleteTransaction } from "./db.js";
import { exportToExcel }                         from "./export.js";

let currentUser = null;
let allTxs      = [];
let activeFilter = "all";

const cats = {
  expense: ["Food & Drink", "Shopping", "Transport", "Housing", "Health", "Entertainment", "Education", "Other"],
  income:  ["Salary", "Freelance", "Investment", "Gift", "Refund", "Other"]
};

// ── Boot ──────────────────────────────────────────────────────
watchAuth(
  async (user) => {
    currentUser = user;
    document.getElementById("user-email").textContent = user.email;
    await loadTxs();
  },
  () => { window.location.href = "index.html"; }   // not logged in → redirect
);

// ── Load transactions from Firestore ─────────────────────────
async function loadTxs() {
  showLoading(true);
  allTxs = await getTransactions(currentUser.uid);
  showLoading(false);
  updateSummary();
  render();
}

// ── Add transaction form ──────────────────────────────────────
document.getElementById("tx-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type     = document.getElementById("tx-type").value;
  const desc     = document.getElementById("tx-desc").value.trim();
  const amount   = parseFloat(document.getElementById("tx-amount").value);
  const date     = document.getElementById("tx-date").value;
  const category = document.getElementById("tx-cat").value;

  if (!desc || !amount || !date) return;

  const btn = document.getElementById("add-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  await addTransaction(currentUser.uid, { type, desc, amount, date, category });
  e.target.reset();
  document.getElementById("tx-date").valueAsDate = new Date();
  updateCatOptions();
  btn.disabled = false;
  btn.textContent = "Add Transaction";

  await loadTxs();
});

// ── Type toggle updates category options ─────────────────────
document.getElementById("tx-type").addEventListener("change", updateCatOptions);

function updateCatOptions() {
  const type = document.getElementById("tx-type").value;
  const sel  = document.getElementById("tx-cat");
  sel.innerHTML = cats[type].map(c => `<option>${c}</option>`).join("");
}

// ── Filter buttons ────────────────────────────────────────────
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    render();
  });
});

// ── Export button ─────────────────────────────────────────────
document.getElementById("export-btn").addEventListener("click", () => {
  exportToExcel(allTxs, currentUser.email);
});

// ── Logout button ─────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", logOut);

// ── Delete (event delegation on list) ────────────────────────
document.getElementById("tx-list").addEventListener("click", async (e) => {
  if (!e.target.classList.contains("del-btn")) return;
  const id = e.target.dataset.id;
  if (!confirm("Delete this transaction?")) return;
  await deleteTransaction(currentUser.uid, id);
  await loadTxs();
});

// ── Summary cards ─────────────────────────────────────────────
function updateSummary() {
  const income  = allTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = allTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  document.getElementById("sum-balance").textContent = fmt(balance);
  document.getElementById("sum-income").textContent  = fmt(income);
  document.getElementById("sum-expense").textContent = fmt(expense);

  const el = document.getElementById("sum-balance");
  el.style.color = balance < 0 ? "#E24B4A" : balance > 0 ? "#1D9E75" : "";
}

// ── Render transaction list ───────────────────────────────────
function render() {
  const list   = document.getElementById("tx-list");
  const filtered = activeFilter === "all"
    ? allTxs
    : allTxs.filter(t => t.type === activeFilter);

  if (!filtered.length) {
    list.innerHTML = `<div class="empty">No transactions found.</div>`;
    return;
  }

  list.innerHTML = filtered.map(tx => {
    const sign  = tx.type === "income" ? "+" : "−";
    const color = tx.type === "income" ? "income" : "expense";
    const d     = new Date(tx.date + "T00:00:00");
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return `
      <div class="tx-item">
        <div>
          <div class="tx-name">${tx.desc}</div>
          <div class="tx-sub">${dateStr}</div>
        </div>
        <div><span class="cat-badge cat-${slugify(tx.category)}">${tx.category}</span></div>
        <div class="tx-amount ${color}">${sign}${fmt(tx.amount)}</div>
        <button class="del-btn" data-id="${tx.id}" title="Delete">×</button>
      </div>`;
  }).join("");
}

// ── Helpers ───────────────────────────────────────────────────
function fmt(n)     { return "$" + Math.abs(n).toFixed(2); }
function slugify(s) { return s.toLowerCase().replace(/[^a-z]/g, "-"); }
function showLoading(on) {
  document.getElementById("loading").style.display = on ? "block" : "none";
}

// Init date field
document.getElementById("tx-date").valueAsDate = new Date();
updateCatOptions();
