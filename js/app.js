// js/app.js — v3

import { watchAuth, logOut }                                          from "./auth.js";
import { addTransaction, getTransactions, deleteTransaction,
         updateTransaction, saveBudgets, getBudgets }                 from "./db.js";
import { exportToExcel }                                               from "./export.js";

let currentUser = null;
let allTxs      = [];
let budgets     = {};
let editingId   = null;
let pieChart = null, barChart = null, lineChart = null;

const EXPENSE_CATS = ["Food & Drink","Shopping","Transport","Housing","Health","Entertainment","Education","Other"];
const INCOME_CATS  = ["Salary","Freelance","Investment","Gift","Refund","Other"];
const cats = { expense: EXPENSE_CATS, income: INCOME_CATS };

const CAT_COLORS = {
  "Food & Drink":"#1D9E75","Shopping":"#378ADD","Transport":"#EF9F27",
  "Housing":"#7F77DD","Health":"#D85A30","Entertainment":"#D4537E",
  "Education":"#639922","Other":"#888780","Salary":"#1D9E75",
  "Freelance":"#378ADD","Investment":"#EF9F27","Gift":"#D4537E","Refund":"#639922"
};

// ── Boot ─────────────────────────────────────────────────────
watchAuth(
  async (user) => {
    currentUser = user;
    document.getElementById("user-email").textContent = user.email;
    initDarkMode();
    await loadAll();
  },
  () => { window.location.href = "index.html"; }
);

async function loadAll() {
  showLoading(true);
  [allTxs, budgets] = await Promise.all([
    getTransactions(currentUser.uid),
    getBudgets(currentUser.uid)
  ]);
  showLoading(false);
  processRecurring();
  populateCatFilter();
  updateSummary();
  waitForChartJs(() => updateCharts());
  applyFilters();
  renderBudgets();
  checkOverspending();
}

function waitForChartJs(cb) {
  if (typeof Chart !== "undefined") { cb(); return; }
  let n = 0;
  const t = setInterval(() => { n++;
    if (typeof Chart !== "undefined") { clearInterval(t); cb(); }
    if (n > 30) clearInterval(t);
  }, 200);
}

// ── Dark Mode ────────────────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem("darkMode") === "true";
  if (saved) document.body.classList.add("dark");
  updateDarkBtn();
}

document.getElementById("dark-btn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
  updateDarkBtn();
  waitForChartJs(() => updateCharts());
});

function updateDarkBtn() {
  document.getElementById("dark-btn").textContent =
    document.body.classList.contains("dark") ? "☀️" : "🌙";
}

// ── Add / Edit transaction form ──────────────────────────────
document.getElementById("tx-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type      = document.getElementById("tx-type").value;
  const desc      = document.getElementById("tx-desc").value.trim();
  const amount    = parseFloat(document.getElementById("tx-amount").value);
  const date      = document.getElementById("tx-date").value;
  const category  = document.getElementById("tx-cat").value;
  const recurring = document.getElementById("tx-recurring").checked;
  if (!desc || !amount || !date) return;

  const btn = document.getElementById("add-btn");
  btn.disabled = true;
  btn.textContent = editingId ? "Saving…" : "Adding…";

  const data = { type, desc, amount, date, category, recurring: recurring || false };

  if (editingId) {
    await updateTransaction(currentUser.uid, editingId, data);
    cancelEdit();
  } else {
    await addTransaction(currentUser.uid, data);
  }

  e.target.reset();
  document.getElementById("tx-date").valueAsDate = new Date();
  document.getElementById("tx-recurring").checked = false;
  updateCatOptions();
  btn.disabled = false;
  btn.textContent = "Add Transaction";
  await loadAll();
});

document.getElementById("tx-type").addEventListener("change", updateCatOptions);

function updateCatOptions() {
  const type = document.getElementById("tx-type").value;
  document.getElementById("tx-cat").innerHTML =
    cats[type].map(c => `<option>${c}</option>`).join("");
}

// ── Edit ─────────────────────────────────────────────────────
function startEdit(tx) {
  editingId = tx.id;
  document.getElementById("tx-type").value = tx.type;
  updateCatOptions();
  document.getElementById("tx-cat").value       = tx.category;
  document.getElementById("tx-desc").value      = tx.desc;
  document.getElementById("tx-amount").value    = tx.amount;
  document.getElementById("tx-date").value      = tx.date;
  document.getElementById("tx-recurring").checked = tx.recurring || false;
  document.getElementById("add-btn").textContent  = "Save Changes";
  document.getElementById("cancel-edit-btn").style.display = "inline-block";
  document.getElementById("form-card-title").textContent   = "Edit Transaction";
  document.getElementById("form-card").scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
  editingId = null;
  document.getElementById("tx-form").reset();
  document.getElementById("tx-date").valueAsDate = new Date();
  document.getElementById("add-btn").textContent  = "Add Transaction";
  document.getElementById("cancel-edit-btn").style.display = "none";
  document.getElementById("form-card-title").textContent   = "Add Transaction";
  updateCatOptions();
}

document.getElementById("cancel-edit-btn").addEventListener("click", cancelEdit);

// ── Recurring transactions ───────────────────────────────────
function processRecurring() {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const recurring = allTxs.filter(t => t.recurring);

  recurring.forEach(async (tx) => {
    const txMonth = tx.date.slice(0, 7);
    if (txMonth < thisMonth) {
      const alreadyExists = allTxs.some(t =>
        t.desc === tx.desc && t.amount === tx.amount &&
        t.type === tx.type && t.date.startsWith(thisMonth)
      );
      if (!alreadyExists) {
        const newDate = `${thisMonth}-${tx.date.slice(8,10)}`;
        await addTransaction(currentUser.uid, {
          type: tx.type, desc: tx.desc, amount: tx.amount,
          category: tx.category, date: newDate, recurring: true
        });
      }
    }
  });
}

// ── Delete ───────────────────────────────────────────────────
document.getElementById("tx-list").addEventListener("click", async (e) => {
  const del  = e.target.closest(".del-btn");
  const edit = e.target.closest(".edit-btn");
  if (del) {
    if (!confirm("Delete this transaction?")) return;
    await deleteTransaction(currentUser.uid, del.dataset.id);
    await loadAll();
  }
  if (edit) {
    const tx = allTxs.find(t => t.id === edit.dataset.id);
    if (tx) startEdit(tx);
  }
});

// ── Export ───────────────────────────────────────────────────
document.getElementById("export-btn").addEventListener("click", () => {
  exportToExcel(allTxs, currentUser.email);
});

// ── Logout ───────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", logOut);

// ── Filters ──────────────────────────────────────────────────
document.getElementById("search-btn").addEventListener("click", applyFilters);
document.getElementById("f-search").addEventListener("keydown", e => {
  if (e.key === "Enter") applyFilters();
});
["f-type","f-cat","f-month","f-from","f-to"].forEach(id =>
  document.getElementById(id).addEventListener("change", applyFilters)
);
document.getElementById("clear-filters-btn").addEventListener("click", () => {
  ["f-search","f-from","f-to"].forEach(id => document.getElementById(id).value = "");
  ["f-type","f-cat","f-month"].forEach(id => document.getElementById(id).value = "all");
  document.getElementById("filter-count").textContent = "";
  applyFilters();
});

function applyFilters() {
  const search = document.getElementById("f-search").value.trim().toLowerCase();
  const type   = document.getElementById("f-type").value;
  const cat    = document.getElementById("f-cat").value;
  const month  = document.getElementById("f-month").value;
  const from   = document.getElementById("f-from").value;
  const to     = document.getElementById("f-to").value;

  const filtered = allTxs.filter(tx => {
    if (search && !tx.desc.toLowerCase().includes(search)) return false;
    if (type  !== "all" && tx.type     !== type) return false;
    if (cat   !== "all" && tx.category !== cat)  return false;
    if (month !== "all") {
      if (new Date(tx.date+"T00:00:00").getMonth()+1 !== parseInt(month)) return false;
    }
    if (from && tx.date < from) return false;
    if (to   && tx.date > to)   return false;
    return true;
  });

  const isFiltered = search || type!=="all" || cat!=="all" || month!=="all" || from || to;
  document.getElementById("filter-count").textContent = isFiltered
    ? `Showing ${filtered.length} of ${allTxs.length} transactions`
    : `${allTxs.length} transactions`;

  renderList(filtered);
}

function populateCatFilter() {
  const allCats = [...new Set(allTxs.map(t => t.category))].sort();
  document.getElementById("f-cat").innerHTML =
    `<option value="all">All categories</option>` +
    allCats.map(c => `<option value="${c}">${c}</option>`).join("");
}

// ── Summary ──────────────────────────────────────────────────
function updateSummary() {
  const income  = allTxs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense = allTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const balance = income - expense;
  document.getElementById("sum-income").textContent  = fmt(income);
  document.getElementById("sum-expense").textContent = fmt(expense);
  const el = document.getElementById("sum-balance");
  el.textContent = (balance<0?"-":"") + fmt(balance);
  el.style.color = balance<0?"#E24B4A":balance>0?"#1D9E75":"";
}

// ── Charts ───────────────────────────────────────────────────
function updateCharts() {
  updatePieChart();
  updateBarChart();
  updateLineChart();
}

function updatePieChart() {
  const expenses  = allTxs.filter(t=>t.type==="expense");
  const pieEmpty  = document.getElementById("pie-empty");
  const pieCanvas = document.getElementById("pie-chart");
  if (!expenses.length) {
    pieEmpty.style.display="block"; pieCanvas.style.display="none"; return;
  }
  pieEmpty.style.display="none"; pieCanvas.style.display="block";
  const map={};
  expenses.forEach(t=>{ map[t.category]=(map[t.category]||0)+t.amount; });
  const labels=Object.keys(map), data=Object.values(map);
  const colors=labels.map(l=>CAT_COLORS[l]||"#888780");
  if (pieChart) { pieChart.destroy(); pieChart=null; }
  pieChart = new Chart(pieCanvas,{
    type:"doughnut",
    data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:3,borderColor:"#fff"}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{position:"bottom",labels:{font:{size:11},padding:10,boxWidth:12,usePointStyle:true}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.label}: $${ctx.parsed.toFixed(2)}`}}
      }
    }
  });
}

function updateBarChart() {
  const barEmpty=document.getElementById("bar-empty"), barCanvas=document.getElementById("bar-chart");
  if (!allTxs.length) {
    barEmpty.style.display="block"; barCanvas.style.display="none"; return;
  }
  barEmpty.style.display="none"; barCanvas.style.display="block";
  const now=new Date(), months=[];
  for (let i=5;i>=0;i--) {
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({
      key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label:d.toLocaleDateString("en-US",{month:"short",year:"2-digit"})
    });
  }
  const incomeData  = months.map(m=>allTxs.filter(t=>t.type==="income"  &&t.date.startsWith(m.key)).reduce((s,t)=>s+t.amount,0));
  const expenseData = months.map(m=>allTxs.filter(t=>t.type==="expense" &&t.date.startsWith(m.key)).reduce((s,t)=>s+t.amount,0));
  if (barChart) { barChart.destroy(); barChart=null; }
  barChart = new Chart(barCanvas,{
    type:"bar",
    data:{labels:months.map(m=>m.label),datasets:[
      {label:"Income", data:incomeData, backgroundColor:"#1D9E75",borderRadius:4,barPercentage:0.6},
      {label:"Expense",data:expenseData,backgroundColor:"#E24B4A",borderRadius:4,barPercentage:0.6}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{position:"bottom",labels:{font:{size:11},padding:10,boxWidth:12,usePointStyle:true}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`}}
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{size:11}}},
        y:{beginAtZero:true,ticks:{callback:v=>"$"+v,font:{size:11}},grid:{color:"rgba(0,0,0,0.05)"}}
      }
    }
  });
}

function updateLineChart() {
  const lineEmpty=document.getElementById("line-empty"), lineCanvas=document.getElementById("line-chart");
  if (!allTxs.length) {
    lineEmpty.style.display="block"; lineCanvas.style.display="none"; return;
  }
  lineEmpty.style.display="none"; lineCanvas.style.display="block";
  const now=new Date(), months=[];
  for (let i=5;i>=0;i--) {
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({
      key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label:d.toLocaleDateString("en-US",{month:"short",year:"2-digit"})
    });
  }
  const expData = months.map(m=>allTxs.filter(t=>t.type==="expense"&&t.date.startsWith(m.key)).reduce((s,t)=>s+t.amount,0));
  const incData = months.map(m=>allTxs.filter(t=>t.type==="income" &&t.date.startsWith(m.key)).reduce((s,t)=>s+t.amount,0));
  if (lineChart) { lineChart.destroy(); lineChart=null; }
  lineChart = new Chart(lineCanvas,{
    type:"line",
    data:{labels:months.map(m=>m.label),datasets:[
      {label:"Spending",data:expData,borderColor:"#E24B4A",backgroundColor:"rgba(226,75,74,0.08)",
       tension:0.4,pointRadius:4,pointBackgroundColor:"#E24B4A",fill:true},
      {label:"Income", data:incData,borderColor:"#1D9E75",backgroundColor:"rgba(29,158,117,0.08)",
       tension:0.4,pointRadius:4,pointBackgroundColor:"#1D9E75",fill:true}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{position:"bottom",labels:{font:{size:11},padding:10,boxWidth:12,usePointStyle:true}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`}}
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{size:11}}},
        y:{beginAtZero:true,ticks:{callback:v=>"$"+v,font:{size:11}},grid:{color:"rgba(0,0,0,0.05)"}}
      }
    }
  });
}

// ── Budget Goals ─────────────────────────────────────────────
document.getElementById("budget-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cat    = document.getElementById("budget-cat").value;
  const amount = parseFloat(document.getElementById("budget-amount").value);
  if (!cat || !amount) return;
  budgets[cat] = amount;
  await saveBudgets(currentUser.uid, budgets);
  document.getElementById("budget-amount").value = "";
  renderBudgets();
  checkOverspending();
});

async function deleteBudget(cat) {
  delete budgets[cat];
  await saveBudgets(currentUser.uid, budgets);
  renderBudgets();
  checkOverspending();
}

function renderBudgets() {
  const container = document.getElementById("budget-list");
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  if (!Object.keys(budgets).length) {
    container.innerHTML = `<div class="empty-small">No budgets set yet. Add one above.</div>`;
    return;
  }

  container.innerHTML = Object.entries(budgets).map(([cat, limit]) => {
    const spent   = allTxs
      .filter(t => t.type==="expense" && t.category===cat && t.date.startsWith(thisMonth))
      .reduce((s,t) => s+t.amount, 0);
    const pct     = Math.min((spent/limit)*100, 100);
    const over    = spent > limit;
    const barColor= pct >= 90 ? "#E24B4A" : pct >= 70 ? "#EF9F27" : "#1D9E75";

    return `
      <div class="budget-item">
        <div class="budget-header">
          <span class="budget-cat">${cat}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="budget-amounts ${over?"over":""}">${fmt(spent)} / ${fmt(limit)}</span>
            <button class="del-budget-btn" data-cat="${cat}" title="Remove budget">×</button>
          </div>
        </div>
        <div class="budget-bar-bg">
          <div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        ${over ? `<div class="budget-alert">⚠️ Over budget by ${fmt(spent-limit)}</div>` : ""}
      </div>`;
  }).join("");

  document.querySelectorAll(".del-budget-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteBudget(btn.dataset.cat));
  });
}

// ── Overspending alerts → notification bell ──────────────
function checkOverspending() {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const alerts    = [];

  Object.entries(budgets).forEach(([cat, limit]) => {
    const spent = allTxs
      .filter(t => t.type==="expense" && t.category===cat && t.date.startsWith(thisMonth))
      .reduce((s,t) => s+t.amount, 0);
    if (spent > limit)
      alerts.push({ type:"over", msg:`<b>${cat}</b>: over budget by ${fmt(spent-limit)}` });
    else if (spent/limit >= 0.9)
      alerts.push({ type:"warn", msg:`<b>${cat}</b>: 90% of budget used (${fmt(spent)} / ${fmt(limit)})` });
  });

  const dot  = document.getElementById("notif-dot");
  const list = document.getElementById("notif-list");
  dot.classList.toggle("visible", alerts.length > 0);
  list.innerHTML = alerts.length
    ? alerts.map(a => `<div class="notif-item ${a.type}">${a.msg}</div>`).join("")
    : `<div class="notif-empty">No alerts</div>`;
}

// ── Notification bell toggle ──────────────────────────────
document.getElementById("notif-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("notif-panel").classList.toggle("open");
});
document.addEventListener("click", () => {
  document.getElementById("notif-panel").classList.remove("open");
});

// ── Render list ──────────────────────────────────────────────
function renderList(txs) {
  const list = document.getElementById("tx-list");
  if (!txs.length) {
    list.innerHTML = `<div class="empty">No transactions match your filters.</div>`;
    return;
  }
  list.innerHTML = txs.map(tx => {
    const sign    = tx.type==="income" ? "+" : "−";
    const color   = tx.type==="income" ? "income" : "expense";
    const dateStr = new Date(tx.date+"T00:00:00")
      .toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    const recurBadge = tx.recurring
      ? `<span class="recur-badge" title="Recurring">🔁</span>` : "";
    return `
      <div class="tx-item">
        <div>
          <div class="tx-name">${tx.desc} ${recurBadge}</div>
          <div class="tx-sub">${dateStr}</div>
        </div>
        <div><span class="cat-badge cat-${slugify(tx.category)}">${tx.category}</span></div>
        <div class="tx-amount ${color}">${sign}${fmt(tx.amount)}</div>
        <div class="tx-actions">
          <button class="edit-btn" data-id="${tx.id}" title="Edit">✏️</button>
          <button class="del-btn"  data-id="${tx.id}" title="Delete">×</button>
        </div>
      </div>`;
  }).join("");
}

// ── Helpers ──────────────────────────────────────────────────
function fmt(n)     { return "$" + Math.abs(n).toFixed(2); }
function slugify(s) { return s.toLowerCase().replace(/[^a-z]/g,"-"); }
function showLoading(on) {
  document.getElementById("loading").style.display = on ? "block" : "none";
}

document.getElementById("tx-date").valueAsDate = new Date();
updateCatOptions();

// Populate budget category dropdown
document.getElementById("budget-cat").innerHTML =
  EXPENSE_CATS.map(c => `<option value="${c}">${c}</option>`).join("");