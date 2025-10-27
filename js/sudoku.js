(function () {
  const board = document.getElementById('sudoku-board');
  if (!board) return;

  // Leeres 9x9 Sudoku-Feld
  function createBoard() {
    board.innerHTML = '';
    for (let i = 0; i < 81; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.inputMode = 'numeric';
      input.addEventListener('input', (e) => {
        if (!/^[1-9]$/.test(e.target.value)) e.target.value = '';
      });
      board.appendChild(input);
    }
  }

  // Beispiel-Sudoku
  const sample = [
    0,0,3, 0,2,0, 6,0,0,
    9,0,0, 3,0,5, 0,0,1,
    0,0,1, 8,0,6, 4,0,0,

    0,0,8, 1,0,2, 9,0,0,
    7,0,0, 0,0,0, 0,0,8,
    0,0,6, 7,0,8, 2,0,0,

    0,0,2, 6,0,9, 5,0,0,
    8,0,0, 2,0,3, 0,0,9,
    0,0,5, 0,1,0, 3,0,0
  ];

  function fillSample() {
    const cells = board.querySelectorAll('input');
    cells.forEach((cell, i) => {
      if (sample[i]) {
        cell.value = sample[i];
        cell.disabled = true;
      } else {
        cell.value = '';
        cell.disabled = false;
      }
    });
  }

  document.getElementById('newSudoku')?.addEventListener('click', fillSample);
  document.getElementById('checkSudoku')?.addEventListener('click', () => {
    alert('Prüfen-Funktion kann später ergänzt werden 😄');
  });
  document.getElementById('solveSudoku')?.addEventListener('click', () => {
    alert('Lösungsfunktion folgt noch 🧩');
  });

  createBoard();
  fillSample();
})();