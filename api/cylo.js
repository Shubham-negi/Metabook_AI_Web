function buildInput(playerText, history) {
  const messages = Array.isArray(history)
    ? history
        .filter(item => item && (item.role === "user" || item.role === "assistant"))
        .map(item => ({
          role: item.role,
          content: String(item.content || "").trim()
        }))
        .filter(item => item.content.length > 0)
        .slice(-12)
    : [];

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    messages.push({
      role: "user",
      content: playerText
    });
  }

  return messages;
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const textParts = Array.isArray(data?.output)
    ? data.output.flatMap(item =>
        Array.isArray(item?.content)
          ? item.content
              .filter(part => part?.type === "output_text" && typeof part.text === "string")
              .map(part => part.text.trim())
              .filter(Boolean)
          : []
      )
    : [];

  return textParts.join("\n").trim();
}

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
    const input = buildInput(playerText, req.body?.history);

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
          "Answer the player's newest message directly. Never restart the cell introduction unless the player asks you to. " +
          "Remember the recent conversation. If the player asks a follow-up like 'why', 'what about that', or 'tell me more', use the previous messages to continue naturally. " +
          "If the player says hi, hello, or another greeting, greet them briefly and ask what they want to explore inside the cell. " +
          "If the player asks a broad or casual question, answer it directly first, then gently connect it to the Microverse cell journey. " +
          "If the player asks what a cell is, explain it directly. If they ask about components, mention useful organelles such as the membrane, cytoplasm, nucleus, mitochondria, ribosomes, endoplasmic reticulum, Golgi apparatus, lysosomes, and vacuoles. " +
          "Reply in 2 to 4 short spoken sentences. Do not keep saying only 'ask me about the cell' or 'say continue' when the player asked a real question. " +
          "Be clear, warm, and useful. Do not use markdown.",
        input
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return res.status(openaiResponse.status).json({
        error: data.error?.message || "OpenAI request failed"
      });
    }

    const reply = extractResponseText(data);

    if (!reply) {
      return res.status(502).json({
        error: "OpenAI returned a response without spoken text"
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "Cylo server error"
    });
  }
}
