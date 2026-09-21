// ------------------------------------------------------------
// Handles POST /api/chat — the chatbot's brain.
// Retrieves the most relevant chunks from knowledge_chunks via
// embedding similarity, then asks OpenAI to answer using only
// that context.
// ------------------------------------------------------------

const express = require("express");
const pool = require("../../server/db");
const { getEmbedding, cosineSimilarity } = require("./embeddings");

const router = express.Router();

const CHAT_MODEL = "gpt-3.5-turbo-16k";
const TOP_K = 5;

const SYSTEM_PROMPT = `You are the virtual assistant for Government Islamia Science College Sukkur (GISC).
Answer the student's or visitor's question using ONLY the context provided below.
If the answer isn't in the context, say you don't have that information and suggest
they contact the relevant department or check the Publications page.
Keep answers concise and friendly. Do not make up facts, names, or dates.`;

router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "A message is required." });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "Chatbot is not configured on the server yet." });
    }

    // 1. Embed the user's question
    const questionEmbedding = await getEmbedding(message);

    // 2. Load all chunks and rank by similarity
    const [rows] = await pool.query("SELECT source_type, title, content, embedding FROM knowledge_chunks");
    const ranked = rows
      .map(row => ({
        ...row,
        embedding: JSON.parse(row.embedding),
      }))
      .map(row => ({
        ...row,
        score: cosineSimilarity(questionEmbedding, row.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    const contextText = ranked
      .map(r => `[${r.source_type}] ${r.title}\n${r.content}`)
      .join("\n\n---\n\n");

    // 3. Build the conversation for OpenAI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + "\n\nCONTEXT:\n" + contextText },
      ...(Array.isArray(history) ? history.slice(-6) : []), // keep last few turns only
      { role: "user", content: message }
    ];

    const completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 400
      })
    });

    if (!completionRes.ok) {
      const errText = await completionRes.text();
      console.error("OpenAI chat error:", errText);
      return res.status(500).json({ message: "The chatbot is having trouble responding right now." });
    }

    const completionData = await completionRes.json();
    const reply = completionData.choices[0].message.content;

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong with the chatbot." });
  }
});

module.exports = router;
