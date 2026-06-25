(function () {
  'use strict';

  const envelope = document.getElementById('envelope');
  const scene    = document.getElementById('scene');
  const card     = document.getElementById('card');
  const reset    = document.getElementById('reset');
  const hint      = document.getElementById('hint');

  let opened = false;

  function openInvite() {
    if (opened) return;
    opened = true;

    if (hint) hint.style.opacity = '0';

    // 1. break the seal & swing the doors
    envelope.classList.add('is-open');

    // 2. fade the whole envelope away once doors have started swinging
    setTimeout(() => scene.classList.add('gone'), 850);

    // 3. raise the card into view
    setTimeout(() => {
      card.classList.add('show');
      card.setAttribute('aria-hidden', 'false');
      reset.hidden = false;
    }, 950);
  }

  function closeInvite() {
    opened = false;
    card.classList.remove('show');
    card.setAttribute('aria-hidden', 'true');
    reset.hidden = true;
    envelope.classList.remove('is-open');
    scene.classList.remove('gone');
    if (hint) hint.style.opacity = '';
  }

  envelope.addEventListener('click', openInvite);
  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openInvite();
    }
  });

  reset.addEventListener('click', closeInvite);
})();
