// Server-side Groq client. One function, callGroq, that sends a system and a
// user prompt to Groq's OpenAI-compatible chat completions endpoint and returns
// the assistant's text.
//
// This module reads GROQ_API_KEY and must never run in the browser. It is
// imported only by the coach route (app/api/games/[id]/coach/route.ts). There
// is no client-side wrapper, on purpose: the key stays server-side and the
// browser talks to our own route, never to Groq. The guard below turns an
// accidental client import into a clear error rather than a silently keyless
// request.
//
// We call the HTTP endpoint with plain fetch rather than pulling in the Groq
// SDK. The API is OpenAI-shaped and this is a single POST, so a dependency would
// be speculative (CLAUDE.md: every dependency is a supply-chain risk).

// Groq deprecated llama-3.3-70b-versatile for free and developer tiers on
// 2026-06-17; it now works only on enterprise committed-spend contracts. This
// is Groq's own recommended replacement: generally available, 131k context, and
// cheap enough for short commentary. Switch to "openai/gpt-oss-20b" here for a
// cheaper, faster, slightly less nuanced model. Verify against
// https://console.groq.com/docs/models before changing it.
const GROQ_MODEL = "openai/gpt-oss-120b";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Low, not zero. Chess explanations should read consistently, not creatively;
// a little above zero avoids the flat, repetitive phrasing pure-greedy output
// tends toward without inviting the model to invent.
const DEFAULT_TEMPERATURE = 0.3;

// Enough for the longest thing we ask for (a 2-4 sentence summary). The prompts
// also ask for brevity; this is the hard ceiling that stops a runaway response.
const DEFAULT_MAX_TOKENS = 500;

// A single request should never hold the route open for long. The engine
// analysis that precedes it is the slow part; Groq itself answers in seconds,
// so anything past this is a stall worth abandoning.
const REQUEST_TIMEOUT_MS = 20_000;

// A base class so a caller can catch every Groq failure with one `instanceof`,
// and subclasses so it can tell apart the ones worth handling differently: a
// rate limit is worth backing off from, a bad key is worth surfacing, a 5xx or
// a timeout is worth a plain retry.
export class GroqError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroqError";
  }
}

// The key is missing or malformed. A configuration problem, not a call that can
// be retried, so it is kept distinct from the transport failures below.
export class GroqConfigError extends GroqError {
  constructor(message: string) {
    super(message);
    this.name = "GroqConfigError";
  }
}

// HTTP 429. The caller is over its rate limit and should stop, not hammer.
export class GroqRateLimitError extends GroqError {
  constructor(message: string) {
    super(message);
    this.name = "GroqRateLimitError";
  }
}

// HTTP 4xx other than 429 (a bad request or an auth failure) or 5xx (Groq's
// side). Carries the status so logs can tell a 401 from a 503.
export class GroqServerError extends GroqError {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GroqServerError";
    this.status = status;
  }
}

// The request did not complete: it timed out or the network failed. Nothing was
// returned, and nothing is known about why, so it is worth distinguishing from
// a response that came back with an error status.
export class GroqNetworkError extends GroqError {
  constructor(message: string) {
    super(message);
    this.name = "GroqNetworkError";
  }
}

type CallOptions = {
  maxTokens?: number;
  temperature?: number;
  // When set, the call's finish reason and token usage are logged under this
  // label. A reasoning model spends hidden tokens against max_tokens, so a
  // "length" finish with little visible text means the ceiling ate the answer.
  logLabel?: string;
};

// The slice of Groq's OpenAI-compatible response we read. Everything else in
// the body is ignored.
type ChatCompletion = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: {
    completion_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  options: CallOptions = {},
): Promise<string> {
  if (typeof window !== "undefined") {
    // A defensive guard, not a security boundary: Next strips non-public env
    // from client bundles, so the key would be absent here anyway. This turns
    // that into a clear error at the call site instead of a keyless 401.
    throw new GroqConfigError("callGroq must only be called on the server.");
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new GroqConfigError(
      "GROQ_API_KEY is not set. Add it to .env.local (see .env.example) and restart the dev server.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (cause) {
    // AbortError is how the timeout surfaces; everything else here is a network
    // failure. Both mean nothing came back.
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new GroqNetworkError(`Groq request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }
    throw new GroqNetworkError(
      cause instanceof Error ? cause.message : "Groq request failed to send.",
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // The body may carry Groq's own error message; it is best-effort context
    // for logs, never shown to the user.
    const detail = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new GroqRateLimitError(`Groq rate limit reached. ${detail}`.trim());
    }
    throw new GroqServerError(response.status, `Groq returned ${response.status}. ${detail}`.trim());
  }

  let body: ChatCompletion;
  try {
    body = (await response.json()) as ChatCompletion;
  } catch {
    throw new GroqServerError(response.status, "Groq returned a response that was not JSON.");
  }

  if (options.logLabel !== undefined) {
    console.info(
      `[groq] ${options.logLabel}: finish_reason=${body.choices?.[0]?.finish_reason ?? "unknown"}` +
        ` completion_tokens=${body.usage?.completion_tokens ?? "unknown"}` +
        ` reasoning_tokens=${body.usage?.completion_tokens_details?.reasoning_tokens ?? "unknown"}` +
        ` max_tokens=${options.maxTokens ?? DEFAULT_MAX_TOKENS}`,
    );
  }

  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new GroqServerError(response.status, "Groq returned an empty completion.");
  }

  return content.trim();
}
