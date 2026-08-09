#!/usr/bin/env python3
"""CLI helpers for turning durable Q&A into LLM Wiki query notes."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable


def today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def sanitize_filename(title: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]+', " ", title).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or "Untitled Query"


def wiki_link_for(rel_path: str, alias: str | None = None) -> str:
    target = rel_path.removesuffix(".md")
    return f"[[{target}|{alias}]]" if alias else f"[[{target}]]"


def resolve_vault_path(vault: Path, user_path: str) -> Path:
    path = Path(user_path).expanduser()
    if not path.is_absolute():
        path = vault / path
    return path.resolve()


def ensure_under(path: Path, root: Path, label: str) -> None:
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError(f"{label} must be under {root}") from exc


def render_query_note(args: argparse.Namespace, rel_path: str) -> str:
    topics = args.topic or [args.domain]
    sources = args.source or []
    source_lines = "\n".join(f"- {wiki_link_for(source)}" for source in sources) or "-"
    answered_lines = "\n".join(f"  - {source}" for source in sources) or "  -"
    topic_lines = "\n".join(f"  - {topic}" for topic in topics)
    date = today()
    question = args.question or ""
    conclusion = args.conclusion or ""
    analysis = args.analysis or ""
    lifecycle_lines = []
    if args.as_of:
        lifecycle_lines.append(f"as_of: {args.as_of}")
    if args.review_after:
        lifecycle_lines.append(f"review_after: {args.review_after}")
    if args.supersedes:
        lifecycle_lines.append("supersedes:")
        lifecycle_lines.extend(f"  - {value}" for value in args.supersedes)
    lifecycle = "\n".join(lifecycle_lines)
    if lifecycle:
        lifecycle += "\n"
    return f"""---
type: query-note
topic:
{topic_lines}
created: {date}
updated: {date}
status: {args.status}
{lifecycle}answered_from:
{answered_lines}
tags:
  - query-note
---

# {args.title}

## 问题

{question}

## 结论

{conclusion}

## 分析

{analysis}

## 来源

{source_lines}

## 后续问题

-
"""


def heading_level(line: str) -> int | None:
    match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
    return len(match.group(1)) if match else None


def heading_text(line: str) -> str | None:
    match = re.match(r"^#{1,6}\s+(.+?)\s*$", line)
    return match.group(1).strip() if match else None


def insert_entry_in_section(text: str, section: str, entry: str) -> str:
    lines = text.splitlines()
    section_index: int | None = None
    section_level: int | None = None
    for index, line in enumerate(lines):
        if heading_text(line) == section:
            section_index = index
            section_level = heading_level(line)
            break
    if section_index is None or section_level is None:
        raise ValueError(f"index section not found: {section}")

    insert_at = len(lines)
    for index in range(section_index + 1, len(lines)):
        level = heading_level(lines[index])
        if level is not None and level <= section_level:
            insert_at = index
            break

    while insert_at > section_index + 1 and lines[insert_at - 1].strip() == "":
        insert_at -= 1
    insert_lines = [entry]
    if insert_at < len(lines) and lines[insert_at].strip() != "":
        insert_lines.append("")
    lines[insert_at:insert_at] = insert_lines
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")


def append_index(
    vault: Path,
    index_path: Path,
    note_rel: str,
    title: str,
    summary: str | None,
    section: str | None = None,
) -> None:
    ensure_under(index_path, vault / "_wiki", "index")
    if not index_path.exists():
        raise ValueError(f"index does not exist: {index_path}")
    text = index_path.read_text(encoding="utf-8", errors="replace")
    link = wiki_link_for(note_rel, title)
    entry = f"- {link}"
    if summary:
        entry += f"：{summary}"
    if link in text:
        return
    if section:
        index_path.write_text(insert_entry_in_section(text, section, entry), encoding="utf-8")
        return
    suffix = "\n" if text.endswith("\n") else "\n\n"
    index_path.write_text(text + suffix + entry + "\n", encoding="utf-8")


def validate_index_args(vault: Path, index_path: Path, section: str | None) -> None:
    ensure_under(index_path, vault / "_wiki", "index")
    if not index_path.exists():
        raise ValueError(f"index does not exist: {index_path}")
    if section:
        text = index_path.read_text(encoding="utf-8", errors="replace")
        if not any(heading_text(line) == section for line in text.splitlines()):
            raise ValueError(f"index section not found: {section}")


def append_log(vault: Path, note_rel: str, title: str, index_rel: str | None) -> None:
    log_path = vault / "_meta/log.md"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    files = f"`{note_rel}`"
    if index_rel:
        files += f", `{index_rel}`"
    entry = (
        f"\n## [{today()}] query | {title}\n\n"
        f"- Files: {files}\n"
        "- Summary: Created a query-note from a durable question so the judgment can be reused from the wiki.\n"
        "- Next: Fill in analysis details or promote to synthesis-note if the topic becomes stable.\n"
    )
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(entry)


def snapshot_files(paths: Iterable[Path]) -> dict[Path, bytes | None]:
    snapshots: dict[Path, bytes | None] = {}
    for path in paths:
        resolved = path.resolve()
        snapshots[resolved] = resolved.read_bytes() if resolved.is_file() else None
    return snapshots


def restore_files(snapshots: dict[Path, bytes | None]) -> None:
    for path, content in snapshots.items():
        if content is None:
            if path.is_file():
                path.unlink()
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)


def command_new(args: argparse.Namespace) -> int:
    filename = sanitize_filename(args.title) + ".md"
    note_path = (args.vault / "_wiki" / args.domain / "Questions" / filename).resolve()
    ensure_under(note_path, args.vault / "_wiki", "query note")
    note_rel = note_path.relative_to(args.vault).as_posix()
    index_path = resolve_vault_path(args.vault, args.index) if args.index else None
    index_rel = index_path.relative_to(args.vault).as_posix() if index_path else None
    content = render_query_note(args, note_rel)
    result = {
        "note": note_rel,
        "index": index_rel,
        "index_section": args.index_section,
        "status": args.status,
        "sources": args.source or [],
        "as_of": args.as_of,
        "review_after": args.review_after,
        "supersedes": args.supersedes or [],
    }

    if args.dry_run:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    if note_path.exists() and not args.force:
        print(f"error: query note already exists: {note_path}", file=sys.stderr)
        return 2
    if index_path:
        try:
            validate_index_args(args.vault, index_path, args.index_section)
        except ValueError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2

    log_path = args.vault / "_meta/log.md"
    touched = [note_path, log_path]
    if index_path:
        touched.append(index_path)
    snapshots = snapshot_files(touched)
    try:
        note_path.parent.mkdir(parents=True, exist_ok=True)
        note_path.write_text(content, encoding="utf-8")
        if index_path:
            append_index(args.vault, index_path, note_rel, args.title, args.summary, args.index_section)
        append_log(args.vault, note_rel, args.title, index_rel)
    except Exception as exc:  # noqa: BLE001 - restore partial file writes
        restore_files(snapshots)
        print(f"error: query-note creation failed and was rolled back: {exc}", file=sys.stderr)
        return 2
    print(f"Created {note_rel}.")
    if index_rel:
        print(f"Linked from {index_rel}.")
    print("Logged to _meta/log.md.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Create and maintain LLM Wiki query notes.")
    parser.add_argument("--vault", type=Path, default=Path.cwd(), help="Vault path. Defaults to current directory.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_parser = subparsers.add_parser("new", help="Create a new query-note.")
    new_parser.add_argument("--title", required=True, help="Query note title.")
    new_parser.add_argument("--domain", required=True, help="Domain folder under _wiki, such as AI or Observability.")
    new_parser.add_argument("--topic", action="append", help="Topic frontmatter value. Can be repeated.")
    new_parser.add_argument("--question", default="", help="Question text.")
    new_parser.add_argument("--conclusion", default="", help="Reusable conclusion.")
    new_parser.add_argument("--analysis", default="", help="Initial analysis text.")
    new_parser.add_argument("--source", action="append", help="Source wiki path. Can be repeated.")
    new_parser.add_argument("--status", choices=("seed", "compiled", "needs-review", "stale"), default="seed")
    new_parser.add_argument("--as-of", help="Date or period for which the answer is valid.")
    new_parser.add_argument("--review-after", help="Date after which volatile claims should be reviewed.")
    new_parser.add_argument("--supersedes", action="append", help="Older note superseded by this answer. Can be repeated.")
    new_parser.add_argument("--index", help="Optional _wiki topic map to append a link to.")
    new_parser.add_argument("--index-section", help="Optional Markdown heading in --index where the link should be inserted.")
    new_parser.add_argument("--summary", help="Optional one-line summary for the index entry.")
    new_parser.add_argument("--dry-run", action="store_true", help="Show planned files without changing the vault.")
    new_parser.add_argument("--force", action="store_true", help="Overwrite an existing query note.")
    new_parser.set_defaults(func=command_new)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.vault = args.vault.expanduser().resolve()
    if not args.vault.exists():
        parser.error(f"vault does not exist: {args.vault}")
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
