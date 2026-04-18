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
        let nextToastId = 0;
        const showToast = (message, type = "info") => {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: { message, type, id: ++nextToastId }
            })
          );
        };
        const style = document.createElement("style");
        style.textContent = ".article-tab-panel { display: none; } .article-tab-panel.active { display: block; } .article-tabs-nav { display: flex; align-items: center; } .article-tabs-nav .article-tab[data-action=\"report\"] { margin-left: auto; } .report-form { display: block; } .report-label { display: block; margin-bottom: 0.6em; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.75em; font-weight: 700; color: #6a6a6a; } .report-form textarea { min-height: 10.5em; resize: vertical; margin-bottom: 0.65em; } .report-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.8em; } .report-counter { color: #8a8a8a; font-size: 0.8em; letter-spacing: 0.02em; } .report-send { margin: 0; } body.single #main article.post > header .meta { border-left: 0; display: flex; align-items: center; justify-content: center; text-align: center; } body.single #main article.post > header .meta .published { margin-top: 0; white-space: normal; line-height: 1.45; }";
        document.head.appendChild(style);
        const tabs = document.querySelectorAll(".article-tab");
        const panels = document.querySelectorAll(".article-tab-panel");
        const initialTab = document.querySelector(".article-tab.active");
        let activeTabName = initialTab?.getAttribute("data-tab") ?? "general";
        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const action = tab.getAttribute("data-action");
            if (action === "report") {
              window.location.hash = "report-popup";
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
        const reportForm = document.getElementById("report-popup-form");
        const reportInput = document.getElementById("report-popup-input");
        const reportCounter = document.getElementById("report-popup-counter");
        const popupDismissControls = document.querySelectorAll(
          "#chatbot-popup .chatbot-popup-dismiss, #report-popup .report-popup-dismiss"
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
        if (reportForm && reportInput) {
          const updateReportCounter = () => {
            if (!reportCounter)
              return;
            reportCounter.textContent = `${reportInput.value.length}/250`;
          };
          reportInput.addEventListener("input", updateReportCounter);
          updateReportCounter();
          reportForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const message = reportInput.value.trim();
            if (!message) {
              showToast("Please enter information before sending.", "error");
              return;
            }
            const reportSendButton = reportForm.querySelector("button[type=\"submit\"]");
            const originalSendLabel = reportSendButton?.textContent ?? "Send";
            const pageUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#`;
            const idParam = new URLSearchParams(window.location.search).get("id");
            const parsedId = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
            const articleTitle = document.querySelector("article.post .title h2 a")?.textContent?.trim() || "Article";
            if (!Number.isFinite(parsedId) || parsedId <= 0) {
              showToast("Unable to send report: missing article ID.", "error");
              return;
            }
            try {
              if (reportSendButton) {
                reportSendButton.disabled = true;
                reportSendButton.textContent = "Sending...";
              }
              const response = await fetch("/api/report", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  articleId: parsedId,
                  articleUrl: pageUrl,
                  information: message,
                  articleTitle
                })
              });
              if (!response.ok) {
                throw new Error("Failed to send report email");
              }
              reportInput.value = "";
              updateReportCounter();
              window.location.hash = "";
              showToast("Report sent successfully.", "success");
            } catch (error) {
              console.error("Report submit error:", error);
              showToast("Unable to send report right now. Please try again.", "error");
            } finally {
              if (reportSendButton) {
                reportSendButton.disabled = false;
                reportSendButton.textContent = originalSendLabel;
              }
            }
          });
        }
      })();
    }
  });
  require_single();
})();
