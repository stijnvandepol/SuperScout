// Encode/decode a basket into a shareable URL param. Pure + framework-agnostic
// so both the server (/lijst page) and client (share button) can use it.
// Offer ids are `${source}:${sourceOfferId}` and never contain a comma.

export function encodeList(ids: string[]): string {
  return ids.join(",");
}

export function decodeList(param: string | undefined | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
