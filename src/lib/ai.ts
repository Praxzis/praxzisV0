const key = process.env.EXPO_PUBLIC_AI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const model = process.env.EXPO_PUBLIC_AI_MODEL || process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
const base = (process.env.EXPO_PUBLIC_AI_BASE_URL || process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

export const aiKey = key;
export const aiModel = model;
export const hasAi = Boolean(key);

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
type ChatMessage = { role: 'system' | 'user'; content: string | ContentPart[] };

async function complete(messages: ChatMessage[], json: boolean, opts?: { temperature?: number; timeoutMs?: number }): Promise<string | null> {
  if (!key) return null;
  const body: Record<string, unknown> = {
    model,
    temperature: opts?.temperature ?? 0.45,
    messages,
  };
  if (json) body.response_format = { type: 'json_object' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 16000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      if (json && res.status === 400) return complete(messages, false);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function completeJson<T>(system: string, user: string, opts?: { timeoutMs?: number; temperature?: number }): Promise<T | null> {
  const text = await complete(
    [
      { role: 'system', content: `${system}\nReply with a single JSON object and nothing else.` },
      { role: 'user', content: user },
    ],
    true,
    opts,
  );
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function cleanPassage(raw: string) {
  let text = raw.trim();
  if (text.startsWith('```')) text = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  return text.replace(/^["“«]|["”»]$/g, '').trim();
}

/** Transcribe a cropped photograph of a printed line. */
export async function extractPassageFromImage(base64: string, mime = 'image/jpeg'): Promise<string | null> {
  const text = await complete(
    [
      {
        role: 'system',
        content:
          'You transcribe printed book text from a photograph. Return only the printed sentence or phrase in the crop. Keep spelling and punctuation. Do not add quotation marks, commentary, or words that are not on the page. If the crop is unreadable, return an empty string.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe the printed line in this crop.' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      },
    ],
    false,
    { temperature: 0.1, timeoutMs: 24000 },
  );
  if (!text) return null;
  return cleanPassage(text) || null;
}
