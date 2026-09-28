/**
 * Where in a JSON body an offer list might be: arrays of at least five
 * objects whose keys mention a price and a name. A hint, not a parser.
 */
export function offerListHints(body: unknown, path = "$", out: string[] = []): string[] {
  if (Array.isArray(body)) {
    const objects = body.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[];
    if (objects.length >= 5) {
      const keys = Object.keys(objects[0]!).join(" ").toLowerCase();
      if (/price|prijs|amount/.test(keys) && /title|name|naam|description|omschrijving/.test(keys)) {
        out.push(`${path} (${objects.length} items: ${Object.keys(objects[0]!).slice(0, 8).join(", ")})`);
      }
    }
    body.slice(0, 3).forEach((item, i) => offerListHints(item, `${path}[${i}]`, out));
  } else if (body && typeof body === "object") {
    for (const [key, value] of Object.entries(body)) offerListHints(value, `${path}.${key}`, out);
  }
  return out;
}
