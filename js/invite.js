import { supabase, configured } from './supabase.js';

const token = new URLSearchParams(location.search).get('to');

// DOM
const envTo       = document.getElementById('envTo');
const envToName   = document.getElementById('envToName');
const rsvpBtn     = document.getElementById('rsvpBtn');
const modal       = document.getElementById('rsvpModal');
const backdrop    = document.getElementById('rsvpBackdrop');
const closeBtn    = document.getElementById('rsvpClose');
const nameEl      = document.getElementById('rsvpName');
const invitedEl   = document.getElementById('rsvpInvited');
const btnAccept   = document.getElementById('btnAccept');
const btnDecline  = document.getElementById('btnDecline');
const seatsWrap   = document.getElementById('rsvpSeats');
const seatCount   = document.getElementById('seatCount');
const seatMinus   = document.getElementById('seatMinus');
const seatPlus    = document.getElementById('seatPlus');
const noteEl      = document.getElementById('rsvpNote');
const submitBtn   = document.getElementById('rsvpSubmit');
const feedback    = document.getElementById('rsvpFeedback');

let guest = null;          // { display_name, num_invited, rsvp_status, num_confirmed, note }
let choice = null;         // 'accepted' | 'declined'
let seats = 1;

// ---- load the personalised invite ----
async function load() {
  if (!token) return;                       // generic preview, no RSVP
  if (!configured()) {
    console.warn('Supabase is not configured yet (js/config.js).');
    return;
  }
  const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
  if (error) { console.error(error); return; }
  if (!data || !data.length) {              // bad/expired token
    envToName.textContent = 'Guest';
    envTo.hidden = false;
    return;
  }
  guest = data[0];

  envToName.textContent = guest.display_name;
  envTo.hidden = false;

  // seed modal
  nameEl.textContent = guest.display_name;
  invitedEl.textContent = guest.num_invited === 1
    ? 'You are invited'
    : `You are invited with up to ${guest.num_invited} guests`;
  seats = guest.num_confirmed > 0 ? guest.num_confirmed : Math.min(1, guest.num_invited);

  if (guest.rsvp_status !== 'pending') {
    choice = guest.rsvp_status;
    rsvpBtn.textContent = 'Update RSVP';
  }
  if (guest.note) noteEl.value = guest.note;

  rsvpBtn.hidden = false;
}

// ---- modal open/close ----
function openModal() {
  applyChoiceUI();
  renderSeats();
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  feedback.textContent = '';
}

// ---- choice + seats ----
function applyChoiceUI() {
  btnAccept.classList.toggle('selected', choice === 'accepted');
  btnDecline.classList.toggle('selected', choice === 'declined');
  seatsWrap.hidden = choice !== 'accepted';
  submitBtn.disabled = !choice;
}
function renderSeats() {
  seats = Math.max(1, Math.min(seats, guest ? guest.num_invited : 1));
  seatCount.textContent = seats;
  seatMinus.disabled = seats <= 1;
  seatPlus.disabled = guest ? seats >= guest.num_invited : true;
}

// ---- submit ----
async function submit() {
  if (!choice || !guest) return;
  submitBtn.disabled = true;
  feedback.textContent = 'Sending…';
  feedback.className = 'rsvp-feedback';

  const { data, error } = await supabase.rpc('submit_rsvp', {
    p_token: token,
    p_status: choice,
    p_confirmed: choice === 'accepted' ? seats : 0,
    p_note: noteEl.value.trim() || null,
  });

  if (error) {
    feedback.textContent = error.message || 'Something went wrong. Please try again.';
    feedback.classList.add('error');
    submitBtn.disabled = false;
    return;
  }

  guest = data[0];
  rsvpBtn.textContent = 'Update RSVP';
  feedback.classList.add('success');
  feedback.textContent = choice === 'accepted'
    ? `Thank you! We can't wait to celebrate with you.`
    : `Thank you for letting us know — you'll be missed.`;
  setTimeout(closeModal, 1800);
}

// ---- wire up ----
if (rsvpBtn) {
  rsvpBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  btnAccept.addEventListener('click', () => { choice = 'accepted'; applyChoiceUI(); renderSeats(); });
  btnDecline.addEventListener('click', () => { choice = 'declined'; applyChoiceUI(); });
  seatMinus.addEventListener('click', () => { seats--; renderSeats(); });
  seatPlus.addEventListener('click',  () => { seats++; renderSeats(); });
  submitBtn.addEventListener('click', submit);
}

load();
