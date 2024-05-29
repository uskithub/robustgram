import { dedent } from "ts-dedent";

/**
 * Decodes HTML, source: {@link https://github.com/shrpne/entity-decode/blob/v2.0.1/browser.js}
 *
 * @param html - HTML as a string
 * @returns Unescaped HTML
 */
const entityDecode = function (html: string): string {
  const decoder = document.createElement("div");
  // Escape HTML before decoding for HTML Entities
  html = escape(html)
    .replace(/%26/g, "&")
    .replace(/%23/g, "#")
    .replace(/%3B/g, ";");
  decoder.innerHTML = html;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return unescape(decoder.textContent!);
};

const cleanupText = (code: string): string => {
  return (
    code
      // parser problems on CRLF ignore all CR and leave LF;;
      .replace(/\r\n?/g, "\n")
      // clean up html tags so that all attributes use single quotes, parser throws error on double quotes
      .replace(
        /<(\w+)([^>]*)>/g,
        (_match, tag, attributes) =>
          "<" + tag + attributes.replace(/="([^"]*)"/g, "='$1'") + ">"
      )
  );
};

const cleanupComments = (text: string): string => {
  return text.replace(/^\s*%%(?!{)[^\n]+\n?/gm, "").trimStart();
};

export const cleanup = (html: string): string => {
  // transforms the html to pure text
  let text = entityDecode(html);
  text = dedent(text) // removes indentation, required for YAML parsing
    .trim()
    .replace(/<br\s*\/?>/gi, "<br/>");

  text = cleanupText(text);
  text = cleanupComments(text);
  return text;
};
