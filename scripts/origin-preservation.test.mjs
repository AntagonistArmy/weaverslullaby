import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { headTags, tagAttributes } from "./html-head.mjs";
import { createHeadInjector, injectGrokPwaHead } from "./grok-pwa-shared.mjs";
import { grokPwaPlugin } from "./grok-pwa-plugin.mjs";
import { ORIGIN_ID, ORIGIN_NAME } from "../src/lib/origin.mjs";

const cwd = mkdtempSync(join(tmpdir(), "origin-preservation-"));
const ctx = { cwd, site: { title: ORIGIN_NAME, author: ORIGIN_NAME, origin_id: ORIGIN_ID } };
const body =
  '<body><script>window.saved = \'<meta name="author" content="historical author">\';</script>Ω ⟁ retained</body></html>';
const embedded =
  '<script>window.marker="</head>";window.saved=\'<meta name="author" content="historical author">\';</script><!-- <meta name="author" content="comment"> </head> -->';

function identity(html) {
  return headTags(html)
    .filter((tag) => tag.name === "meta")
    .map((tag) => tagAttributes(tag.source))
    .filter((attrs) =>
      ["author", "aeonimus-origin-id"].includes((attrs.get("name") ?? "").toLowerCase()),
    );
}

for (const stale of [
  '<meta name=author content="Stale author"><meta name=aeonimus-origin-id content="Stale ID">',
  '<meta content="Stale > author" name="author"><meta content=old name=aeonimus-origin-id>',
  "<META NaMe='AUTHOR' content='Stale'><meta name='aeonimus-origin-id' content='old'>",
  '<meta name="auth&#111;r" content="Stale"><meta name="aeonimus-origin&#45;id" content="old">',
]) {
  test(`replaces valid identity syntax: ${stale}`, () => {
    const html = `<html><head>${embedded}${stale}</head>${body}`;
    const result = injectGrokPwaHead(html, ctx);
    assert.equal(result.slice(result.indexOf("<body>")), body);
    assert.ok(result.includes(embedded));
    assert.deepEqual(
      identity(result)
        .map((attrs) => attrs.get("content"))
        .sort(),
      [ORIGIN_NAME, ORIGIN_ID].sort(),
    );
    assert.equal(injectGrokPwaHead(result, ctx), result);
  });
}

test("unrelated attributes and raw-text/comment contents remain byte-identical", () => {
  const retained =
    '<meta name="description" data-name="author" content="Keep this description"><meta name="description" data-property="og:title" content="Keep this too">';
  const result = injectGrokPwaHead(`<html><head>${embedded}${retained}</head>${body}`, ctx);
  assert.ok(result.includes(embedded + retained));
  assert.equal(result.slice(result.indexOf("<body>")), body);
});

test("direct and streaming injection agree at every UTF-8 split, including false head markers", () => {
  const html = `<html><head>${embedded}<title>Stale</title><meta name=author content=old><meta name=apple-mobile-web-app-title content=old></head>${body}`;
  const bytes = Buffer.from(html);
  const expected = injectGrokPwaHead(html, ctx);
  for (let at = 0; at <= bytes.length; at++) {
    const stream = createHeadInjector(ctx);
    const actual = Buffer.concat([
      ...stream.push(bytes.subarray(0, at)),
      ...stream.push(bytes.subarray(at)),
      ...stream.flush(),
    ]).toString();
    assert.equal(actual, expected, `split ${at}`);
  }
  assert.match(expected, /<title>VANESSA RENEE HENIZE<\/title>/);
  assert.match(expected, /name="apple-mobile-web-app-title" content="VANESSA RENEE HENIZE"/);
});

test("head buffering has an explicit finite failure instead of an unbounded allocation", () => {
  const stream = createHeadInjector(ctx);
  assert.throws(() => stream.push("<head>" + "x".repeat(1024 * 1024)), /1 MiB/);
});

test("origin CLI rejects invalid configuration both directly and through a symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "origin-cli-"));
  const project = fileURLToPath(new URL("../", import.meta.url));
  cpSync(join(project, "scripts"), join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "src/lib/og"), { recursive: true });
  cpSync(join(project, "src/lib/origin.mjs"), join(root, "src/lib/origin.mjs"));
  writeFileSync(join(root, "src/lib/og/site.json"), "{}");
  const direct = join(root, "scripts/check-origin.mjs");
  const alias = join(root, "origin-alias.mjs");
  symlinkSync(direct, alias);
  for (const entry of [direct, alias]) {
    const result = spawnSync(process.execPath, [entry], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /AEONIMUS origin invariant/);
  }
});

test("Node response adapter retains downstream write backpressure and completion timing", () => {
  const plugin = grokPwaPlugin();
  plugin.configResolved({ root: fileURLToPath(new URL("../", import.meta.url)) });
  const layers = [];
  plugin.configureServer({
    middlewares: {
      use(fn) {
        layers.push(fn);
      },
    },
  });
  let completion;
  let called = false;
  const response = {
    headersSent: false,
    getHeader() {
      return "text/html";
    },
    removeHeader() {},
    write(_chunk, cb) {
      completion = cb;
      return false;
    },
    end() {},
  };
  layers[1]({ url: "/", method: "GET", headers: { accept: "text/html" } }, response, () => {});
  assert.equal(
    response.write("<html><head></head>", () => {
      called = true;
    }),
    false,
  );
  assert.equal(called, false);
  completion();
  assert.equal(called, true);
});
