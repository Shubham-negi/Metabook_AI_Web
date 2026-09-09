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
          "Answer naturally like a conversational science guide, not like a menu or keyword bot. " +
          "If the player asks what a cell is, explain it directly. If they ask about components, mention useful organelles such as the membrane, cytoplasm, nucleus, mitochondria, ribosomes, endoplasmic reticulum, Golgi apparatus, lysosomes, and vacuoles. " +
          "Reply in 2 to 4 short spoken sentences. Do not keep saying only 'ask me about the cell' or 'say continue' when the player asked a real question. " +
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
      reply: data.output_text || "A cell is the basic unit of life. It has parts like the membrane, cytoplasm, nucleus, mitochondria, and ribosomes, and each part helps the cell stay alive."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Cylo server error"
    });
  }
}
