const form = document.getElementById("contactForm");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popupMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = new FormData(form);
  popupMessage.textContent = "⏳ Wird gesendet...";

  try {
    const response = await fetch("https://formspree.io/f/mgvpvwdr", {
      method: "POST",
      body: data,
      headers: { "Accept": "application/json" }
    });

    if (response.ok) {
      popupMessage.textContent = "✅ Nachricht erfolgreich gesendet!";
      form.reset();
    } else {
      popupMessage.textContent = "⚠️ Fehler beim Senden!";
    }
  } catch (err) {
    popupMessage.textContent = "❌ Netzwerkfehler!";
  }

  popup.classList.remove("hidden");

  setTimeout(() => {
    popup.classList.add("hidden");
  }, 2000);
});

popup.addEventListener("click", () => popup.classList.add("hidden"));