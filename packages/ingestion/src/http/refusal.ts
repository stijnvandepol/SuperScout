/**
 * Recognising "no" from a retailer, and taking it as an answer.
 */

/** An error that means "the retailer does not want this", not "something broke". */
export function isBlockError(message: string | undefined): boolean {
  return !!message && /\b(401|403|429)\b|captcha|access denied|too many requests|forbidden|blocked/i.test(message);
}

/**
 * Wrap a fetch so that one refusal ends the conversation.
 *
 * The catalogue crawls make hundreds of requests per run, page by page and
 * with retries. Without this, a 403 on the first page would be followed by
 * every remaining page — each one refused, each one a little more like an
 * attempt to get through. After the first 401/403/429 nothing more is sent;
 * the error names the status, so the run is recorded as a refusal.
 */
export function stopOnRefusal<A extends unknown[]>(
  inner: (url: string, ...rest: A) => Promise<Response>,
  state: { refused: number | null },
): (url: string, ...rest: A) => Promise<Response> {
  return async (url, ...rest) => {
    if (state.refused !== null) {
      throw new Error(`eerder in deze run geweigerd (${state.refused}); geen nieuwe verzoeken`);
    }
    const res = await inner(url, ...rest);
    if (res.status === 401 || res.status === 403 || res.status === 429) state.refused = res.status;
    return res;
  };
}
