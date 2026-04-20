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
      
      const userData = JSON.parse(localStorage.getItem("loggedInUser") || "null");
      const userId = userData ? userData.id : null; 



      botBubble.textContent = "Thinking...";

      try {
        //  UI
        botBubble.textContent = "Thinking...";
        console.log(userId)
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
})();