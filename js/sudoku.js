(function () {
  const board = document.getElementById("sudoku-board");
  if (!board) return;

  // =============================
  // 1️⃣ BOARD ERSTELLEN
  // =============================
  function createBoard() {
    board.innerHTML = "";
    for (let i = 0; i < 81; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.inputMode = "numeric";
      input.addEventListener("input", (e) => {
        if (!/^[1-9]$/.test(e.target.value)) e.target.value = "";
      });
      board.appendChild(input);
    }
  }

  let originalPuzzle = null;

  // =============================
  // 2️⃣ GRUNDLEGENDES SUDOKU-LOGIK
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
        cell.value = grid[r][c] || "";
        cell.disabled = lock && grid[r][c] !== 0;
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
  // 3️⃣ ZUFÄLLIGES SUDOKU GENERIEREN
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
      if (count > 1) return; // Stop, wenn mehr als eine Lösung
    }

    backtrack();
    return count === 1;
  }

  function generateSudoku(difficulty = "medium") {
    const full = generateFullGrid();
    const holes = difficulty === "easy" ? 35 : difficulty === "hard" ? 55 : 45;
    return removeNumbers(full, holes);
  }

  // =============================
  // 4️⃣ FUNKTIONEN FÜR BUTTONS
  // =============================
  function fillRandomSudoku() {
    const difficulty = document.getElementById("difficulty")?.value || "medium";
    const sudoku = generateSudoku(difficulty);
    originalPuzzle = JSON.parse(JSON.stringify(sudoku)); // 🔹 hier speichern
    setGrid(sudoku, true);
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

    // Arbeitskopie des ursprünglichen Sudokus
    const grid = JSON.parse(JSON.stringify(originalPuzzle));

    // Sudoku lösen – garantiert möglich
    if (solve(grid)) {
      setGrid(grid, false); // zeige die Lösung
      alert("✅ Sudoku vollständig gelöst!");
    } else {
      alert("❌ Keine Lösung gefunden – sollte eigentlich nie passieren.");
    }
  }

  // =============================
  // 5️⃣ EVENTS
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

  // Start
  createBoard();
  fillRandomSudoku();

  // =============================
  // 6️⃣ MOBILE ZAHLENTASTATUR
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
      if (!selectedCell) return;
      const num = e.target.dataset.num;
      if (num === undefined) return;

      selectedCell.value = num;
    });
  }
})();
