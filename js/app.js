// js/app.js  — v2
// Added: advanced filters (search, type, category, month, date range)
//         Chart.js pie chart (expenses by category)
//         Chart.js bar chart (monthly income vs expenses)

import { watchAuth, logOut }                              from "./auth.js";
import { addTransaction, getTransactions, deleteTransaction } from "./db.js";
import { exportToExcel }                                   from "./export.js";

let currentUser = null;
let allTxs      = [];
let pieChart     = null;
let barChart     = null;

const cats = {
  expense: ["Food & Drink", "Shopping", "Transport", "Housing", "Health", "Entertainment", "Education", "Other"],
  income:  ["Salary", "Freelance", "Investment", "Gift", "Refund", "Other"]
};

const CAT_COLORS = {
  "Food & Drink":  "#1D9E75",
  "Shopping":      "#378ADD",
  "Transport":     "#EF9F27",
  "Housing":       "#7F77DD",
  "Health":        "#D85A30",
  "Entertainment": "#D4537E",
  "Education":     "#639922",
  "Other":         "#888780",
  "Salary":        "#1D9E75",
  "Freelance":     "#378ADD",
  "Investment":    "#EF9F27",
  "Gift":          "#D4537E",
  "Refund":        "#639922",
};

// ── Boot ──────────────────────────────────────────────────────
watchAuth(
  async (user) => {
    currentUser = user;
    document.getElementById("user-email").textContent = user.email;
    await loadTxs();
  },
  () => { window.location.href = "index.html"; }
);

// ── Load from Firestore ───────────────────────────────────────
async function loadTxs() {
  showLoading(true);
  allTxs = await getTransactions(currentUser.uid);
  showLoading(false);
  populateCatFilter();
  updateSummary();
  updateCharts();
  applyFilters();
}

// ── Add transaction ───────────────────────────────────────────
document.getElementById("tx-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type     = document.getElementById("tx-type").value;
  const desc     = document.getElementById("tx-desc").value.trim();
  const amount   = parseFloat(document.getElementById("tx-amount").value);
  const date     = document.getElementById("tx-date").value;
  const category = document.getElementById("tx-cat").value;
  if (!desc || !amount || !date) return;

  const btn = document.getElementById("add-btn");
  btn.disabled    = true;
  btn.textContent = "Saving…";

  await addTransaction(currentUser.uid, { type, desc, amount, date, category });
  e.target.reset();
  document.getElementById("tx-date").valueAsDate = new Date();
  updateCatOptions();
  btn.disabled    = false;
  btn.textContent = "Add Transaction";
  await loadTxs();
});

document.getElementById("tx-type").addEventListener("change", updateCatOptions);

function updateCatOptions() {
  const type = document.getElementById("tx-type").value;
  document.getElementById("tx-cat").innerHTML =
    cats[type].map(c => `<option>${c}</option>`).join("");
}

// ── Delete ────────────────────────────────────────────────────
document.getElementById("tx-list").addEventListener("click", async (e) => {
  if (!e.target.classList.contains("del-btn")) return;
  if (!confirm("Delete this transaction?")) return;
  await deleteTransaction(currentUser.uid, e.target.dataset.id);
  await loadTxs();
});

// ── Export ────────────────────────────────────────────────────
document.getElementById("export-btn").addEventListener("click", () => {
  exportToExcel(allTxs, currentUser.email);
});

// ── Logout ────────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", logOut);

// ── Advanced Filters ──────────────────────────────────────────
["f-search","f-type","f-cat","f-month","f-from","f-to"].forEach(id => {
  document.getElementById(id).addEventListener("input", applyFilters);
});

document.getElementById("clear-filters-btn").addEventListener("click", () => {
  document.getElementById("f-search").value = "";
  document.getElementById("f-type").value   = "all";
  document.getElementById("f-cat").value    = "all";
  document.getElementById("f-month").value  = "all";
  document.getElementById("f-from").value   = "";
  document.getElementById("f-to").value     = "";
  applyFilters();
});

function applyFilters() {
  const search = document.getElementById("f-search").value.toLowerCase();
  const type   = document.getElementById("f-type").value;
  const cat    = document.getElementById("f-cat").value;
  const month  = document.getElementById("f-month").value;
  const from   = document.getElementById("f-from").value;
  const to     = document.getElementById("f-to").value;

  const filtered = allTxs.filter(tx => {
    if (search && !tx.desc.toLowerCase().includes(search)) return false;
    if (type !== "all" && tx.type !== type)                return false;
    if (cat  !== "all" && tx.category !== cat)             return false;
    if (month !== "all") {
      const m = new Date(tx.date + "T00:00:00").getMonth() + 1;
      if (m !== parseInt(month)) return false;
    }
    if (from && tx.date < from) return false;
    if (to   && tx.date > to)   return false;
    return true;
  });

  const countEl = document.getElementById("filter-count");
  countEl.textContent = filtered.length === allTxs.length
    ? `${allTxs.length} transactions`
    : `${filtered.length} of ${allTxs.length} transactions`;

  renderList(filtered);
}

// Populate category filter dropdown from actual data
function populateCatFilter() {
  const allCats = [...new Set(allTxs.map(t => t.category))].sort();
  const sel = document.getElementById("f-cat");
  sel.innerHTML = `<option value="all">All categories</option>` +
    allCats.map(c => `<option value="${c}">${c}</option>`).join("");
}

// ── Summary cards ─────────────────────────────────────────────
function updateSummary() {
  const income  = allTxs.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0);
  const expense = allTxs.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;

  document.getElementById("sum-income").textContent  = fmt(income);
  document.getElementById("sum-expense").textContent = fmt(expense);
  const balEl = document.getElementById("sum-balance");
  balEl.textContent  = (balance < 0 ? "-" : "") + fmt(balance);
  balEl.style.color  = balance < 0 ? "#E24B4A" : balance > 0 ? "#1D9E75" : "";
}

// ── Charts ────────────────────────────────────────────────────
function updateCharts() {
  updatePieChart();
  updateBarChart();
}

function updatePieChart() {
  const expenses = allTxs.filter(t => t.type === "expense");
  const pieEmpty = document.getElementById("pie-empty");

  if (!expenses.length) {
    pieEmpty.style.display = "block";
    document.getElementById("pie-chart").style.display = "none";
    return;
  }
  pieEmpty.style.display = "none";
  document.getElementById("pie-chart").style.display = "block";

  // Group by category
  const map = {};
  expenses.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
  const labels = Object.keys(map);
  const data   = Object.values(map);
  const colors = labels.map(l => CAT_COLORS[l] || "#888780");

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById("pie-chart"), {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 12 }, padding: 12, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: $${ctx.parsed.toFixed(2)}`
          }
        }
      }
    }
  });
}

function updateBarChart() {
  const barEmpty = document.getElementById("bar-empty");
  if (!allTxs.length) {
    barEmpty.style.display = "block";
    document.getElementById("bar-chart").style.display = "none";
    return;
  }
  barEmpty.style.display = "none";
  document.getElementById("bar-chart").style.display = "block";

  // Build last 6 months labels
  const now     = new Date();
  const months  = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    });
  }

  const incomeData  = months.map(m =>
    allTxs.filter(t => t.type === "income"  && t.date.startsWith(m.key)).reduce((s,t) => s+t.amount, 0));
  const expenseData = months.map(m =>
    allTxs.filter(t => t.type === "expense" && t.date.startsWith(m.key)).reduce((s,t) => s+t.amount, 0));

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("bar-chart"), {
    type: "bar",
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: "Income",  data: incomeData,  backgroundColor: "#1D9E75", borderRadius: 5 },
        { label: "Expense", data: expenseData, backgroundColor: "#E24B4A", borderRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 12 }, padding: 12, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}` } }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: v => "$" + v } }
      }
    }
  });
}

// ── Render list ───────────────────────────────────────────────
function renderList(txs) {
  const list = document.getElementById("tx-list");
  if (!txs.length) {
    list.innerHTML = `<div class="empty">No transactions match your filters.</div>`;
    return;
  }
  list.innerHTML = txs.map(tx => {
    const sign    = tx.type === "income" ? "+" : "−";
    const color   = tx.type === "income" ? "income" : "expense";
    const dateStr = new Date(tx.date + "T00:00:00")
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

// Init
document.getElementById("tx-date").valueAsDate = new Date();
updateCatOptions();
