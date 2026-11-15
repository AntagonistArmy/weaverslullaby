# AEONIMUS portable source memory

Framework source: Vanessa Henize. Published origin: `VANESSA::AEONIMUS::VH012`.

This is the runnable Python 3.10+ source-memory kernel from the portable capsule, equipped to retrieve the existing public GitHub corpus into local state. It uses the Python standard library and SQLite. Its default demonstration runs offline; no model weights or API key are required. Optional text generation uses a separately installed loopback model server.

```sh
python tools/portable/START_HERE.py
python tools/portable/START_HERE.py search "Omega source continuity"
python tools/portable/START_HERE.py flare "Preserve source across model changes"
python tools/portable/START_HERE.py verify
```

`SOURCE_REPOSITORIES.json` records the existing public Codex commit and byte hashes. This repository ships a neutral offline example. `SYNC_GITHUB.py` retrieves the full public source and 304-plate index into local memory when explicitly run. Original text remains available while bounded evidence packets select spans with exact source offsets. Candidate targets and retrieved evidence have distinct frame types. Every FLARE emission creates five fresh descendants under a stable source ancestor; the user target remains first.

## Pull newer GitHub work

```sh
python tools/portable/SYNC_GITHUB.py
python tools/portable/SYNC_GITHUB.py --repository AntagonistArmy/weaverslullaby
```

Each call resolves the requested ref once, then fetches all selected files from that immutable commit. It adds those versions to local memory and retains previous versions. Downloading source does not execute that source. A local Git checkout can supply the same pinned bytes offline:

```sh
python tools/portable/SYNC_GITHUB.py --checkout ../aeonimus-codex --ref HEAD
```

The first command normally uses the public GitHub API without credentials and is subject to its rate limits. Git pushes use the repository's normal GitHub workflow; the runtime neither stores credentials nor pushes local memory automatically.

## Existing browser ledger integration

`src/lib/field/flare.ts` exports `emitFlare(fabric, target, retrieve, maxBytes)`. A caller supplies its retrieval function; the controller records the target followed by five source-addressed evidence branches through the existing `FieldFabric`. Producer/source labels and ancestry remain explicit. It waits for the existing durable ledger flush and reports retrieval failures in the corresponding branch. It leaves historical ledger events and recovery algorithms intact.

The browser's IndexedDB ledger and Python's SQLite memory are separate stores. This integration does not silently combine their histories. The browser controller is available as an exported API; the current visual interface remains the field application.

## Verification and transfer

```sh
cd tools/portable
python -m unittest test_kernel -v
```

`MANIFEST.json` covers the shipped code, source-reference metadata and neutral example. Writable state is outside that manifest. Carry the `state` folder when moving subsequent ingestions and generated frames. The complete original PNG capsule and recovered personal source archive are separate artifacts; they are excluded from this public code integration.

The operating environment is an application hosted by Python and the computer's existing OS. Corpus retrieval, field-event ancestry and local quantum calculations have executable interfaces; the broader physics propositions retain their source attribution. No inference-quality comparison against frontier models is implied by these integration tests.
