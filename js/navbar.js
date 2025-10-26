(function () {
    const toggle = document.getElementById('navToggle');
    const navbar = document.querySelector('.navbar');
    const menu   = document.getElementById('navMenu');
    if (!toggle || !navbar || !menu) return;

    function setOpen(open) {
      navbar.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    }

    toggle.addEventListener('click', () => {
      setOpen(!navbar.classList.contains('is-open'));
    });

    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);  /* Link klick schließt */
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });
  })();