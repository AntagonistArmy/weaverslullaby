import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ORIGIN_ID, ORIGIN_NAME } from "../src/lib/origin.mjs";
import { grokPwaPlugin, renderInstallPage } from "./grok-pwa-plugin.mjs";
import { assertOriginIdentity } from "./check-origin.mjs";
import {
  createHeadInjector,
  injectGrokPwaHead,
  renderInstallPageHtml,
  renderWebManifest,
  snapshotOgIdentity,
} from "./grok-pwa-shared.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EMPTY = mkdtempSync(join(tmpdir(), "aeonimus-deployed-origin-"));
const template = readFileSync(join(ROOT, "scripts/install-page.html"), "utf8");
const { site } = snapshotOgIdentity(ROOT);

function assertAuthorship(html) {
  assert.match(html, /name="author" content="VANESSA RENEE HENIZE"/);
  assert.match(html, /name="aeonimus-origin-id" content="VANESSA::AEONIMUS::VH012"/);
  assert.equal((html.match(/name="author"/g) ?? []).length, 1);
  assert.equal((html.match(/name="aeonimus-origin-id"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /content="Platform default"/);
}

test("published origin values remain compatible with existing ledger records", () => {
  assert.equal(ORIGIN_NAME, "VANESSA RENEE HENIZE");
  assert.equal(ORIGIN_ID, "VANESSA::AEONIMUS::VH012");
});

test("the project site and baked deployment preserve the canonical source identity", () => {
  assert.doesNotThrow(() => assertOriginIdentity(site));
  assert.equal(site.title, ORIGIN_NAME);
  assert.equal(site.author, ORIGIN_NAME);
  assert.equal(site.origin_id, ORIGIN_ID);
});

for (const key of ["title", "author", "origin_id", "missing", "malformed"]) {
  test(`development and build configuration reject ${key} identity drift`, () => {
    const root = mkdtempSync(join(tmpdir(), "aeonimus-invalid-origin-"));
    mkdirSync(join(root, "src/lib/og"), { recursive: true });
    if (key !== "missing") {
      const value =
        key === "malformed"
          ? "{broken JSON"
          : JSON.stringify({ ...site, [key]: "Platform default" });
      writeFileSync(join(root, "src/lib/og/site.json"), value);
    }
    assert.throws(() => grokPwaPlugin().configResolved({ root }), /AEONIMUS origin invariant/);
  });
}

for (const host of [
  "localhost:8080",
  "another-name.grok.me",
  "preview.example.test",
  "app.vercel.app",
]) {
  test(`installation preserves the authored origin on ${host}`, () => {
    const manifest = JSON.parse(renderWebManifest(host, { site, cwd: EMPTY }));
    assert.equal(manifest.name, ORIGIN_NAME);
    assert.equal(manifest.short_name, ORIGIN_NAME);
    assert.equal(manifest.author, ORIGIN_NAME);
    assert.equal(manifest.origin_id, ORIGIN_ID);
    assert.equal(manifest.id, "/", "installation identity stays compatible");
    const html = renderInstallPageHtml(template, {
      host,
      url: "/field?install=1&platform=ios&tab=2",
      site,
      cwd: EMPTY,
    });
    assert.ok(html.includes(`Add ${ORIGIN_NAME} to your`));
    assert.match(html, /href="\/field\?tab=2"/);
    assertAuthorship(html);
  });
}

test("the development install adapter uses the project identity", () => {
  const html = renderInstallPage("another-name.grok.me", "/?install=1&platform=ios", ROOT);
  assert.ok(html.includes(`Add ${ORIGIN_NAME} to your`));
  assertAuthorship(html);
});

test("metadata injection preserves configured authorship and remains idempotent", () => {
  const html =
    '<html><head><title>Platform default</title><meta name=\'author\' content="Platform default"><meta name="aeonimus-origin-id" content="Platform default"></head><body>retained expression</body></html>';
  const ctx = { host: "another-name.grok.me", site, cwd: EMPTY };
  const result = injectGrokPwaHead(html, ctx);
  assertAuthorship(result);
  assert.match(result, /property="og:title" content="VANESSA RENEE HENIZE"/);
  assert.match(result, /<body>retained expression<\/body>/);
  assert.match(result, /grok-app-builder\/extensions\.js/, "integration continues to operate");
  assert.equal(injectGrokPwaHead(result, ctx), result);
});

test("streamed metadata retains authored provenance across chunk boundaries", () => {
  const ctx = { host: "another-name.grok.me", site, cwd: EMPTY };
  const injector = createHeadInjector(ctx);
  const chunks = [
    ...injector.push('<html><head><meta name="author" content="Platform default"></he'),
    ...injector.push("ad><body>retained expression</body></html>"),
    ...injector.flush(),
  ];
  const result = Buffer.concat(chunks).toString("utf8");
  assertAuthorship(result);
  assert.match(result, /<body>retained expression<\/body>/);
  assert.equal(injectGrokPwaHead(result, ctx), result);
});
