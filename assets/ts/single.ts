//import {chatbot} from "../../AI/userSummaries/userSummary.mts"
import {readSummaryItemFromPayload} from "assets/ts/main";
//import path from "path";
//import { pathToFileURL } from "url";
import jQuery from "jquery";
import breakpoints from "./breakpoints";
import "./util"; 
/*
const importchatBot = async () => {
  const { chatBot } = await import('../../AI/userSummaries/userSummary.mjs')
}

importchatBot();
*/
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

/*
async function importChatBot(): Promise<
	(newsArticle:SummaryItem|null,userPrompt:string) => Promise<string>
> {
	const chatBotModulePath = pathToFileURL(
		path.resolve(__dirname, "../../AI/userSummary/userSummary.mts")
	).href;

	const dynamicImport = new Function(
		"modulePath",
		"return import(modulePath);"
	) as (modulePath: string) => Promise<{
		summaryManager: (newsArticle:SummaryItem|null,userPrompt:string) => Promise<string>;
	}>;

	const module = await dynamicImport(chatBotModulePath);

	if (typeof module.summaryManager !== "function") {
		throw new Error("summaryManager export was not found in AI/summary/genericSummary.mts");
	}

	return module.summaryManager;
}
*/
/*

async function importChatBot() {
  
  const module = await import("../../AI/userSummaries/userSummary.mjs");

  if (typeof module.chatBot !== "function") {
    throw new Error("summaryManager export was not found");
  }

  return module.chatBot;
}
*/



(function () {
  const style = document.createElement("style");
  style.textContent =
    ".article-tab-panel { display: none; } .article-tab-panel.active { display: block; } .article-tabs-nav { display: flex; align-items: center; } .article-tabs-nav .article-tab[data-action=\"report\"] { margin-left: auto; } .report-form { display: block; } .report-label { display: block; margin-bottom: 0.6em; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.75em; font-weight: 700; color: #6a6a6a; } .report-form textarea { min-height: 10.5em; resize: vertical; margin-bottom: 0.65em; } .report-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.8em; } .report-counter { color: #8a8a8a; font-size: 0.8em; letter-spacing: 0.02em; } .report-send { margin: 0; }";
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


  	 // const chatBot = await importChatBot();

      //get context data and send it to chatbot
      const idParam = new URLSearchParams(window.location.search).get("id");
      const parsedId = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
      const isValidId = Number.isFinite(parsedId) && parsedId > 0;
      const endpoint = isValidId ? `/api/summaries?id=${parsedId}` : "/api/summaries?limit=1"; 
      botBubble.textContent = "Thinking...";

  // 2. Fetch the context data
      try {
        // 1. Setup UI
        botBubble.textContent = "Thinking...";

        // 2. Fetch the context data
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
              message: message 
          }),
        });

      if (!AIresponse.ok) {
          throw new Error("Server error");
      }

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
      if (!message) return;

      const reportSendButton = reportForm.querySelector<HTMLButtonElement>("button[type=\"submit\"]");
      const originalSendLabel = reportSendButton?.textContent ?? "Send";

      const pageUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#`;
      const idParam = new URLSearchParams(window.location.search).get("id");
      const parsedId = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
      const articleTitle =
        document.querySelector<HTMLElement>("article.post .title h2 a")?.textContent?.trim() ||
        "Article";

      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        alert("Unable to send report: missing article ID.");
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
      } catch (error) {
        console.error("Report submit error:", error);
        alert("Unable to send report right now. Please try again.");
      } finally {
        if (reportSendButton) {
          reportSendButton.disabled = false;
          reportSendButton.textContent = originalSendLabel;
        }
      }
    });
  }
})();