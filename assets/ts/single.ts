import {readSummaryItemFromPayload} from "assets/ts/main";

import jQuery from "jquery";
import breakpoints from "./breakpoints";
import "./util"; 

type SummaryItem = {
  id: number | string;
  category?: string | null;
  ai_title: string | null;
  ai_description: string | null;
  url_to_image: string | null;
  summary: string | null;
  likeIm5?: string | null;
  "5ws"?: string | null;
  source_names?: string[] | null;
  authors?: string[] | null;
  urls?: string[] | null;
  created_at?: string | null;
};

type SummariesResponse = { data?: SummaryItem[] | SummaryItem };



(function () {
  type ToastType = "success" | "error" | "info";
  let nextToastId = 0;

  const showToast = (message: string, type: ToastType = "info") => {
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message, type, id: ++nextToastId },
      })
    );
  };

  const style = document.createElement("style");
  style.textContent = `
    .article-tab-panel { display: none; }
    .article-tab-panel.active { display: block; }
    .article-tabs-nav {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      gap: 0.5em;
      width: 100%;
      box-sizing: border-box;
    }
    .article-tabs-nav .article-tab {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      white-space: normal;
      line-height: 1.35;
      height: auto;
      min-height: 4.8125em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75em 1.25em;
    }
    .article-tabs-nav .article-tab[data-action="report"] { margin-left: auto; }
    @media screen and (max-width: 736px) {
      .article-tabs-nav .article-tab[data-action="report"] { margin-left: 0; }
      .article-tabs-nav .article-tab { flex: 1 1 calc(50% - 0.35em); }
    }
    @media screen and (max-width: 480px) {
      .article-tabs-nav .article-tab { flex: 1 1 100%; }
    }
    .report-form { display: block; }
    .report-label { display: block; margin-bottom: 0.6em; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.75em; font-weight: 700; color: #6a6a6a; }
    .report-form textarea { min-height: 10.5em; resize: vertical; margin-bottom: 0.65em; }
    .report-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.8em; }
    .report-counter { color: #8a8a8a; font-size: 0.8em; letter-spacing: 0.02em; }
    body.single #main article.post > header .meta { border-left: 0; display: flex; align-items: center; justify-content: center; text-align: center; }
    body.single #main article.post > header .meta .published { margin-top: 0; white-space: normal; line-height: 1.45; }
  `;
  document.head.appendChild(style);

  const tabs = document.querySelectorAll<HTMLElement>(".article-tab");
  const panels = document.querySelectorAll<HTMLElement>(".article-tab-panel");

  const initialTab = document.querySelector<HTMLElement>(".article-tab.active");
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

  const popupForm = document.getElementById("chatbot-popup-form") as HTMLFormElement | null;
  const popupInput = document.getElementById("chatbot-popup-input") as HTMLInputElement | null;
  const popupThread = document.getElementById("chatbot-thread") as HTMLElement | null;
  const reportForm = document.getElementById("report-popup-form") as HTMLFormElement | null;
  const reportInput = document.getElementById("report-popup-input") as HTMLTextAreaElement | null;
  const reportCounter = document.getElementById("report-popup-counter") as HTMLElement | null;
  const popupDismissControls = document.querySelectorAll<HTMLElement>(
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
    popupForm.addEventListener("submit", async(event) => {
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



      //get context data and send it to chatbot
      const idParam = new URLSearchParams(window.location.search).get("id");
      const parsedId = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
      const isValidId = Number.isFinite(parsedId) && parsedId > 0;
      const endpoint = isValidId ? `/api/summaries?id=${parsedId}` : "/api/summaries?limit=1"; 
      
      const userData = JSON.parse(localStorage.getItem("loggedInUser") || "null"); //get user id from local storage
      const userId = userData ? userData.id : null; 



      botBubble.textContent = "Thinking...";

      try {
        //  UI
        botBubble.textContent = "Thinking...";

        //  get the context data
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("API response was not ok");
        
        const payload = await response.json();
        const item = readSummaryItemFromPayload(payload);

        const AIresponse = await fetch("/api/chat", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
              item: item, 
              message: message,
              UserID:userId 
          }),
        });

      if(AIresponse.status === 429){ //check for rate limits
         botBubble.textContent = "You have reached the rate limit. Please log in to get a higher limit"
        return
      }


      if (!AIresponse.ok) {
          throw new Error("Server error");  //check for errors
      }
      
      //response is good
      const aiResponse = await AIresponse.text();
      botBubble.textContent = aiResponse;

    } catch (err) {
      console.error("Chatbot system error:", err);
      botBubble.textContent = "Sorry, I'm having trouble connecting right now.";
    } finally {
      popupThread.scrollTop = popupThread.scrollHeight;
    }
    });
  }

  if (reportForm && reportInput) {
    const updateReportCounter = () => {
      if (!reportCounter) return;
      reportCounter.textContent = `${reportInput.value.length}/250`;
    };

    reportInput.addEventListener("input", updateReportCounter);
    updateReportCounter();

    reportForm.addEventListener("submit", async(event) => {
      event.preventDefault();
      const message = reportInput.value.trim();
      if (!message) {
        showToast("Please enter information before sending.", "error");
        return;
      }

      const reportSendButton = reportForm.querySelector<HTMLButtonElement>("button[type=\"submit\"]");
      const originalSendLabel = reportSendButton?.textContent ?? "Send";

      const pageUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#`;
      const idParam = new URLSearchParams(window.location.search).get("id");
      const parsedId = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
      const articleTitle =
        document.querySelector<HTMLElement>("article.post .title h2 a")?.textContent?.trim() ||
        "Article";

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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            articleId: parsedId,
            articleUrl: pageUrl,
            information: message,
            articleTitle,
          }),
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