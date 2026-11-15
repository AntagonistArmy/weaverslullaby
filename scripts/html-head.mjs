/** Incremental, source-offset scanner for head tags; leaves original bytes intact. */
export function createHeadScanner(onTag) {
  let text = "";
  let offset = 0;
  let start = 0;
  let mode = "data";
  let quote = "";
  let raw = "";
  let stopped = false;
  return {
    push(part) {
      if (stopped) return;
      text += part;
      while (offset < text.length) {
        if (mode === "comment") {
          const end = text.indexOf("-->", offset);
          if (end < 0) {
            offset = Math.max(offset, text.length - 2);
            return;
          }
          offset = end + 3;
          mode = "data";
          continue;
        }
        if (mode === "raw") {
          const at = text.indexOf("<", offset);
          if (at < 0) {
            offset = text.length;
            return;
          }
          const marker = `</${raw}`;
          const tail = text.slice(at, at + marker.length).toLowerCase();
          if (marker.startsWith(tail) && text.length <= at + marker.length) {
            offset = at;
            return;
          }
          if (tail === marker && /[\s/>]/.test(text[at + marker.length] ?? "")) {
            start = at;
            offset = at + marker.length;
            mode = "tag";
            quote = "";
            continue;
          }
          offset = at + 1;
          continue;
        }
        if (mode === "data") {
          const at = text.indexOf("<", offset);
          if (at < 0) {
            offset = text.length;
            return;
          }
          start = at;
          offset = at + 1;
          mode = "tag";
          quote = "";
        }
        while (offset < text.length && mode === "tag") {
          const char = text[offset++];
          if (offset === start + 4 && text.slice(start, offset) === "<!--") {
            mode = "comment";
            break;
          }
          if (quote) {
            if (char === quote) quote = "";
          } else if (char === '"' || char === "'") {
            quote = char;
          } else if (char === ">") {
            const source = text.slice(start, offset);
            const match = /^<(\/?)([a-z][a-z0-9:-]*)(?=[\s/>])/i.exec(source);
            mode = "data";
            if (!match) break;
            const name = match[2].toLowerCase();
            const closing = Boolean(match[1]);
            const token = { start, end: offset, name, closing, source };
            if (onTag(token) === false) {
              stopped = true;
              text = "";
              return;
            }
            if (closing && name === raw) raw = "";
            if (
              !closing &&
              ["script", "style", "title", "textarea", "xmp", "iframe", "noscript"].includes(name)
            )
              raw = name;
            if (raw) mode = "raw";
            break;
          }
        }
      }
    },
  };
}

export function headTags(html) {
  const tags = [];
  createHeadScanner((tag) => {
    tags.push(tag);
    if ((tag.closing && tag.name === "head") || (!tag.closing && tag.name === "body")) return false;
  }).push(html);
  return tags;
}

export function tagAttributes(source) {
  const result = new Map();
  const body = source.replace(/^<\/?[a-z][a-z0-9:-]*/i, "").replace(/>$/, "");
  const attributes = /([^\s/="'<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(attributes)) {
    const key = match[1].toLowerCase();
    // HTML retains the first occurrence of a duplicate attribute.
    if (!result.has(key)) {
      const value = match[2] ?? match[3] ?? match[4] ?? "";
      result.set(
        key,
        value.replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (_, hex, decimal) => {
          const point = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
          return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "\uFFFD";
        }),
      );
    }
  }
  return result;
}

export function replaceRanges(html, ranges) {
  let result = "";
  let offset = 0;
  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    result += html.slice(offset, range.start) + (range.replacement ?? "");
    offset = range.end;
  }
  return result + html.slice(offset);
}
