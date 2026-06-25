import { supabase, configured } from './js/supabase.js';
import { ADMIN_EMAIL } from './js/config.js';

const loginScreen = document.getElementById('loginScreen');
const dash        = document.getElementById('dash');
const loginForm   = document.getElementById('loginForm');
const loginEmail  = document.getElementById('loginEmail');
const loginPass   = document.getElementById('loginPassword');
const loginBtn    = document.getElementById('loginBtn');
const loginError  = document.getElementById('loginError');
const signoutBtn  = document.getElementById('signout');
const addForm     = document.getElementById('addForm');
const addName     = document.getElementById('addName');
const addCount    = document.getElementById('addCount');
const addError    = document.getElementById('addError');
const guestRows   = document.getElementById('guestRows');
const emptyState  = document.getElementById('emptyState');
const configWarn  = document.getElementById('configWarning');

// invite links point at index.html in this same folder, on whatever
// host we're running on (github.io, vercel.app, custom domain…)
const inviteBase = new URL('./', location.href).href;

if (!configured()) {
  configWarn.hidden = false;
}

// ---------- auth ----------
// Toggle the UI from a known session. NOTE: never call supabase.auth.*
// methods inside onAuthStateChange — it deadlocks the client. We use the
// session the listener hands us and defer DB work out of the callback.
function applySession(session) {
  const signedIn = !!session;
  loginScreen.hidden = signedIn;
  dash.hidden = !signedIn;
  if (signedIn) setTimeout(loadGuests, 0);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  loginBtn.disabled = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPass.value,
  });
  loginBtn.disabled = false;
  if (error) { loginError.textContent = error.message; return; }
  // onAuthStateChange fires with the new session and updates the UI.
});

signoutBtn.addEventListener('click', () => { supabase.auth.signOut(); });

// ---------- guests ----------
function esc(s) {
  return (s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const STATUS_LABEL = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' };
let guestsCache = [];

// delegated row interactions (survive re-renders)
guestRows.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) handleAction(btn.dataset.action, btn.dataset.id);
});
guestRows.addEventListener('keydown', (e) => {
  const row = e.target.closest('tr.editing');
  if (!row) return;
  if (e.key === 'Enter')  { e.preventDefault(); saveGuest(row.dataset.id); }
  if (e.key === 'Escape') { loadGuests(); }
});

async function loadGuests() {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    guestRows.innerHTML = `<tr><td colspan="9" class="row-error">${esc(error.message)}</td></tr>`;
    return;
  }
  render(data || []);
}

function render(guests) {
  // summary
  const sum = guests.reduce((a, g) => {
    a.seats += g.num_invited;
    a.confirmed += g.num_confirmed;
    a[g.rsvp_status]++;
    return a;
  }, { seats: 0, confirmed: 0, accepted: 0, declined: 0, pending: 0 });

  document.getElementById('sInvites').textContent   = guests.length;
  document.getElementById('sSeats').textContent     = sum.seats;
  document.getElementById('sConfirmed').textContent = sum.confirmed;
  document.getElementById('sAccepted').textContent  = sum.accepted;
  document.getElementById('sDeclined').textContent  = sum.declined;
  document.getElementById('sPending').textContent   = sum.pending;

  guestsCache = guests;
  emptyState.hidden = guests.length > 0;
  guestRows.innerHTML = guests.map(rowHtml).join('');
}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function rowHtml(g) {
  const link = `${inviteBase}?to=${g.token}`;
  return `
    <tr data-id="${g.id}">
      <td data-field="name">${esc(g.display_name)}</td>
      <td data-field="invited" class="num">${g.num_invited}</td>
      <td><span class="badge ${g.rsvp_status}">${STATUS_LABEL[g.rsvp_status]}</span></td>
      <td class="num">${g.num_confirmed}</td>
      <td class="col-hide date">${fmtDate(g.created_at)}</td>
      <td class="col-hide date">${fmtDate(g.responded_at)}</td>
      <td class="col-hide note">${esc(g.note) || '—'}</td>
      <td><button class="link-btn" data-action="copy" data-id="${g.id}" title="${esc(link)}">Copy link</button></td>
      <td class="row-actions">
        <button class="icon-btn" data-action="edit"   data-id="${g.id}" title="Edit">✎</button>
        <button class="icon-btn" data-action="delete" data-id="${g.id}" title="Delete">🗑</button>
      </td>
    </tr>`;
}

// ---------- add ----------
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.textContent = '';
  const display_name = addName.value.trim();
  const num_invited = parseInt(addCount.value, 10);
  if (!display_name || !(num_invited >= 1)) return;

  const { error } = await supabase.from('guests').insert({ display_name, num_invited });
  if (error) { addError.textContent = error.message; return; }
  addName.value = '';
  addCount.value = 2;
  addName.focus();
  loadGuests();
});

// ---------- row actions ----------
async function handleAction(action, id) {
  if (action === 'copy')   return copyLink(id);
  if (action === 'delete') return deleteGuest(id);
  if (action === 'edit')   return editGuest(id);
  if (action === 'save')   return saveGuest(id);
  if (action === 'cancel') return loadGuests();
}

async function copyLink(id) {
  const row = guestRows.querySelector(`tr[data-id="${id}"] [data-action="copy"]`);
  const link = row.getAttribute('title');
  try {
    await navigator.clipboard.writeText(link);
    const prev = row.textContent;
    row.textContent = 'Copied!';
    setTimeout(() => { row.textContent = prev; }, 1400);
  } catch {
    prompt('Copy this invite link:', link);
  }
}

async function deleteGuest(id) {
  if (!confirm('Remove this guest?')) return;
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  loadGuests();
}

function editGuest(id) {
  const g = guestsCache.find((x) => x.id === id);
  if (!g) return;
  const tr = guestRows.querySelector(`tr[data-id="${id}"]`);
  tr.classList.add('editing');

  const minInvited = Math.max(1, g.num_confirmed);
  tr.querySelector('[data-field="name"]').innerHTML =
    `<input class="edit-name" type="text" value="${esc(g.display_name)}" />`;
  tr.querySelector('[data-field="invited"]').innerHTML =
    `<input class="edit-invited" type="number" min="${minInvited}" value="${g.num_invited}" />`;
  tr.querySelector('.row-actions').innerHTML =
    `<button class="icon-btn" data-action="save"   data-id="${id}" title="Save">✓</button>
     <button class="icon-btn" data-action="cancel" data-id="${id}" title="Cancel">✕</button>`;
  tr.querySelector('.edit-name').focus();
}

async function saveGuest(id) {
  const g = guestsCache.find((x) => x.id === id);
  const tr = guestRows.querySelector(`tr[data-id="${id}"]`);
  const display_name = tr.querySelector('.edit-name').value.trim();
  const num_invited = parseInt(tr.querySelector('.edit-invited').value, 10);

  if (!display_name) { alert('Please enter a name.'); return; }
  if (!(num_invited >= 1)) { alert('Invited must be at least 1.'); return; }
  if (g && num_invited < g.num_confirmed) {
    alert(`This guest has already confirmed ${g.num_confirmed} — invited can't be lower.`);
    return;
  }

  const { error } = await supabase.from('guests')
    .update({ display_name, num_invited })
    .eq('id', id);
  if (error) { alert(error.message); return; }
  loadGuests();
}

// react to auth changes (sign-in, sign-out, token refresh) using the
// session the listener provides — do NOT call auth methods in here.
supabase.auth.onAuthStateChange((_event, session) => applySession(session));

// initial state check, outside any callback (safe to await here)
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  applySession(session);
})();
