import subprocess
import sys
import tempfile
import unittest
import warnings
from pathlib import Path
from zipfile import ZipFile


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "verify-apk-assets.py"


class ApkAssetVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.dist = self.root / "dist"
        (self.dist / "data").mkdir(parents=True)
        (self.dist / "index.html").write_text("hello", encoding="utf-8")
        (self.dist / "data" / "catalog.json").write_text("{}", encoding="utf-8")
        self.apk = self.root / "test.apk"

    def tearDown(self):
        self.temp.cleanup()

    def run_check(self):
        return subprocess.run(
            [sys.executable, str(SCRIPT), str(self.dist), str(self.apk)],
            capture_output=True, text=True, check=False,
        )

    def make_apk(self, *, index="hello", include_catalog=True, duplicate=False):
        with ZipFile(self.apk, "w") as apk:
            apk.writestr("assets/public/index.html", index)
            if include_catalog:
                apk.writestr("assets/public/data/catalog.json", "{}")
            apk.writestr("assets/public/cordova.js", "")  # Capacitor may add files.
            if duplicate:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", UserWarning)
                    apk.writestr("assets/public/index.html", index)

    def test_identical_web_build_and_additional_capacitor_file_pass(self):
        self.make_apk()
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("all 2 web files", result.stdout)

    def test_missing_different_or_duplicate_file_fails(self):
        for options in [{"include_catalog": False}, {"index": "modified"}, {"duplicate": True}]:
            with self.subTest(options=options):
                self.make_apk(**options)
                result = self.run_check()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Web assets differ", result.stderr)

    def test_incomplete_dist_fails(self):
        self.make_apk()
        (self.dist / "data" / "catalog.json").unlink()
        result = self.run_check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Not a complete web build", result.stderr)


if __name__ == "__main__":
    unittest.main()
