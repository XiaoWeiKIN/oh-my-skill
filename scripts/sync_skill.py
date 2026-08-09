#!/usr/bin/env python3
"""Check or atomically install one skill from this canonical repository."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path


IGNORED_PARTS = {".DS_Store", "__pycache__", ".pytest_cache"}
IGNORED_SUFFIXES = {".pyc", ".pyo"}


def repository_root() -> Path:
    return Path(__file__).resolve().parent.parent


def default_destination_root() -> Path:
    codex_root = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")).expanduser()
    return codex_root / "skills"


def validate_name(name: str) -> str:
    if not name or "/" in name or "\\" in name or name in {".", ".."}:
        raise ValueError("skill name must be one directory name")
    return name


def managed_files(root: Path) -> dict[str, str]:
    if not root.exists():
        return {}
    files: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in IGNORED_PARTS for part in rel.parts) or path.suffix in IGNORED_SUFFIXES:
            continue
        files[rel.as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return files


def compare(source: Path, destination: Path) -> dict[str, object]:
    source_files = managed_files(source)
    destination_files = managed_files(destination)
    missing = sorted(set(source_files) - set(destination_files))
    extra = sorted(set(destination_files) - set(source_files))
    different = sorted(
        path for path in set(source_files) & set(destination_files) if source_files[path] != destination_files[path]
    )
    return {
        "source": str(source),
        "destination": str(destination),
        "in_sync": not missing and not extra and not different,
        "missing": missing,
        "extra": extra,
        "different": different,
    }


def copy_ignore(_directory: str, names: list[str]) -> set[str]:
    return {
        name
        for name in names
        if name in IGNORED_PARTS or Path(name).suffix in IGNORED_SUFFIXES
    }


def install(source: Path, destination: Path, force: bool) -> None:
    if destination.exists() and not force:
        result = compare(source, destination)
        if result["in_sync"]:
            return
        raise ValueError("destination differs; inspect with check or pass --force")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_root = Path(tempfile.mkdtemp(prefix=f".{destination.name}.install-", dir=destination.parent))
    candidate = temporary_root / destination.name
    backup: Path | None = None
    try:
        shutil.copytree(source, candidate, ignore=copy_ignore)
        if destination.exists():
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
            backup = destination.parent / f".{destination.name}.backup-{timestamp}"
            destination.rename(backup)
        candidate.rename(destination)
        if backup and backup.exists():
            shutil.rmtree(backup)
    except Exception:
        if destination.exists() and backup and backup.exists():
            shutil.rmtree(destination)
        if backup and backup.exists() and not destination.exists():
            backup.rename(destination)
        raise
    finally:
        if temporary_root.exists():
            shutil.rmtree(temporary_root)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Check or install a skill from the oh-my-skill repository.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in ("check", "install"):
        subparser = subparsers.add_parser(command)
        subparser.add_argument("name", type=validate_name)
        subparser.add_argument("--dest-root", type=Path, default=default_destination_root())
        subparser.add_argument("--json", action="store_true")
        if command == "install":
            subparser.add_argument("--force", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    source = repository_root() / "skills" / args.name
    if not source.is_dir():
        raise SystemExit(f"error: canonical skill does not exist: {source}")
    destination = args.dest_root.expanduser().resolve() / args.name
    if args.command == "install":
        try:
            install(source, destination, args.force)
        except ValueError as exc:
            raise SystemExit(f"error: {exc}") from exc
    result = compare(source, destination)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        state = "in sync" if result["in_sync"] else "drift detected"
        print(f"{args.name}: {state} -> {destination}")
        for key in ("missing", "extra", "different"):
            values = result[key]
            if values:
                print(f"  {key}: {', '.join(values)}")
    return 0 if result["in_sync"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
