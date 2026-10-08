// Server entry point for the episode content contract. Client components
// import ./text (and ./types) directly so the HTML parser stays server-side.
import { parseEpisodeHtml } from "./parse";
import { serializeEpisodeDocument } from "./serialize";
import { countWords, documentToPlainText, estimateReadTime } from "./text";

export type { BlockNode, ContentMark, EpisodeDocument, InlineNode, ParagraphNode } from "./types";
export { parseEpisodeHtml } from "./parse";
export { serializeEpisodeDocument } from "./serialize";
export { countWords, documentToPlainText, estimateReadTime, excerptText } from "./text";

/** Stored HTML -> canonical, contract-only HTML (what the editor is given). */
export function normalizeEpisodeHtml(html: string | null | undefined) {
  return serializeEpisodeDocument(parseEpisodeHtml(html));
}

export function analyzeEpisodeHtml(html: string | null | undefined) {
  const document = parseEpisodeHtml(html);
  const text = documentToPlainText(document);
  const wordCount = countWords(text);
  return { document, text, wordCount, readTime: estimateReadTime(wordCount) };
}
