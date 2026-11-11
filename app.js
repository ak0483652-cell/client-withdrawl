const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const state = { user: null, isAdmin: false, mine: [], all: [], sel: new Set() };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const when = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const LABEL = { pending: "Pending", approved: "Approved", paid: "Paid", rejected: "Rejected" };
const pill = (s) => `<span class="pill ${s}">${LABEL[s]}</span>`;
const sum = (list) => list.reduce((t, r) => t + Number(r.amount), 0);

/* ---------- Auth ---------- */
async function authAction(kind) {
  const email = $("a-email").value.trim();
  const password = $("a-pass").value;
  $("a-err").textContent = "";
  if (!email || password.length < 6) { $("a-err").textContent = "Enter your email and a password of at least 6 characters."; return; }
  const { error } = kind === "signup"
    ? await sb.auth.signUp({ email, password })
    : await sb.auth.signInWithPassword({ email, password });
  if (error) { $("a-err").textContent = error.message; return; }
  if (kind === "signup") $("a-err").textContent = "Account created. If email confirmation is on, check your inbox, then log in.";
}
$("authForm").addEventListener("submit", (e) => { e.preventDefault(); authAction("login"); });
$("a-signup").onclick = () => authAction("signup");
$("logout").onclick = () => sb.auth.signOut();

function showApp(session) {
  state.user = session ? session.user : null;
  state.isAdmin = !!state.user && state.user.email === ADMIN_EMAIL; // sirf UI ke liye; asli rok RLS (supabase.sql) lagati hai
  $("authForm").hidden = !!state.user;
  $("logout").hidden = !state.user;
  $("tabs").hidden = !state.isAdmin;
  setTab("user");
  if (state.user) loadAll();
  else { state.mine = []; state.all = []; renderMine(); renderAdmin(); $("userPane").hidden = true; }
}

function setTab(t) {
  const user = !!state.user;
  $("userPane").hidden = !(user && t === "user");
  $("adminPane").hidden = !(state.isAdmin && t === "admin");
  $("tab-user").setAttribute("aria-selected", t === "user");
  $("tab-admin").setAttribute("aria-selected", t === "admin");
}
$("tab-user").onclick = () => setTab("user");
$("tab-admin").onclick = () => setTab("admin");

/* ---------- Data ---------- */
async function loadAll() {
  const { data, error } = await sb.from("withdrawals").select("*").order("created_at", { ascending: true });
  if (error) { $("f-err").textContent = error.message; return; }
  state.all = data;
  state.mine = data.filter((r) => r.user_id === state.user.id);
  renderMine();
  renderAdmin();
}

/* ---------- User panel ---------- */
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("f-name").value.trim();
  const upi = $("f-upi").value.trim();
  const amount = Math.round(Number($("f-amt").value));
  const err = $("f-err");
  err.textContent = "";
  if (name.length < 2) { err.textContent = "Enter your name."; return; }
  if (!/^[A-Za-z0-9._\-]{2,}@[A-Za-z]{2,}$/.test(upi)) { err.textContent = "Enter a valid UPI ID, for example 9876543210@fam."; return; }
  if (!(amount >= 1 && amount <= 100000)) { err.textContent = "Amount must be between ₹1 and ₹1,00,000."; return; }
  $("f-go").disabled = true; $("f-state").textContent = "Sending…";
  const { error } = await sb.from("withdrawals").insert({ name, upi, amount });
  $("f-go").disabled = false;
  if (error) { err.textContent = "Could not send: " + error.message; $("f-state").textContent = ""; return; }
  $("f-amt").value = ""; $("f-state").textContent = "Request sent.";
  loadAll();
});

function renderMine() {
  const box = $("mine");
  if (!state.mine.length) { box.innerHTML = '<div class="empty">No requests yet. Fill the form above and your request will show up here with its status.</div>'; return; }
  box.innerHTML = state.mine.slice().reverse().map((r) =>
    `<div class="item"><div class="body"><div class="row between"><span class="amt">${inr(r.amount)}</span>${pill(r.status)}</div>
     <span class="upi">${esc(r.upi)}</span><span class="muted">${when(r.created_at)}</span></div></div>`).join("");
}

/* ---------- Admin panel ---------- */
function itemHtml(r, o) {
  return `<div class="item">${o.check ? `<input type="checkbox" data-id="${r.id}" aria-label="Select request" ${state.sel.has(r.id) ? "checked" : ""}>` : ""}
    <div class="body"><div class="row between"><span class="amt">${inr(r.amount)}</span>${o.pill ? pill(r.status) : ""}</div>
    <span>${esc(r.name)}</span><span class="upi">${esc(r.upi)}</span><span class="muted">${when(r.created_at)}</span>
    ${o.pay ? `<div class="row" style="margin-top:6px">
      <button class="btn ghost sm" data-copy="${esc(r.upi)}">Copy UPI ID</button>
      <button class="btn ghost sm" data-copy="${r.amount}">Copy amount</button>
      <button class="btn sm" data-paid="${r.id}">Mark paid</button></div>` : ""}
    </div></div>`;
}

function renderAdmin() {
  if (!state.isAdmin) return;
  const p = state.all.filter((r) => r.status === "pending");
  const a = state.all.filter((r) => r.status === "approved");
  const h = state.all.filter((r) => r.status === "paid" || r.status === "rejected").reverse();
  $("stats").innerHTML =
    `<div class="stat"><span class="muted">Pending</span><b>${p.length} · ${inr(sum(p))}</b></div>
     <div class="stat"><span class="muted">To pay now</span><b>${a.length} · ${inr(sum(a))}</b></div>
     <div class="stat"><span class="muted">Paid so far</span><b>${inr(sum(h.filter((r) => r.status === "paid")))}</b></div>`;
  $("pending").innerHTML = p.length ? p.map((r) => itemHtml(r, { check: 1 })).join("") : '<div class="empty">No pending requests. New ones appear here after users send them.</div>';
  $("approved").innerHTML = a.length ? a.map((r) => itemHtml(r, { pay: 1 })).join("") : '<div class="empty">Nothing waiting. Approve a request above and it moves here.</div>';
  $("history").innerHTML = h.length ? h.map((r) => itemHtml(r, { pill: 1 })).join("") : '<div class="empty">Paid and rejected requests will be listed here.</div>';
}

async function decide(ids, status) {
  if (!ids.length) return;
  $("adm-err").textContent = "";
  const { error } = await sb.from("withdrawals").update({ status, decided_at: new Date().toISOString() }).in("id", ids);
  if (error) { $("adm-err").textContent = "Could not save: " + error.message; return; }
  ids.forEach((id) => state.sel.delete(id));
  loadAll();
}
const pendingSelected = () => state.all.filter((r) => r.status === "pending" && state.sel.has(r.id)).map((r) => r.id);

$("adminPane").addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.copy !== undefined) {
    navigator.clipboard.writeText(t.dataset.copy).then(() => (t.textContent = "Copied"), () => (t.textContent = "Select manually"));
  }
  if (t.dataset.paid) decide([t.dataset.paid], "paid");
});
$("adminPane").addEventListener("change", (e) => {
  if (e.target.dataset.id) e.target.checked ? state.sel.add(e.target.dataset.id) : state.sel.delete(e.target.dataset.id);
});
$("selAll").onclick = () => { state.all.filter((r) => r.status === "pending").forEach((r) => state.sel.add(r.id)); renderAdmin(); };
$("approveSel").onclick = () => decide(pendingSelected(), "approved");
$("rejectSel").onclick = () => decide(pendingSelected(), "rejected");
$("paidAll").onclick = () => decide(state.all.filter((r) => r.status === "approved").map((r) => r.id), "paid");

/* ---------- Start ---------- */
sb.auth.onAuthStateChange((_event, session) => showApp(session));
sb.auth.getSession().then(({ data }) => showApp(data.session));
setInterval(() => { if (state.isAdmin && !$("adminPane").hidden) loadAll(); }, 20000);
