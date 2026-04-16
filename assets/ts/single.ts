(function () {
  const style = document.createElement("style");
  style.textContent =
    ".article-tab-panel { display: none; } .article-tab-panel.active { display: block; }";
  document.head.appendChild(style);

  const tabs = document.querySelectorAll<HTMLElement>(".article-tab");
  const panels = document.querySelectorAll<HTMLElement>(".article-tab-panel");

  const initialTab = document.querySelector<HTMLElement>(".article-tab.active");
  let activeTabName = initialTab?.getAttribute("data-tab") ?? "general";

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");
      if (tabName === "chatbot") {
        window.location.hash = "chatbot-popup";
        return;
      }

      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      activeTabName = tabName ?? "general";
      const target = document.getElementById(`tab-${activeTabName}`);
      if (target) {
        target.classList.add("active");
      }
    });
  });

  const popupForm = document.getElementById("chatbot-popup-form") as HTMLFormElement | null;
  const popupInput = document.getElementById("chatbot-popup-input") as HTMLInputElement | null;
  const popupThread = document.getElementById("chatbot-thread") as HTMLElement | null;
  const popupDismissControls = document.querySelectorAll<HTMLElement>(
    "#chatbot-popup .chatbot-popup-dismiss"
  );

  popupDismissControls.forEach((control) => {
    control.addEventListener("click", (event) => {
      if (typeof history.replaceState !== "function") {
        return;
      }

      event.preventDefault();
      const preservedScrollY = window.scrollY;

      history.replaceState(
        history.state,
        "",
        `${window.location.pathname}${window.location.search}`
      );

      window.requestAnimationFrame(() => {
        window.scrollTo(0, preservedScrollY);
      });
    });
  });

  if (popupForm && popupInput && popupThread) {
    popupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = popupInput.value.trim();
      if (!message) return;

      const userBubble = document.createElement("div");
      userBubble.className = "chatbot-bubble chatbot-bubble-user";
      userBubble.textContent = message;
      popupThread.appendChild(userBubble);

      const botBubble = document.createElement("div");
      botBubble.className = "chatbot-bubble chatbot-bubble-bot";
      popupThread.appendChild(botBubble);

      popupInput.value = "";
      popupThread.scrollTop = popupThread.scrollHeight;
    });
  }
})();