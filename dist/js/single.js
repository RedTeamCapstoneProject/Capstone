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
            //const message = popupInput.value.trim();
            //if (!message)
             // return;
            console.log("this is a test after submit")
            const userBubble = document.createElement("div");
            userBubble.className = "chatbot-bubble chatbot-bubble-user";
            userBubble.textContent = "test"//message;
            popupThread.appendChild(userBubble);
            const botBubble = document.createElement("div");
            botBubble.className = "chatbot-bubble chatbot-bubble-bot";
            botBubble.textContent = "Thinking..."

            popupThread.appendChild(botBubble);
            popupInput.value = "";
            popupThread.scrollTop = popupThread.scrollHeight;

          /*
            //get context data and send it to chatbot
            const idParam = new URLSearchParams(window.location.search).get("id");
            const parsedId = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
            const isValidId = Number.isFinite(parsedId) && parsedId > 0;
            const endpoint = isValidId ? `/api/summaries?id=${parsedId}` : "/api/summaries?limit=1"; 
            try {
              fetch(endpoint)
                .then(response =>{
                  if (!response.ok)
                    throw new Error("Network response was not ok");  
                    return response.json()
              })
              .then(payload=>{
                const item = readSummaryItemFromPayload(payload);
                botBubble.textContent = "Thinking..."; 

                chatbot(item, message).then(aiResponse => {
                    botBubble.textContent = aiResponse;
                    //popupThread.scrollTop = popupThread.scrollHeight;
                }).catch(err => {
                    botBubble.textContent = "Sorry, I'm having trouble connecting right now.";
                });
              })
              .catch(err => {
                console.error("Chatbot fetch error:", err);
                botBubble.textContent = "Sorry, there was an error...";
              });
                      

            }catch{
              print("error")
            }
              */
          });
        
        }
      })();
    }
  });
  require_single();
})();
