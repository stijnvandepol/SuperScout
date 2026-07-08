/**
 * Renders a JSON-LD script. `<` is escaped so a stray "</script>" in source
 * data can never break out of the tag. Data is built server-side from our own
 * content, never from user input.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
