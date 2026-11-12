import sanitizeHtml from "sanitize-html";

// Rich text typed in the admin (product descriptions, pages). Keeps formatting, drops
// scripts, styles and anything that could run code on the shop.
export function cleanHtml(input: string): string {
  return sanitizeHtml(input ?? "", {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td", "hr"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      b: "strong",
      i: "em",
      a: (tagName, attribs) => {
        const external = /^https?:/.test(attribs.href ?? "");
        return { tagName, attribs: external ? { ...attribs, target: "_blank", rel: "noopener nofollow" } : attribs };
      },
    },
  })
    .replace(/<p>(\s|&nbsp;|<br \/>)*<\/p>/g, "")
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2")
    .replace(/\s*[\u2013\u2014]\s*/g, " - ")
    .trim();
}

/** The shop never shows em or en dashes: ranges become "1-3", dashes between words become " - ". */
export function noDashes(input: string): string {
  return (input ?? "")
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2")
    .replace(/\s*[\u2013\u2014]\s*/g, " - ")
    .replace(/&(mdash|ndash|#8211|#8212);/g, "-");
}

export function plainText(html: string, max = 160): string {
  const text = (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
