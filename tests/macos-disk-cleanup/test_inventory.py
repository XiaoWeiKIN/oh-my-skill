import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'skills/macos-disk-cleanup/scripts/inventory.py'


@unittest.skipUnless(platform.system() == 'Darwin', 'macOS inventory')
class InventoryTest(unittest.TestCase):
    def run_inventory(self, *args):
        result = subprocess.run(['python3', str(SCRIPT), *map(str, args)],
                                check=True, capture_output=True, text=True)
        return [json.loads(line) for line in result.stdout.splitlines()]

    def test_readonly_allocations_and_links(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp') as directory:
            root = Path(directory)
            original = root / 'original'
            original.write_bytes(b'x' * 8192)
            os.link(original, root / 'hardlink')
            (root / 'link').symlink_to(original)
            with (root / 'sparse').open('wb') as stream:
                stream.truncate(32 * 1024 * 1024)
            rows = self.run_inventory(root, '--children')
            entries = {Path(row['path']).name: row for row in rows[1:]}
            self.assertEqual(rows[0]['kind'], 'baseline')
            self.assertEqual(entries['link']['status'], 'skipped_symlink')
            self.assertEqual(entries['hardlink']['status'], 'ok')
            self.assertGreaterEqual(entries['original']['allocated_bytes_estimate'], 8192)
            self.assertLess(entries['sparse']['allocated_bytes_estimate'], 32 * 1024 * 1024)
            self.assertEqual(original.read_bytes(), b'x' * 8192)
            self.assertTrue((root / 'link').is_symlink())
            self.assertEqual(self.run_inventory(root / 'missing')[-1]['status'], 'missing')


if __name__ == '__main__':
    unittest.main()
