document.addEventListener("touchstart", () => {}, { passive: true });

function watchForHover() {
  let lastTouchTime = 0;

  function enableHover() {
    if (new Date() - lastTouchTime < 500) return;
    document.body.classList.add("hasHover");
  }

  function disableHover() {
    document.body.classList.remove("hasHover");
  }

  function updateLastTouchTime() {
    lastTouchTime = new Date();
  }

  document.addEventListener("touchstart", updateLastTouchTime, true);
  document.addEventListener("touchstart", disableHover, true);
  document.addEventListener("mousemove", enableHover, true);

  enableHover();
}

// --- Haptisches Feedback bei Button-Klick ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(
    "button, .btn, .btn-round, .btn-round--del, .btn-round--ok, .sudoku-keypad button, .kontakt-form buton, .note-item, .theme-switch"
  );
  if (!btn) return;

  if (navigator.vibrate) {
    navigator.vibrate(8);
  }
});

watchForHover();

// --- Dropdown --- //
const btn = document.getElementById("difficultyBtn");
const menu = document.getElementById("difficultyMenu");

btn.addEventListener("click", () => menu.classList.toggle("show"));

menu.querySelectorAll("div").forEach(item => {
  item.addEventListener("click", () => {
    const val = item.dataset.value;
    btn.textContent = item.textContent + " ▾";
    menu.classList.remove("show");
    localStorage.setItem("sudoku_difficulty", val);
    fillRandomSudoku(); // dein vorhandener Funktionsaufruf
  });
});

// Schließen bei Klick außerhalb
document.addEventListener("click", (e) => {
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove("show");
  }
});
