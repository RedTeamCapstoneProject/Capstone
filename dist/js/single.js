"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // assets/ts/single.ts
  var require_single = __commonJS({
    "assets/ts/single.ts"() {
      (function() {
        const style = document.createElement("style");
        style.textContent = ".article-tab-panel { display: none; } .article-tab-panel.active { display: block; }";
        document.head.appendChild(style);
        const tabs = document.querySelectorAll(".article-tab");
        const panels = document.querySelectorAll(".article-tab-panel");
        const initialTab = document.querySelector(".article-tab.active");
        let activeTabName = initialTab?.getAttribute("data-tab") ?? "general";
        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const action = tab.getAttribute("data-action");
            if (action === "report") {
              const pageUrl = window.location.href;
              const articleTitle = document.querySelector("article.post .title h2 a")?.textContent?.trim() || "Article";
              const subject = encodeURIComponent(`Report article: ${articleTitle}`);
              const body = encodeURIComponent(`Please review this article:\n${pageUrl}`);
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
              return;
            }
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
        const popupForm = document.getElementById("chatbot-popup-form");
        const popupInput = document.getElementById("chatbot-popup-input");
        const popupThread = document.getElementById("chatbot-thread");
        const popupDismissControls = document.querySelectorAll(
          "#chatbot-popup .chatbot-popup-dismiss"
        );
        popupDismissControls.forEach((control) => {
          control.addEventListener("click", () => {
            const preservedScrollY = window.scrollY;
            window.setTimeout(() => {
              window.scrollTo(0, preservedScrollY);
            }, 0);
          });
        });
        if (popupForm && popupInput && popupThread) {
          popupForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const message = popupInput.value.trim();
            if (!message)
              return;
            console.log("this is a test after submit")
            const userBubble = document.createElement("div");
            userBubble.className = "chatbot-bubble chatbot-bubble-user";
            userBubble.textContent = message;
            popupThread.appendChild(userBubble);
            const botBubble = document.createElement("div");
            botBubble.className = "chatbot-bubble chatbot-bubble-bot";
            botBubble.textContent = "Thinking..."

            popupThread.appendChild(botBubble);
            popupInput.value = "";
            popupThread.scrollTop = popupThread.scrollHeight;


          });
        
        }
      })();
    }
  });
  require_single();
})();
