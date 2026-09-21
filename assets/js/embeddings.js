// ------------------------------------------------------------
// Shared helper: get an embedding vector from OpenAI, and compare
// vectors with cosine similarity. Used by both the knowledge-base
// build script and the live /api/chat route.
// ------------------------------------------------------------

const EMBEDDING_MODEL = "text-embedding-3-small";

async function getEmbedding(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI embeddings request failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.data[0].embedding; // array of floats
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { getEmbedding, cosineSimilarity, EMBEDDING_MODEL };
