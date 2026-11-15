import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from SYNC_GITHUB import pull, REPOSITORIES
from START_HERE import Kernel


class GitHubSyncTests(unittest.TestCase):
    def test_pinned_snapshots_retain_versions_and_detect_changed_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            checkout = root / 'repo'
            checkout.mkdir()
            state = root / 'state'
            def git(*args):
                return subprocess.run(['git', '-C', str(checkout), *args], check=True, capture_output=True).stdout
            git('init', '-b', 'main')
            git('config', 'user.name', 'Snapshot Test')
            git('config', 'user.email', 'snapshot@example.test')
            for name in REPOSITORIES['AntagonistArmy/aeonimus-codex']:
                (checkout / name).write_text(json.dumps({'fixture': name}) if name.endswith('.json') else name + ' first version')
            git('add', '.')
            git('commit', '-m', 'first snapshot')
            first = pull('AntagonistArmy/aeonimus-codex', state, 'HEAD', checkout)
            (checkout / 'codex.md').write_text('second version Ω')
            git('add', '.')
            git('commit', '-m', 'second snapshot')
            second = pull('AntagonistArmy/aeonimus-codex', state, 'HEAD', checkout)
            self.assertNotEqual(first['commit'], second['commit'])
            self.assertEqual(Path(first['files'][1]['local_path']).read_text(), 'codex.md first version')
            self.assertEqual(Path(second['files'][1]['local_path']).read_text(), 'second version Ω')
            self.assertEqual(second['memory_integrity']['status'], 'PASS')
            kernel = Kernel(state)
            try:
                self.assertTrue(kernel.retrieve('second version'))
            finally:
                kernel.close()
            Path(second['files'][1]['local_path']).write_text('tampered cache')
            with self.assertRaisesRegex(ValueError, 'modified'):
                pull('AntagonistArmy/aeonimus-codex', state, 'HEAD', checkout)

    def test_unconfigured_repository_is_rejected_before_network_access(self):
        with self.assertRaises(ValueError):
            pull('unconfigured/repository', Path('unused'))
