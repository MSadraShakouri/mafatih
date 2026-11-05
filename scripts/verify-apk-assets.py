#!/usr/bin/env python3
"""Check that a Capacitor APK contains the exact files from a given web build."""

from __future__ import annotations

import hashlib
import sys
from collections import Counter
from pathlib import Path
from zipfile import BadZipFile, ZipFile


def verify(dist: Path, apk: Path) -> None:
    if not (dist / "index.html").is_file() or not (dist / "data" / "catalog.json").is_file():
        raise ValueError("Not a complete web build: missing index.html or data/catalog.json")
    files = {
        "assets/public/" + path.relative_to(dist).as_posix(): path
        for path in dist.rglob("*")
        if path.is_file()
    }
    with ZipFile(apk) as archive:
        counts = Counter(archive.namelist())
        missing = sorted(name for name in files if counts[name] == 0)
        duplicate = sorted(name for name in files if counts[name] > 1)
        different = []
        for name, path in files.items():
            if counts[name] == 1:
                packaged_hash = hashlib.sha256(archive.read(name)).digest()
                web_hash = hashlib.sha256(path.read_bytes()).digest()
                if packaged_hash != web_hash:
                    different.append(name)
        if missing or duplicate or different:
            raise ValueError(
                f"Web assets differ: missing={missing[:5]}, "
                f"duplicate={duplicate[:5]}, different={sorted(different)[:5]}"
            )
        extra = sorted(
            name for name in counts
            if name.startswith("assets/public/") and not name.endswith("/") and name not in files
        )
    print(f"Verified all {len(files)} web files byte-for-byte in the APK.")
    if extra:
        print(f"Additional native/Capacitor web assets ({len(extra)}): {', '.join(extra[:5])}")


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: verify-apk-assets.py DIST_DIRECTORY APK_FILE", file=sys.stderr)
        return 2
    try:
        verify(Path(sys.argv[1]), Path(sys.argv[2]))
    except (OSError, BadZipFile, ValueError) as error:
        print(f"APK asset verification failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
