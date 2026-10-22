#!/usr/bin/env python3
"""Read-only, sequential allocated-space inventory. Emits JSON Lines."""
import argparse
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
from datetime import datetime, timezone


def emit(**record):
    print(json.dumps(record, ensure_ascii=False), flush=True)


def scan(path, timeout):
    if path.is_symlink():
        emit(kind="entry", path=str(path), status="skipped_symlink")
        return
    if not path.exists():
        emit(kind="entry", path=str(path), status="missing")
        return
    try:
        result = subprocess.run(
            ["du", "-skx", str(path)], capture_output=True, text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        emit(kind="entry", path=str(path), status="timeout")
        return
    first = result.stdout.partition("\t")[0].strip()
    emit(kind="entry", path=str(path),
         status="ok" if result.returncode == 0 else "partial_or_error",
         allocated_bytes_estimate=int(first) * 1024 if first.isdigit() else None,
         error=result.stderr[:2000] or None)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", help="Explicit files/directories to inspect")
    parser.add_argument("--children", action="store_true", help="Inspect immediate children instead")
    parser.add_argument("--timeout", type=float, default=60, help="Seconds per du call")
    args = parser.parse_args()
    if platform.system() != "Darwin":
        parser.error("This helper supports macOS only")
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    volume = Path("/System/Volumes/Data")
    usage = shutil.disk_usage(volume)
    emit(kind="baseline", measured_at=datetime.now(timezone.utc).isoformat(),
         volume=str(volume), total_bytes=usage.total, available_bytes=usage.free,
         note="du estimates are not additive across shared extents, hardlinks or nested targets")
    for raw_path in args.paths:
        path = Path(os.path.abspath(os.path.expanduser(raw_path)))
        # Do not resolve links: report them rather than traversing their targets.
        if any(part.is_symlink() for part in (path, *path.parents)):
            emit(kind="entry", path=str(path), status="skipped_symlink_path")
            continue
        if not args.children:
            scan(path, args.timeout)
            continue
        try:
            with os.scandir(path) as entries:
                children = sorted(Path(entry.path) for entry in entries)
        except OSError as error:
            emit(kind="entry", path=str(path), status="error", error=str(error))
            continue
        for child in children:
            scan(child, args.timeout)


if __name__ == "__main__":
    main()
