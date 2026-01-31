import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '..', 'dist');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Don't crash local boot if user only wants static, but API will be unavailable.
  console.warn('GEMINI_API_KEY is not set. /api/gemini/* will return 503.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '15mb' }));

// Very small in-memory rate limiter (best-effort).
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 60;
const rate = new Map();

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rate.get(ip);
  if (!entry || entry.resetAt <= now) {
    rate.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }

  if (entry.count >= RATE_MAX) {
    res.status(429).send('Rate limit exceeded. Try again later.');
    return;
  }

  entry.count += 1;
  next();
}

const ALLOWED_MODELS = new Set([
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash-image',
]);

function sanitizeConfig(config) {
  if (!config || typeof config !== 'object') return undefined;

  const out = {};

  if (typeof config.responseMimeType === 'string') {
    out.responseMimeType = config.responseMimeType;
  }
  if (typeof config.systemInstruction === 'string') {
    out.systemInstruction = config.systemInstruction;
  }

  // Only allow googleSearch tool.
  if (Array.isArray(config.tools)) {
    const tools = config.tools
      .filter((t) => t && typeof t === 'object' && Object.prototype.hasOwnProperty.call(t, 'googleSearch'))
      .map(() => ({ googleSearch: {} }));
    if (tools.length) out.tools = tools;
  }

  return Object.keys(out).length ? out : undefined;
}

app.post('/api/gemini/generate', rateLimit, async (req, res) => {
  if (!ai) {
    res.status(503).send('Gemini is not configured on this server.');
    return;
  }

  const { model, prompt, parts, config } = req.body || {};

  if (!ALLOWED_MODELS.has(model)) {
    res.status(400).send('Model not allowed.');
    return;
  }

  if (typeof prompt !== 'string' && !Array.isArray(parts)) {
    res.status(400).send('Request must include prompt (string) or parts (array).');
    return;
  }

  try {
    const contents = Array.isArray(parts) ? { parts } : prompt;

    const response = await ai.models.generateContent({
      model,
      contents,
      config: sanitizeConfig(config),
    });

    const images = [];
    const firstCandidate = response.candidates?.[0];
    const responseParts = firstCandidate?.content?.parts;
    if (Array.isArray(responseParts)) {
      for (const p of responseParts) {
        if (p?.inlineData?.data && p?.inlineData?.mimeType) {
          images.push({ data: p.inlineData.data, mimeType: p.inlineData.mimeType });
        }
      }
    }

    res.json({
      text: response.text ?? null,
      images: images.length ? images : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gemini request failed.');
  }
});

// Serve static build if present.
app.use(express.static(distDir, { extensions: ['html'] }));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = parseInt(process.env.PORT || '8080', 10);
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
