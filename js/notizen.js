const STORAGE_KEY = "notes";

/* ---- Speicherung / Laden ---- */
function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/* ---- Anzeige ---- */
function showNotes() {
  const notesList = document.getElementById("notesList");
  const doneList = document.getElementById("doneNotesList");
  if (!notesList || !doneList) return;

  const notes = loadNotes();
  notesList.innerHTML = "";
  doneList.innerHTML = "";

  if (notes.length === 0) {
    notesList.innerHTML = `<li class="note-item"><div class="note-text">Noch keine Notizen gespeichert.</div></li>`;
    doneList.innerHTML = `<li class="note-item"><div class="note-text">Keine abgeschlossenen Notizen.</div></li>`;
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.className = "note-item" + (note.done ? " done" : "");
    li.dataset.id = note.id; // ← ID im DOM speichern

    const textDiv = document.createElement("div");
    textDiv.className = "note-text";
    textDiv.textContent = note.text;

    const dateDiv = document.createElement("div");
    dateDiv.className = "note-date";
    // Datum formatieren
    const createdDate = new Date(note.createdAt);
    dateDiv.textContent = createdDate.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    li.appendChild(dateDiv);

    const actions = document.createElement("div");
    actions.className = "note-actions";

    // ✓ Button (Fertig/Undo)
    const okBtn = document.createElement("button");
    okBtn.className = "btn-round btn-round--ok";
    okBtn.textContent = "✓";
    okBtn.title = note.done ? "Als offen markieren" : "Als erledigt markieren";
    okBtn.onclick = () => toggleDone(note.id);

    // 🗑 Button (Löschen)
    const delBtn = document.createElement("button");
    delBtn.className = "btn-round btn-round--del";
    delBtn.textContent = "🗑";
    delBtn.title = "Notiz löschen";
    delBtn.onclick = () => deleteNote(note.id);

    actions.appendChild(okBtn);
    actions.appendChild(delBtn);
    li.appendChild(textDiv);
    li.appendChild(dateDiv);
    li.appendChild(actions);

    (note.done ? doneList : notesList).appendChild(li);
  });

  if (notesList.children.length === 0) {
    notesList.innerHTML = `<li class="note-item"><div class="note-text">Keine offenen Notizen.</div></li>`;
  }
  if (doneList.children.length === 0) {
    doneList.innerHTML = `<li class="note-item"><div class="note-text">Keine abgeschlossenen Notizen.</div></li>`;
  }
}

/* ---- Neue Notiz speichern ---- */
function saveNote() {
  const input = document.getElementById("noteInput");
  if (!input) return;

  const noteText = input.value.trim();
  if (!noteText) return;

  const notes = loadNotes();

  // Jede Notiz hat eine eindeutige ID
  const newNote = {
    id: Date.now(),
    text: noteText,
    done: false,
    createdAt: new Date().toISOString(),
  };

  notes.unshift(newNote);
  saveNotes(notes);

  input.value = "";
  autoResizeTextarea(input);
  showNotes();
}

/* ---- Aktionen ---- */
function toggleDone(id) {
  const notes = loadNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  note.done = !note.done;
  saveNotes(notes);
  showNotes();
}

function deleteNote(id) {
  const notes = loadNotes().filter((n) => n.id !== id);
  saveNotes(notes);
  showNotes();
}

/* ---- Eingabe anpassen ---- */
function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

/* ---- Initialisierung ---- */
document.addEventListener("DOMContentLoaded", () => {
  showNotes();

  const input = document.getElementById("noteInput");
  if (input) {
    autoResizeTextarea(input);
    input.addEventListener("input", () => autoResizeTextarea(input));

    input.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        saveNote();
      }
    });
  }
});