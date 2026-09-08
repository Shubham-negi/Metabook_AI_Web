export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST is allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is missing on the server"
    });
  }

  const playerText = String(req.body?.message || "").trim();

  if (!playerText) {
    return res.status(400).json({
      error: "message is required"
    });
  }

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions:
          "You are Cylo, a friendly voice assistant inside a Unity WebGL learning game called Microverse. " +
          "The player is learning about cells and organelles. " +
          "Reply in 1 or 2 short spoken sentences. " +
          "Be clear, warm, and useful. Do not use markdown.",
        input: playerText
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return res.status(openaiResponse.status).json({
        error: data.error?.message || "OpenAI request failed"
      });
    }

    return res.status(200).json({
      reply: data.output_text || "I heard you. Ask me about the cell or say continue."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Cylo server error"
    });
  }
}