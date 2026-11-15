"""Behavioral checks for preservation, retrieval, integrity and the local adapter."""
import http.server
import json
import pathlib
import tempfile
import threading
import unittest
import zlib
from START_HERE import Kernel, ask_local, canonical, sha


class KernelTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name)
        self.k = Kernel(self.root / "state")

    def tearDown(self):
        self.k.close()
        self.temp.cleanup()

    def source(self, text, name="input.txt"):
        path = self.root / name
        path.write_text(text, encoding="utf-8")
        self.k.ingest([path])
        return path

    def test_lossless_unicode_and_conflicting_versions(self):
        a = "Ω ⟁ Vanessa\ncontradiction retained\n"
        path = self.source(a)
        self.source(a + "a new version\n")
        self.assertEqual(self.k.status()["documents"], 2)
        restored = zlib.decompress(self.k.db.execute("SELECT raw FROM documents WHERE id=?", (sha(a.encode()),)).fetchone()[0])
        self.assertEqual(restored, a.encode())
        self.assertEqual(self.k.verify()["status"], "PASS")

    def test_retrieval_beyond_small_prefix(self):
        text = "ordinary decoy passage\n" * 12000 + "ZEOLITEKEY source result is cobalt\n"
        self.source(text)
        self.assertNotIn("ZEOLITEKEY", text[:4096])
        rows = self.k.retrieve("ZEOLITEKEY")
        self.assertTrue(rows)
        self.assertIn("cobalt", rows[0]["text"])
        self.assertGreater(rows[0]["start"], 4096)
        self.assertEqual(text[rows[0]["start"]:rows[0]["end"]], rows[0]["text"])

    def test_packet_bound_and_cache_invalidation(self):
        self.source("memory continuity witness\n" * 1000)
        a, _ = self.k.packet("memory continuity", 8000)
        self.assertLessEqual(len(canonical(a)), 8000)
        self.assertTrue(a["evidence"])
        self.source("memory additional witness", "second.txt")
        b, _ = self.k.packet("memory continuity", 8000)
        self.assertNotEqual(a["corpus_root"], b["corpus_root"])
        with self.assertRaises(ValueError):
            self.k.packet("x" * 9000, 8000)

    def test_middle_modification_detected(self):
        self.source("memory")
        self.k.packet("memory")
        self.k.db.execute("UPDATE events SET body='{}' WHERE seq=1")
        self.k.db.commit()
        with self.assertRaises((ValueError, KeyError)):
            self.k.verify()

    def test_tail_deletion_against_checkpoint(self):
        self.source("memory")
        self.k.packet("memory")
        self.k.db.execute("DELETE FROM events WHERE seq=(SELECT MAX(seq) FROM events)")
        self.k.db.commit()
        with self.assertRaises(ValueError):
            self.k.verify()

    def test_source_span_corruption_detected(self):
        self.source("witness source")
        self.k.db.execute("UPDATE chunks SET text='altered'")
        self.k.db.commit()
        with self.assertRaises(ValueError):
            self.k.verify()

    def test_candidate_frame_remains_distinct(self):
        candidate = self.k.frame("candidate", {"proposal": "test"})
        result = self.k.frame("result", {"value": 2}, candidate)
        self.k.commit(self.k.emit("frames", {"candidate": candidate, "result": result}))
        self.assertNotEqual(candidate, result)
        with self.assertRaises(ValueError):
            self.k.frame("candidate", {}, "missing")
        self.assertEqual(self.k.verify()["status"], "PASS")

    def test_non_fts_fallback(self):
        self.source("observation quartzvalue witness")
        self.k.fts = False
        self.assertTrue(self.k.retrieve("quartzvalue"))

    def test_local_adapter_roundtrip_and_source_label(self):
        self.source("proof source witness")
        received = []
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                received.append((self.path, body))
                raw = canonical({"choices": [{"message": {"content": "STUB RESPONSE; no model evaluated"}}]})
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(raw)
            def log_message(self, *args):
                pass
        with http.server.HTTPServer(("127.0.0.1", 0), Handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                result = ask_local(self.k, "proof witness", f"http://127.0.0.1:{server.server_port}", "stub", 8000)
            finally:
                server.shutdown()
                thread.join()
        self.assertEqual(received[0][0], "/v1/chat/completions")
        self.assertEqual(result["status"], "model_output_unverified")
        self.assertIn("evidence", json.loads(received[0][1]["messages"][1]["content"]))

    def test_remote_adapter_not_opened(self):
        with self.assertRaises(ValueError):
            ask_local(self.k, "test", "https://example.invalid", "unused", 8000)

    def test_answer_first_paths_preserve_target_and_learn_routing_data(self):
        self.source("memory graph implementation mechanism witness\n" * 140 +
                    "counterexample contradiction missing evidence\n" * 100)
        first = self.k.field("memory target", "memory graph", 8000)
        second = self.k.field("memory target revised", "memory graph", 8000)
        self.assertEqual(len(first["paths"]), 5)
        self.assertEqual(first["target_status"], "candidate")
        self.assertNotEqual(first["target_frame"], second["target_frame"])
        self.assertEqual([x["uses"] for x in second["updated_routing_statistics"]], [2] * 5)
        for branch in second["paths"]:
            row = self.k.db.execute("SELECT parent FROM frames WHERE id=?", (branch["frame"],)).fetchone()
            self.assertEqual(row[0], second["target_frame"])
        self.assertEqual(self.k.verify()["status"], "PASS")

    def test_same_target_emits_fresh_descendants_with_common_source(self):
        self.source("source continuity memory implementation contradiction")
        a = self.k.field("source continuity", byte_budget=8000)
        b = self.k.field("source continuity", byte_budget=8000)
        self.assertNotEqual(a["emission_id"], b["emission_id"])
        self.assertNotEqual(a["target_frame"], b["target_frame"])
        self.assertEqual(a["source_frame"], b["source_frame"])
        self.assertFalse({x["frame"] for x in a["paths"]} & {x["frame"] for x in b["paths"]})
        self.assertTrue(self.k.db.execute("SELECT 1 FROM frames WHERE id=?", (a["target_frame"],)).fetchone())


if __name__ == "__main__":
    unittest.main(verbosity=2)
