(function () {
  // =============================
  // 0. DOM & CONSTANTS
  // =============================
  const board = document.getElementById("sudoku-board");
  if (!board) return;

  const els = {
    difficulty: document.getElementById("difficulty"),
    timer: document.getElementById("timerDisplay"),
    bestDiff: document.getElementById("bestDiff"),
    bestTime: document.getElementById("bestTimeDisplay"),
    keypad: document.getElementById("sudokuKeypad"),
    btnNew: document.getElementById("newSudoku"),
    btnCheck: document.getElementById("checkSudoku"),
    btnSolve: document.getElementById("solveSudoku"),
  };

  const KEYS = { BEST: "sudoku_best_times", GAME: "sudoku_game_v1" };
  const DIFF_LABEL = { easy: "Einfach", medium: "Mittel", hard: "Schwer" };
  const CELL_COUNT = 81;
  const DIFF_CFG = {
    easy: { holes: 35 },
    medium: { holes: 45 },
    hard: { holes: 55 },
  };
  const STORE_DIFF_KEY = "sudoku_difficulty";

  // =============================
  // 1. STATE
  // =============================
  const state = {
    originalPuzzle: null,
    selectedCell: null,
    solvedBySystem: false,
  };

  const timer = {
    id: null,
    startTs: 0,
    elapsedMs: 0,
    nextAutosaveTs: 0,
  };

  // =============================
  // 2. UTIL
  // =============================
  const isTouchDevice = () =>
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    window.matchMedia("(pointer: coarse)").matches;

  const cells = () => Array.from(board.querySelectorAll("input"));

  const fmt = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  const currentDifficulty = () => els.difficulty?.value || "medium";

  // --- Spielstand speichern --- //
  function saveGame(running = !!timer.id) {
    if (!state.originalPuzzle) return;
    const data = {
      difficulty: currentDifficulty(),
      originalPuzzle: state.originalPuzzle,
      grid: getGrid(),
      elapsedMs: timer.elapsedMs,
      running,
      solvedBySystem: state.solvedBySystem,
      ts: Date.now(),
    };
    localStorage.setItem(KEYS.GAME, JSON.stringify(data));
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(KEYS.GAME);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearGame() {
    localStorage.removeItem(KEYS.GAME);
  }

  // ---- Gleiches Zahl-Highlighting ----
  function clearSameHighlights() {
    document
      .querySelectorAll("#sudoku-board input.is-same")
      .forEach((el) => el.classList.remove("is-same"));
  }

  function highlightSameNumbersOf(cell) {
    clearSameHighlights();
    const v = cell.value?.trim();
    if (!v) return;
    document.querySelectorAll("#sudoku-board input").forEach((el) => {
      if (el.value === v) el.classList.add("is-same");
    });
  }

  // =============================
  // 3. BESTZEITEN
  // =============================
  function loadBestTimes() {
    try {
      return (
        JSON.parse(localStorage.getItem(KEYS.BEST)) || {
          easy: null,
          medium: null,
          hard: null,
        }
      );
    } catch {
      return { easy: null, medium: null, hard: null };
    }
  }
  function saveBestTimes(obj) {
    localStorage.setItem(KEYS.BEST, JSON.stringify(obj));
  }
  function updateBestUI() {
    const diff = currentDifficulty();
    const best = loadBestTimes()[diff];
    if (els.bestDiff) els.bestDiff.textContent = DIFF_LABEL[diff];
    if (els.bestTime) els.bestTime.textContent = best == null ? "–" : fmt(best);
  }
  function maybeSetBestTime() {
    if (state.solvedBySystem) return;
    const diff = currentDifficulty();
    const best = loadBestTimes();
    if (best[diff] == null || timer.elapsedMs < best[diff]) {
      best[diff] = timer.elapsedMs;
      saveBestTimes(best);
    }
    updateBestUI();
  }

  // =============================
  // 4. TIMER
  // =============================
  function renderTimer() {
    if (els.timer) els.timer.textContent = fmt(timer.elapsedMs);
  }
  function startTimer() {
    stopTimer();
    timer.startTs = performance.now() - (timer.elapsedMs || 0);
    timer.nextAutosaveTs = performance.now() + 1000;
    timer.id = setInterval(() => {
      timer.elapsedMs = performance.now() - timer.startTs;
      renderTimer();
      const now = performance.now();
      if (now >= timer.nextAutosaveTs) {
        saveGame(true);
        do {
          timer.nextAutosaveTs += 1000;
        } while (timer.nextAutosaveTs <= now);
      }
    }, 200);
  }
  function stopTimer() {
    if (timer.id) clearInterval(timer.id);
    timer.id = null;
    saveGame(false);
  }
  function resetTimer() {
    stopTimer();
    timer.elapsedMs = 0;
    renderTimer();
  }

  // =============================
  // 5. BOARD / UI
  // =============================
  function createBoard() {
    board.innerHTML = "";
    const touch = isTouchDevice();

    for (let i = 0; i < CELL_COUNT; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.autocapitalize = "off";
      input.spellcheck = false;
      input.inputMode = touch ? "none" : "numeric";
      input.readOnly = touch ? true : false;

      input.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        input.focus({ preventScroll: true });
      });

      // Ein einziger Input-Listener: validieren + ggf. lösen
      input.addEventListener("input", (e) => {
        if (!/^[1-9]$/.test(e.target.value)) e.target.value = "";
        highlightSameNumbersOf(e.target);
        setTimeout(() => {
          if (timer.id && isCurrentSolvedCorrect()) onSolved();
        }, 0);
        queueSolvedCheck();
        saveGame();
      });

      input.addEventListener("focus", (e) => {
        try {
          const pos = e.target.value ? e.target.value.length : 0;
          e.target.setSelectionRange(pos, pos);
        } catch {}
        cells().forEach((c) => c.classList.remove("active"));
        input.classList.add("active");
        state.selectedCell = input;
      });

      board.appendChild(input);
    }
  }

  function applyInputMode() {
    const touch = isTouchDevice();
    cells().forEach((input) => {
      input.inputMode = touch ? "none" : "numeric";
      input.readOnly = touch || input.classList.contains("given");
    });
  }

  function clearAllMarks() {
    cells().forEach((c) => {
      c.classList.remove("given", "active", "is-related", "is-same");
      c.readOnly = false;
    });
  }

  function getGrid() {
    const cs = cells();
    const grid = [];
    for (let r = 0; r < 9; r++) {
      grid.push(
        cs.slice(r * 9, r * 9 + 9).map((c) => (c.value ? Number(c.value) : 0))
      );
    }
    return grid;
  }

  function setGrid(grid, lock = false) {
    const cs = cells();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = cs[r * 9 + c];
        const v = grid[r][c] || "";
        cell.value = v;
  
        // Neu: immer konsistent setzen/entfernen – unabhängig vom alten Zustand
        if (lock && v !== "") {
          cell.readOnly = true;
          cell.classList.add("given");
        } else {
          cell.readOnly = false;
          cell.classList.remove("given");
        }
      }
    }
  }

  function restoreGameIfAny() {
    const saved = loadGame();
    if (!saved) return false;

    // Schwierigkeit laden
    if (els.difficulty && DIFF_LABEL[saved.difficulty]) {
      els.difficulty.value = saved.difficulty;
    }

    // Board aufbauen und füllen
    createBoard();
    state.originalPuzzle = clone(saved.originalPuzzle);
    setGrid(saved.originalPuzzle, true);

    const cs = cells();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (saved.originalPuzzle[r][c] === 0) {
          const idx = r * 9 + c;
          const v = saved.grid[r][c] || "";
          cs[idx].value = v;
          cs[idx].readOnly = false;
        }
      }
    }

    state.solvedBySystem = !!saved.solvedBySystem;
    applyInputMode();

    timer.elapsedMs = saved.elapsedMs || 0;
    renderTimer();

    if (saved.running && !state.solvedBySystem) {
      stopTimer();
      timer.startTs = performance.now() - timer.elapsedMs;
      timer.id = setInterval(() => {
        timer.elapsedMs = performance.now() - timer.startTs;
        renderTimer();
      }, 200);
    }

    updateBestUI();
    return true;
  }

  // =============================
  // 6. SUDOKU-LOGIK
  // =============================
  function isSafe(grid, row, col, num) {
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num || grid[x][col] === num) return false;
    }
    const r0 = row - (row % 3),
      c0 = col - (col % 3);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r0 + r][c0 + c] === num) return false;
      }
    }
    return true;
  }

  function solve(grid) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafe(grid, row, col, num)) {
              grid[row][col] = num;
              if (solve(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  function generateFullGrid(
    grid = Array.from({ length: 9 }, () => Array(9).fill(0))
  ) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num of nums) {
            if (isSafe(grid, row, col, num)) {
              grid[row][col] = num;
              if (generateFullGrid(grid)) return grid;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return grid;
  }

  function hasUniqueSolution(grid) {
    let count = 0;
    const N = 9;
    function backtrack() {
      if (count > 1) return;
      let rr = -1,
        cc = -1;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (grid[r][c] === 0) {
            rr = r;
            cc = c;
            break;
          }
        }
        if (rr !== -1) break;
      }
      if (rr === -1) {
        count++;
        return;
      }
      for (let num = 1; num <= 9; num++) {
        if (isSafe(grid, rr, cc, num)) {
          grid[rr][cc] = num;
          backtrack();
          if (count > 1) {
            grid[rr][cc] = 0;
            return;
          }
          grid[rr][cc] = 0;
        }
      }
    }

    backtrack();
    return count === 1;
  }

  function removeNumbers(grid, holes = 45) {
    let attempts = holes;
    const start = performance.now();
    while (attempts > 0) {
      if (performance.now() - start > 50) break;

      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (grid[row][col] !== 0) {
        const backup = grid[row][col];
        grid[row][col] = 0;
        const copy = clone(grid);
        if (!hasUniqueSolution(copy)) grid[row][col] = backup;
        else attempts--;
      }
    }
    return grid;
  }

  function generateSudoku(difficulty = "medium") {
    const full = generateFullGrid();
    const { holes } = DIFF_CFG[difficulty] || DIFF_CFG.medium;
    return removeNumbers(full, holes);
  }

  function isCurrentSolvedCorrect() {
    const grid = getGrid();
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) if (grid[r][c] === 0) return false;

    const solution = getSolutionFromOriginal();
    if (!solution) return false;
    return solution.every((row, r) => row.every((v, c) => v === grid[r][c]));
  }

  // kleine Queue, um nach Input den Check am Ende der Tick auszuführen
  function queueSolvedCheck() {
    setTimeout(() => {
      if (timer.id && isCurrentSolvedCorrect()) onSolved();
    }, 0);
  }

  function getSolutionFromOriginal() {
    if (!state.originalPuzzle) return null;
    const g = clone(state.originalPuzzle);
    solve(g);
    return g;
  }

  // =============================
  // 7. SNAPSHOTS (Highlights)
  // =============================
  function snapshotHighlights() {
    const snap = new Map();
    cells().forEach((c, i) => {
      const keep = [];
      if (c.classList.contains("is-related")) keep.push("is-related");
      if (c.classList.contains("is-same")) keep.push("is-same");
      if (c.classList.contains("active")) keep.push("active");
      if (keep.length) snap.set(i, keep);
    });
    return snap;
  }
  function restoreHighlights(snap) {
    const all = cells();
    all.forEach((c) => c.classList.remove("is-related", "is-same", "active"));
    snap.forEach((classes, i) => {
      const cell = all[i];
      if (!cell) return;
      classes.forEach((k) => cell.classList.add(k));
    });
  }

  // =============================
  // 8. ACTIONS (Buttons)
  // =============================
  function fillRandomSudoku() {
    clearAllMarks();
    const grid = generateSudoku(currentDifficulty());
    state.originalPuzzle = clone(grid);
    setGrid(grid, true);
    applyInputMode();

    state.solvedBySystem = false;
    resetTimer();
    updateBestUI();
    startTimer();
    saveGame(true);
  }

  function checkSudoku() {
    if (!state.originalPuzzle) {
      alert("❗ Bitte zuerst ein Sudoku generieren.");
      return;
    }
    const grid = getGrid();
    const solution = getSolutionFromOriginal();
    if (!solution) {
      alert("❌ Keine Lösung gefunden – sollte eigentlich nie passieren.");
      return;
    }

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0 && grid[r][c] !== solution[r][c]) {
          alert("❌ Fehlerhafte Eingabe im Sudoku!");
          return;
        }
      }
    }

    alert("✅ Alles richtig bis jetzt!");
    if (isCurrentSolvedCorrect()) onSolved();
  }

  function solveSudoku() {
    if (!state.originalPuzzle) {
      alert("❗ Bitte zuerst ein Sudoku generieren.");
      return;
    }
    const original = clone(state.originalPuzzle);
  
    const snap = snapshotHighlights();
    const grid = clone(state.originalPuzzle);
  
    if (solve(grid)) {
      state.solvedBySystem = true;
      setGrid(grid, false);
      const cs = cells();
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (original[r][c] !== 0) {
            const cell = cs[r * 9 + c];
            cell.classList.add("given");
            cell.readOnly = true;
          }
        }
      }
  
      restoreHighlights(snap);
      stopTimer();
      saveGame(false);
      alert("✅ Sudoku vollständig gelöst!");
    } else {
      alert("❌ Keine Lösung gefunden – sollte eigentlich nie passieren.");
    }
  }

  function onSolved() {
    stopTimer();
    clearGame();
    if (state.solvedBySystem) return;
    maybeSetBestTime();
    alert(`🎉 Geschafft! Zeit: ${fmt(timer.elapsedMs)}`);
  }

  const fileInput = document.getElementById("sudokuPhoto");
  const btnImport = document.getElementById("importSudoku");

  async function importFromPhoto(file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("http://localhost:8000/api/sudoku/parse", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("❌ Import fehlgeschlagen: " + (err.error || res.status));
      return;
    }

    const { grid, confidence } = await res.json();
    console.log("OCR confidence:", confidence);

    state.originalPuzzle = JSON.parse(JSON.stringify(grid));
    setGrid(grid, true);
    applyInputMode();
    state.solvedBySystem = false;
    resetTimer();
    updateBestUI();
    startTimer();
  }

  btnImport?.addEventListener("click", () => {
    const f = fileInput?.files?.[0];
    if (!f) return alert("Bitte ein Foto auswählen.");
    importFromPhoto(f);
  });

  // =============================
  // 9. EVENTS (UI)
  // =============================
  els.btnNew?.addEventListener("click", fillRandomSudoku);
  els.btnCheck?.addEventListener("click", checkSudoku);
  els.btnSolve?.addEventListener("click", solveSudoku);
  els.difficulty?.addEventListener("change", () => {
    localStorage.setItem(STORE_DIFF_KEY, els.difficulty.value);
    updateBestUI();
    fillRandomSudoku();
  });

  // Keypad (mobil / Desktop)
  if (els.keypad) {
    board.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT") {
        state.selectedCell = e.target;
        cells().forEach((c) => c.classList.remove("active"));
        state.selectedCell.classList.add("active");
      }
    });

    els.keypad.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || !state.selectedCell) return;
      if (state.selectedCell.classList.contains("given")) return;
      const num = btn.dataset.num;
      if (num === undefined) return;
      state.selectedCell.value = num || "";
      highlightSameNumbersOf(state.selectedCell);
      setTimeout(() => {
        if (timer.id && isCurrentSolvedCorrect()) onSolved();
      }, 0);
      queueSolvedCheck();
    });
  }

  // Tastatur-Navigation
  function focusCell(row, col) {
    if (row < 0 || row > 8 || col < 0 || col > 8) return;
    const idx = row * 9 + col;
    const all = cells();
    const target = all[idx];
    if (!target) return;
    target.focus({ preventScroll: true });
    try {
      const pos = target.value ? target.value.length : 0;
      target.setSelectionRange(pos, pos);
    } catch {}
    all.forEach((c) => c.classList.remove("active"));
    target.classList.add("active");
    state.selectedCell = target;
  }
  function currentPos() {
    const all = cells();
    const idx = all.indexOf(document.activeElement);
    if (idx === -1) return { row: 0, col: 0 };
    return { row: Math.floor(idx / 9), col: idx % 9 };
  }
  board.addEventListener("keydown", (e) => {
    const el = document.activeElement;
    if (!(el && el.tagName === "INPUT")) return;

    if (el.classList.contains("given")) {
      const key = e.key;
      if (/^[1-9]$/.test(key) || ["Backspace", "Delete"].includes(key)) {
        e.preventDefault(); // Givens nicht editierbar
        return;
      }
    }

    const { key } = e;
    const { row, col } = currentPos();
    if (key === "ArrowLeft") {
      e.preventDefault();
      focusCell(row, col - 1);
    } else if (key === "ArrowRight") {
      e.preventDefault();
      focusCell(row, col + 1);
    } else if (key === "ArrowUp") {
      e.preventDefault();
      focusCell(row - 1, col);
    } else if (key === "ArrowDown") {
      e.preventDefault();
      focusCell(row + 1, col);
    } else if (key === "Home") {
      e.preventDefault();
      focusCell(row, 0);
    } else if (key === "End") {
      e.preventDefault();
      focusCell(row, 8);
    } else if (key === "PageUp") {
      e.preventDefault();
      focusCell(0, col);
    } else if (key === "PageDown") {
      e.preventDefault();
      focusCell(8, col);
    }
  });

  board.addEventListener("focusin", (e) => {
    if (e.target.tagName === "INPUT") {
      state.selectedCell = e.target;
      cells().forEach((c) => c.classList.remove("active"));
      e.target.classList.add("active");
      highlightSameNumbersOf(e.target);
    }
  });

  // Reaktionsfähigkeit auf Gerätewechsel
  window
    .matchMedia("(pointer: coarse)")
    .addEventListener?.("change", applyInputMode);
  window.addEventListener("orientationchange", () =>
    setTimeout(applyInputMode, 50)
  );
  window.addEventListener("resize", () => setTimeout(applyInputMode, 50));

  // =============================
  // 10. INIT
  // =============================
  if (els.difficulty) {
    const saved = localStorage.getItem(STORE_DIFF_KEY);
    if (saved && DIFF_LABEL[saved]) els.difficulty.value = saved;
  }
  createBoard();

  if (!restoreGameIfAny()) {
    fillRandomSudoku();
  }

  updateBestUI();
  renderTimer();

  // ===================================
  // 11. Autosave bei Tab-/Seitenwechsel
  // ===================================
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(!!timer.id);
  });
  window.addEventListener("pagehide", () => saveGame(!!timer.id));
  window.addEventListener("beforeunload", () => saveGame(!!timer.id));

  // =============================
  // 12. EDITIEREN NACH IMPORT
  // =============================
  let editMode = false;

  const btnEdit  = document.getElementById("editImported");
  const btnSave  = document.getElementById("saveImported");

  function setEditMode(on) {
    editMode = on;
    if (btnEdit) btnEdit.disabled = on;
    if (btnSave) btnSave.disabled = !on;

    // Givens vorübergehend editierbar machen
    cells().forEach((c) => {
      if (c.classList.contains("given")) {
        c.readOnly = !on;                 // im Editmodus: editierbar
        c.classList.toggle("given--editing", on);
      }
    });
  }

  // Optional: Im Editmodus per Alt+Klick den "Given"-Status eines Feldes toggeln
  board.addEventListener("click", (e) => {
    if (!editMode) return;
    const el = e.target;
    if (el && el.tagName === "INPUT" && e.altKey) {
      el.classList.toggle("given");
      el.readOnly = el.classList.contains("given") ? true : false;
      el.classList.toggle("given--editing", editMode && el.classList.contains("given"));
    }
  });

  // „Bearbeiten“: OCR-Ergebnis korrigierbar machen
  btnEdit?.addEventListener("click", () => {
    if (!state.originalPuzzle) {
      alert("Zuerst ein Sudoku importieren/erkennen.");
      return;
    }
    // Während der Korrektur Timer pausieren (optional)
    stopTimer();
    setEditMode(true);
  });

  // „Speichern“: Aktuelle Eingaben als neue Vorlage (Givens) einfrieren
  btnSave?.addEventListener("click", () => {
    // 1) Werte normalisieren (nur 1–9; sonst 0)
    const grid = getGrid();

    // 2) Diese korrigierte Vorlage als neue "originalPuzzle" übernehmen
    state.originalPuzzle = grid.map(row => row.slice());

    // 3) Board neu setzen & Givens festziehen
    //    Regel: Jede Nicht-Null wird wieder als "given" gesperrt.
    setGrid(state.originalPuzzle, true);

    // 4) Editmodus aus; Styling bereinigen
    setEditMode(false);
    clearSameHighlights();
    // Optional: aktive Zelle zurücksetzen
    state.selectedCell = null;

    // 5) Timer sauber neu starten – jetzt gilt die korrigierte Vorlage als Start
    state.solvedBySystem = false;
    resetTimer();
    updateBestUI();
    startTimer();

    // 6) Persistieren
    saveGame(true);
    alert("✅ Änderungen übernommen. Viel Erfolg!");
  });
})();