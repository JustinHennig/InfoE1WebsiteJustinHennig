(function () {
  const board = document.getElementById("sudoku-board");
  const isTouchDevice = () =>
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    window.matchMedia("(pointer: coarse)").matches;
  if (!board) return;

  // =============================
  // 1️ BOARD ERSTELLEN
  // =============================
  function createBoard() {
    board.innerHTML = "";
    const touch = isTouchDevice();

    for (let i = 0; i < 81; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;

      if (touch) {
        input.readOnly = true;
        input.inputMode = "none";
      } else {
        input.readOnly = false;
        input.inputMode = "numeric";
      }

      input.autocomplete = "off";
      input.autocapitalize = "off";
      input.spellcheck = false;

      input.addEventListener("input", (e) => {
        if (!/^[1-9]$/.test(e.target.value)) e.target.value = "";
      });

      input.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        input.focus({ preventScroll: true });
      });

      input.addEventListener("focus", (e) => {
        try {
          e.target.setSelectionRange(0, 0);
        } catch {}
      });

      board.appendChild(input);
    }
  }

  function applyInputMode() {
    const touch = isTouchDevice();
    board.querySelectorAll("input").forEach((input) => {
      if (touch) {
        input.readOnly = true;
        input.inputMode = "none";
      } else {
        if (input.classList.contains("given")) {
          input.readOnly = true;
        } else {
          input.readOnly = false;
        }
        input.inputMode = "numeric";
      }
    });
  }

  window
    .matchMedia("(pointer: coarse)")
    .addEventListener?.("change", applyInputMode);
  window.addEventListener("orientationchange", () =>
    setTimeout(applyInputMode, 50)
  );
  window.addEventListener("resize", () => setTimeout(applyInputMode, 50));

  let originalPuzzle = null;

  // =============================
  // 2️ GRUNDLEGENDES SUDOKU-LOGIK
  // =============================
  function getGrid() {
    const cells = Array.from(board.querySelectorAll("input"));
    const grid = [];
    for (let r = 0; r < 9; r++) {
      grid.push(
        cells
          .slice(r * 9, r * 9 + 9)
          .map((c) => (c.value ? Number(c.value) : 0))
      );
    }
    return grid;
  }

  function setGrid(grid, lock = false) {
    const cells = Array.from(board.querySelectorAll("input"));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = cells[r * 9 + c];
        const v = grid[r][c] || "";
        cell.value = v;
  
        const isGivenAlready = cell.classList.contains('given');
  
        if (lock && v !== "") {
          cell.readOnly = true;
          cell.classList.add("given");
        } else {
          if (!isGivenAlready) {
            cell.readOnly = false;
            cell.classList.remove("given");
          }
        }
      }
    }
  }

  function isSafe(grid, row, col, num) {
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num || grid[x][col] === num) return false;
    }
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] === num) return false;
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

  // =============================
  // 3️ ZUFÄLLIGES SUDOKU GENERIEREN
  // =============================
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

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

  function removeNumbers(grid, holes = 45) {
    let attempts = holes;
    while (attempts > 0) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (grid[row][col] !== 0) {
        const backup = grid[row][col];
        grid[row][col] = 0;

        const copy = JSON.parse(JSON.stringify(grid));
        if (!hasUniqueSolution(copy)) {
          grid[row][col] = backup;
        } else {
          attempts--;
        }
      }
    }
    return grid;
  }

  function hasUniqueSolution(grid) {
    let count = 0;

    function backtrack() {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (grid[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (isSafe(grid, row, col, num)) {
                grid[row][col] = num;
                backtrack();
                grid[row][col] = 0;
              }
            }
            return;
          }
        }
      }
      count++;
      if (count > 1) return;
    }

    backtrack();
    return count === 1;
  }

  function generateSudoku(difficulty = "medium") {
    const full = generateFullGrid();
    const holes = difficulty === "easy" ? 35 : difficulty === "hard" ? 55 : 45;
    return removeNumbers(full, holes);
  }

  // === Helpers zum Sichern/Wiederherstellen der Markierungen ===
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
    snap.forEach((klassen, i) => {
      const cell = all[i];
      if (!cell) return;
      klassen.forEach((k) => cell.classList.add(k));
    });
  }

  // =============================
  // 4️ FUNKTIONEN FÜR BUTTONS
  // =============================
  function clearAllMarks() {
    const all = Array.from(board.querySelectorAll("input"));
    all.forEach(c => {
      c.classList.remove('given','active','is-related','is-same');
      c.readOnly = false;
    });
  }
  
  function fillRandomSudoku() {
    const difficulty = document.getElementById("difficulty")?.value || "medium";

    clearAllMarks();
    const sudoku = generateSudoku(difficulty);
    originalPuzzle = JSON.parse(JSON.stringify(sudoku));
  
    setGrid(sudoku, true);
    applyInputMode();   
  }

  function checkSudoku() {
    const grid = getGrid();
    const solved = JSON.parse(JSON.stringify(grid));
    if (!solve(solved)) return alert("❌ Keine gültige Lösung existiert!");

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0 && grid[r][c] !== solved[r][c]) {
          return alert("❌ Fehlerhafte Eingabe im Sudoku!");
        }
      }
    }
    alert("✅ Alles richtig bis jetzt!");
  }

  function solveSudoku() {
    if (!originalPuzzle) {
      alert("❗ Bitte zuerst ein Sudoku generieren.");
      return;
    }
    const snap = snapshotHighlights();
    const grid = JSON.parse(JSON.stringify(originalPuzzle));
    if (solve(grid)) {
      setGrid(grid, false);
      restoreHighlights(snap);
      alert("✅ Sudoku vollständig gelöst!");
    } else {
      alert("❌ Keine Lösung gefunden – sollte eigentlich nie passieren.");
    }
  }

  // =============================
  // 5️ EVENTS
  // =============================
  document
    .getElementById("newSudoku")
    ?.addEventListener("click", fillRandomSudoku);
  document
    .getElementById("checkSudoku")
    ?.addEventListener("click", checkSudoku);
  document
    .getElementById("solveSudoku")
    ?.addEventListener("click", solveSudoku);

  createBoard();
  fillRandomSudoku();

  // =============================
  // 6 MOBILE ZAHLENTASTATUR
  // =============================
  const keypad = document.getElementById("sudokuKeypad");
  let selectedCell = null;

  if (keypad) {
    board.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT") {
        selectedCell = e.target;
        board
          .querySelectorAll("input")
          .forEach((c) => c.classList.remove("active"));
        selectedCell.classList.add("active");
      }
    });

    keypad.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || !selectedCell) return;
      if (selectedCell.classList.contains("given")) return;

      const num = btn.dataset.num;
      if (num === undefined) return;
      selectedCell.value = num;
    });
  }

  // =============================
  // 7 Pfeiltasten Navigation
  // =============================
  const cells = () => Array.from(board.querySelectorAll("input"));

  function focusCell(row, col) {
    if (row < 0 || row > 8 || col < 0 || col > 8) return;
    const idx = row * 9 + col;
    const all = Array.from(board.querySelectorAll("input"));
    const target = all[idx];
    if (target) {
      target.focus({ preventScroll: true });
      try {
        const pos = target.value ? target.value.length : 0;
        target.setSelectionRange(pos, pos);
      } catch {}
      all.forEach((c) => c.classList.remove("active"));
      target.classList.add("active");
      selectedCell = target;
    }
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
      const isDigit = /^[1-9]$/.test(key);
      const isEditKey = ["Backspace", "Delete"].includes(key);
      if (isDigit || isEditKey) {
        e.preventDefault();
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

  // Klicks/Fokus synchron halten
  board.addEventListener("focusin", (e) => {
    if (e.target.tagName === "INPUT") {
      selectedCell = e.target;
      cells().forEach((c) => c.classList.remove("active"));
      e.target.classList.add("active");
    }
  });
})();
