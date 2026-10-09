// Speaks one of Mico's replies with a male OpenAI voice, for devices that
// cannot run Mico's in-browser voice (phones) and as its backup elsewhere.
// Request:  POST { "text": "..." }
// Response: raw 16-bit signed little-endian mono PCM; the sample rate is in
//           the X-Sample-Rate header (OpenAI's "pcm" format is 24 kHz).
// Optional Vercel environment variables: OPENAI_TTS_MODEL, OPENAI_TTS_VOICE.

// About a minute of speech: 24 kHz 16-bit PCM stays under Vercel's 4.5 MB
// response limit. Mico's replies are 2-4 short sentences.
const MAX_TEXT_LENGTH = 900;
const SAMPLE_RATE = 24000;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "X-Sample-Rate");

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

  const text = String(req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({ error: "text is too long" });
  }

  try {
    const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
    const body = {
      model,
      voice: process.env.OPENAI_TTS_VOICE || "ash",
      input: text,
      response_format: "pcm"
    };

    // Only the gpt-4o speech models take speaking instructions.
    if (model.startsWith("gpt-4o")) {
      body.instructions =
        "You are Mico, a warm and friendly male science guide for students exploring a living cell. " +
        "Speak clearly at a natural, relaxed pace.";
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!openaiResponse.ok) {
      const data = await openaiResponse.json().catch(() => ({}));
      return res.status(openaiResponse.status).json({
        error: data.error?.message || "OpenAI speech request failed"
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Sample-Rate", String(SAMPLE_RATE));
    res.setHeader("Cache-Control", "no-store");

    // Forward the audio while OpenAI is still producing it, so the phone's
    // download overlaps the synthesis instead of following it.
    const reader = openaiResponse.body.getReader();

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      res.write(Buffer.from(value));
    }

    return res.end();
  } catch (error) {
    if (res.headersSent) {
      return res.end();
    }

    return res.status(500).json({
      error: "Mico voice server error"
    });
  }
}
