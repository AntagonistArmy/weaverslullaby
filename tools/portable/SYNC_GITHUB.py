"""Pull pinned public GitHub source snapshots into AEONIMUS's local memory."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import re
import subprocess
import urllib.parse
import urllib.request
from START_HERE import Kernel

ROOT = Path(__file__).resolve().parent
REPOSITORIES = {
    "AntagonistArmy/aeonimus-codex": ["README.md", "codex.md", "image_catalog.md", "plates_index.json", "plates_manifest.json"],
    "AntagonistArmy/weaverslullaby": ["README.md", "src/lib/field/README.md", "src/lib/field/event.ts", "src/lib/field/fabric.ts", "src/lib/field/ledger.ts"],
}


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "AEONIMUS-source-memory", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read(16 * 1024 * 1024 + 1)
    if len(raw) > 16 * 1024 * 1024:
        raise ValueError("Source file exceeds the 16 MiB retrieval budget")
    return raw


def pull(repository, state, ref="main", checkout=None):
    if repository not in REPOSITORIES:
        raise ValueError("Choose one of the documented AEONIMUS public repositories")
    if checkout:
        def git(*args):
            return subprocess.run(["git", "-C", str(checkout), *args], check=True, capture_output=True).stdout
        commit = git("rev-parse", "--verify", ref + "^{commit}").decode().strip()
    else:
        commit = json.loads(download("https://api.github.com/repos/" + repository + "/commits/" + urllib.parse.quote(ref, safe="")))["sha"]
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("GitHub did not return a full commit SHA")
    destination = Path(state) / "github_sources" / repository.replace("/", "__") / commit
    sources = []
    # Fetch and validate all source bytes before indexing a snapshot.
    fetched = []
    for name in REPOSITORIES[repository]:
        raw = git("show", commit + ":" + name) if checkout else download(
            "https://raw.githubusercontent.com/" + repository + "/" + commit + "/" + name)
        raw.decode("utf-8")
        fetched.append((name, raw))
    for name, raw in fetched:
        path = destination / (name if name.endswith((".md", ".json")) else name + ".txt")
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.read_bytes() != raw:
            raise ValueError("A cached immutable commit snapshot was modified: " + name)
        path.write_bytes(raw)
        sources.append({"path": name, "local_path": str(path.resolve()), "bytes": len(raw),
                        "sha256": hashlib.sha256(raw).hexdigest(),
                        "url": "https://github.com/" + repository + "/blob/" + commit + "/" + name})
    receipt = {"repository": repository, "commit": commit, "retrieved_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "files": sources}
    receipt_path = destination / "SOURCE_PROVENANCE.json"
    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    kernel = Kernel(state)
    try:
        kernel.ingest([Path(row["local_path"]) for row in sources] + [receipt_path])
        receipt["memory_integrity"] = kernel.verify()
    finally:
        kernel.close()
    return receipt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", choices=REPOSITORIES, default="AntagonistArmy/aeonimus-codex")
    parser.add_argument("--ref", default="main")
    parser.add_argument("--checkout", type=Path)
    parser.add_argument("--state", type=Path, default=ROOT / "state")
    args = parser.parse_args()
    print(json.dumps(pull(args.repository, args.state, args.ref, args.checkout), indent=2))
