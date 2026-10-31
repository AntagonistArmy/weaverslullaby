import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ORIGIN_ID, ORIGIN_NAME } from "../src/lib/origin.mjs";
import { readOgSite } from "./grok-pwa-shared.mjs";

/** Reject identity drift before a development server or build can publish it. */
export function assertOriginIdentity(site) {
  const expected = { title: ORIGIN_NAME, author: ORIGIN_NAME, origin_id: ORIGIN_ID };
  for (const [key, value] of Object.entries(expected)) {
    if (site?.[key] !== value) {
      throw new Error(`AEONIMUS origin invariant: site.${key} must remain ${value}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  assertOriginIdentity(readOgSite(root));
  console.log(`AEONIMUS origin verified: ${ORIGIN_NAME} · ${ORIGIN_ID}`);
}
