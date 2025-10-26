(function () {
    const STORAGE_KEY = "theme";
    const root = document.documentElement;
    const toggle = document.getElementById("themeToggle");
  
    // Initial: gespeichertes Theme oder System-Theme
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const startIsLight = saved ? (saved === "light") : prefersLight;
  
    root.classList.toggle("theme-light", startIsLight);
    if (toggle) toggle.checked = startIsLight;
    updateMetaThemeColor();
  
    // Umschalten per Switch
    toggle?.addEventListener("change", () => {
      const isLight = toggle.checked;
      root.classList.toggle("theme-light", isLight);
      localStorage.setItem(STORAGE_KEY, isLight ? "light" : "dark");
      updateMetaThemeColor();
    });
  
    // Systemwechsel nur übernehmen, wenn keine User-Wahl gespeichert ist
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", e => {
      if (localStorage.getItem(STORAGE_KEY) !== null) return;
      root.classList.toggle("theme-light", e.matches);
      if (toggle) toggle.checked = e.matches;
      updateMetaThemeColor();
    });
  
    // Browser-UI einfärben
    function updateMetaThemeColor() {
      const color = getComputedStyle(root).getPropertyValue("--footer-bg").trim() || "#000000";
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", color);
    }
  })();