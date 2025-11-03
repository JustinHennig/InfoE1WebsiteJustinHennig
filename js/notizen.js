const STORAGE_KEY = "notes";
const SORT_KEY = "note_sort";

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

  const notes = sortNotes(loadNotes());
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

  enableDragAndDrop();
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

/* ---- Sortierung ---- */
function getSortOrder() {
  return localStorage.getItem(SORT_KEY) || "date_newest";
}

function changeSort(order) {
  localStorage.setItem(SORT_KEY, order);
  showNotes();
}

function sortNotes(notes) {
  const order = getSortOrder();
  const sorted = [...notes];

  switch (order) {
    case "custom":
      return sorted;

    case "date_oldest":
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "alpha_asc":
      sorted.sort((a, b) => a.text.localeCompare(b.text, "de", { sensitivity: "base" }));
      break;
    case "alpha_desc":
      sorted.sort((a, b) => b.text.localeCompare(a.text, "de", { sensitivity: "base" }));
      break;
    default:
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return sorted;
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

/* ---- Drag & Drop ---- */
function enableDragAndDrop() {
  const notesList = document.getElementById("notesList");
  if (!notesList) return;

  notesList.querySelectorAll(".note-item").forEach((item) => {
    item.draggable = true;

    item.addEventListener("dragstart", () => {
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      const currentOrder = getSortOrder();
      if (currentOrder !== "custom") {
        localStorage.setItem(SORT_KEY, "custom");
        const sortSelect = document.getElementById("sortSelect");
        if (sortSelect) sortSelect.value = "custom";
      }
      saveCurrentOrder();
    });
  });

  notesList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingItem = notesList.querySelector(".dragging");
    const afterElement = getDragAfterElement(notesList, e.clientY);
    if (afterElement == null) {
      notesList.appendChild(draggingItem);
    } else {
      notesList.insertBefore(draggingItem, afterElement);
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".note-item:not(.dragging)")];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function saveCurrentOrder() {
  const notesList = document.getElementById("notesList");
  if (!notesList) return;

  const ids = [...notesList.children].map((li) => Number(li.dataset.id));
  const notes = loadNotes();

  const sorted = ids
    .map((id) => notes.find((n) => n.id === id))
    .filter(Boolean)
    .concat(notes.filter((n) => n.done));

  saveNotes(sorted);
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

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.value = getSortOrder();
  }
});
