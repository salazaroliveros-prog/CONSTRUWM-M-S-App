export type GeminiInlineData = {
  data: string;
  mimeType: string;
};

export type GeminiPart =
  | { text: string }
  | { inlineData: GeminiInlineData };

export type GeminiGenerateRequest = {
  model: string;
  prompt?: string;
  parts?: GeminiPart[];
  config?: {
    responseMimeType?: string;
    systemInstruction?: string;
    tools?: Array<Record<string, unknown>>;
  };
};

export type GeminiGenerateResponse = {
  text: string | null;
  images?: GeminiInlineData[];
};

export function dataUrlToInlineData(dataUrl: string): GeminiInlineData {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) {
    throw new Error('Invalid data URL');
  }

  const header = dataUrl.slice(0, commaIdx);
  const data = dataUrl.slice(commaIdx + 1);

  const mimeMatch = header.match(/^data:(.*?);base64$/);
  if (!mimeMatch) {
    throw new Error('Invalid data URL header (expected base64)');
  }

  return { mimeType: mimeMatch[1], data };
}

export async function geminiGenerate(request: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Gemini request failed (${res.status})`);
  }

  return (await res.json()) as GeminiGenerateResponse;
}
