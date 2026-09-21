/* =========================================================
   chatbot-widget.js — floating chat bubble behavior.
   Included once via partials/header.html, so it runs on every
   page automatically.
   ========================================================= */

(function () {
  const conversation = []; // { role: 'user'|'assistant', content }

  const bubble = document.createElement("button");
  bubble.className = "gisc-chat-bubble";
  bubble.innerHTML = `<i class="bi bi-chat-dots-fill"></i>`;
  bubble.setAttribute("aria-label", "Open chat assistant");

  const win = document.createElement("div");
  win.className = "gisc-chat-window";
  win.innerHTML = `
    <div class="gisc-chat-header">
      <div>
        <strong>GISC Assistant</strong>
        <span>Ask about faculty, news, programs...</span>
      </div>
      <button class="gisc-chat-close" aria-label="Close chat">&times;</button>
    </div>
    <div class="gisc-chat-messages" id="giscChatMessages">
      <div class="gisc-msg bot">Hi! I can answer questions about faculty, departments, news, notices and college publications. What would you like to know?</div>
    </div>
    <div class="gisc-chat-input">
      <input type="text" id="giscChatInput" placeholder="Type your question...">
      <button id="giscChatSend"><i class="bi bi-send-fill"></i></button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  const messagesEl = win.querySelector("#giscChatMessages");
  const inputEl = win.querySelector("#giscChatInput");
  const sendBtn = win.querySelector("#giscChatSend");
  const closeBtn = win.querySelector(".gisc-chat-close");

  bubble.addEventListener("click", () => {
    win.classList.toggle("open");
    if (win.classList.contains("open")) inputEl.focus();
  });
  closeBtn.addEventListener("click", () => win.classList.remove("open"));

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `gisc-msg ${role === "user" ? "user" : "bot"}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    addMessage("user", text);
    conversation.push({ role: "user", content: text });

    const typingEl = document.createElement("div");
    typingEl.className = "gisc-msg bot typing";
    typingEl.textContent = "Typing...";
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: conversation.slice(0, -1) })
      });
      const data = await res.json();
      typingEl.remove();

      if (!res.ok) {
        addMessage("bot", data.message || "Sorry, something went wrong.");
        return;
      }
      addMessage("bot", data.reply);
      conversation.push({ role: "assistant", content: data.reply });
    } catch (err) {
      typingEl.remove();
      addMessage("bot", "Sorry, I couldn't reach the server. Please try again.");
      console.error(err);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
