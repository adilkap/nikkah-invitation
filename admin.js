import { supabase, configured } from './js/supabase.js';
import { ADMIN_EMAIL } from './js/config.js';

const loginScreen = document.getElementById('loginScreen');
const dash        = document.getElementById('dash');
const loginForm   = document.getElementById('loginForm');
const loginEmail  = document.getElementById('loginEmail');
const loginPass   = document.getElementById('loginPassword');
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
async function refresh() {
  const { data: { session } } = await supabase.auth.getSession();
  const signedIn = !!session;
  loginScreen.hidden = signedIn;
  dash.hidden = !signedIn;
  if (signedIn) loadGuests();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPass.value,
  });
  if (error) { loginError.textContent = error.message; return; }
  refresh();
});

signoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  refresh();
});

// ---------- guests ----------
function esc(s) {
  return (s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const STATUS_LABEL = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' };

async function loadGuests() {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    guestRows.innerHTML = `<tr><td colspan="7" class="row-error">${esc(error.message)}</td></tr>`;
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

  emptyState.hidden = guests.length > 0;
  guestRows.innerHTML = guests.map(rowHtml).join('');
  guestRows.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', () => handleAction(el.dataset.action, el.dataset.id));
  });
}

function rowHtml(g) {
  const link = `${inviteBase}?to=${g.token}`;
  return `
    <tr data-id="${g.id}">
      <td data-field="name">${esc(g.display_name)}</td>
      <td data-field="invited" class="num">${g.num_invited}</td>
      <td><span class="badge ${g.rsvp_status}">${STATUS_LABEL[g.rsvp_status]}</span></td>
      <td class="num">${g.num_confirmed}</td>
      <td class="note">${esc(g.note) || '—'}</td>
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

async function editGuest(id) {
  const tr = guestRows.querySelector(`tr[data-id="${id}"]`);
  const nameCell = tr.querySelector('[data-field="name"]');
  const invitedCell = tr.querySelector('[data-field="invited"]');
  const curName = nameCell.textContent;
  const curInvited = invitedCell.textContent;

  const name = prompt('Guest / family name:', curName);
  if (name === null) return;
  const invitedStr = prompt('Number invited:', curInvited);
  if (invitedStr === null) return;
  const num_invited = parseInt(invitedStr, 10);
  if (!(num_invited >= 1)) { alert('Invited must be at least 1.'); return; }

  const { error } = await supabase.from('guests')
    .update({ display_name: name.trim(), num_invited })
    .eq('id', id);
  if (error) { alert(error.message); return; }
  loadGuests();
}

// react to auth changes (e.g. token refresh, sign-out in another tab)
supabase.auth.onAuthStateChange(() => refresh());
refresh();
