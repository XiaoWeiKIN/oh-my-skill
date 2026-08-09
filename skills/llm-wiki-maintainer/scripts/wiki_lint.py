#!/usr/bin/env python3
"""Layer-aware deterministic lint checks for an LLM Wiki vault."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterable
from urllib.parse import unquote


WIKI_LINK_RE = re.compile(r"(?<!!)\[\[([^\]]+)\]\]")
MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")
MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
ROOT_ATTACHMENT_SUFFIXES = {
    ".avif",
    ".bmp",
    ".gif",
    ".jpeg",
    ".jpg",
    ".mov",
    ".mp3",
    ".mp4",
    ".pdf",
    ".png",
    ".svg",
    ".webp",
}
SKIP_PARTS = {".git", ".obsidian", ".trash", "node_modules", "skills", "__pycache__"}
SEVERITY_RANK = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
PROVENANCE_HEADINGS = {"来源", "相关来源", "资料与证据", "参考资料", "证据"}


@dataclass(frozen=True)
class Finding:
    check: str
    severity: str
    path: str
    message: str


def _rel(path: Path, vault: Path) -> str:
    try:
        return path.relative_to(vault).as_posix()
    except ValueError:
        return path.as_posix()


def _is_skipped(path: Path, vault: Path) -> bool:
    parts = path.relative_to(vault).parts
    return any(part in SKIP_PARTS or part.startswith(".") for part in parts)


def _in_profile(rel: str, profile: str) -> bool:
    if profile == "wiki":
        return rel == "Index.md" or rel.startswith("_wiki/")
    if profile == "sources":
        return rel.startswith("_sources/") or rel.startswith("_raw/")
    return True


def iter_markdown_files(vault: Path, profile: str = "all") -> Iterable[Path]:
    for path in vault.rglob("*.md"):
        if _is_skipped(path, vault):
            continue
        if _in_profile(_rel(path, vault), profile):
            yield path


def _note_index(vault: Path) -> tuple[set[str], set[str], dict[str, list[str]]]:
    stems: set[str] = set()
    rel_paths: set[str] = set()
    stem_paths: dict[str, list[str]] = defaultdict(list)
    for path in iter_markdown_files(vault, "all"):
        rel = _rel(path, vault)
        stems.add(path.stem)
        rel_paths.add(rel)
        rel_paths.add(_rel(path.with_suffix(""), vault))
        stem_paths[path.stem].append(rel)
    return stems, rel_paths, stem_paths


def normalize_wiki_target(raw_target: str) -> str:
    target = raw_target.replace("\\|", "|").strip()
    target = target.split("|", 1)[0]
    target = target.split("#", 1)[0]
    return target.strip()


def _is_intentional_placeholder(target: str) -> bool:
    return any(marker in target for marker in ("<", ">", "{", "}", "...")) or target.startswith("TODO:")


def _severity_for_path(rel: str, important: str = "P1", source: str = "P3") -> str:
    if rel == "Index.md" or rel == "_wiki/Home.md" or rel.startswith("_wiki/"):
        return important
    if rel.startswith("_sources/") or rel.startswith("_raw/"):
        return source
    return "P3"


def _frontmatter(text: str) -> dict[str, str | list[str]]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    data: dict[str, str | list[str]] = {}
    current_key: str | None = None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if line.startswith("  - ") and current_key:
            existing = data.setdefault(current_key, [])
            if isinstance(existing, list):
                existing.append(line[4:].strip().strip("'\""))
            continue
        if ":" not in line or line.lstrip().startswith("#"):
            continue
        key, value = line.split(":", 1)
        current_key = key.strip()
        data[current_key] = value.strip().strip("'\"") if value.strip() else []
    return data


def _headings(text: str) -> set[str]:
    return {
        match.group(1).strip()
        for line in text.splitlines()
        if (match := re.match(r"^#{1,6}\s+(.+?)\s*$", line))
    }


def find_root_attachments(vault: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in vault.iterdir():
        if path.is_file() and path.suffix.lower() in ROOT_ATTACHMENT_SUFFIXES:
            findings.append(
                Finding(
                    check="root-attachment",
                    severity="P3",
                    path=_rel(path, vault),
                    message="Attachment is in the vault root; expected media/ or source assets.",
                )
            )
    return findings


def find_broken_wiki_links(vault: Path, profile: str) -> list[Finding]:
    stems, rel_paths, _stem_paths = _note_index(vault)
    findings: list[Finding] = []
    for path in iter_markdown_files(vault, profile):
        rel = _rel(path, vault)
        text = path.read_text(encoding="utf-8", errors="replace")
        for target in WIKI_LINK_RE.findall(text):
            clean_target = normalize_wiki_target(target)
            if not clean_target or _is_intentional_placeholder(clean_target):
                continue
            if clean_target not in stems and clean_target not in rel_paths:
                findings.append(
                    Finding(
                        check="broken-wiki-link",
                        severity=_severity_for_path(rel),
                        path=rel,
                        message=f"Wiki link target not found: [[{clean_target}]]",
                    )
                )
    return findings


def _clean_markdown_target(raw: str) -> str | None:
    target = raw.strip()
    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1]
    if "://" in target or target.startswith(("#", "mailto:", "data:")):
        return None
    target = unquote(target.split("#", 1)[0].split("?", 1)[0]).strip()
    return target or None


def find_missing_markdown_links(vault: Path, profile: str) -> list[Finding]:
    findings: list[Finding] = []
    for path in iter_markdown_files(vault, profile):
        rel = _rel(path, vault)
        text = path.read_text(encoding="utf-8", errors="replace")
        for raw_target in MARKDOWN_LINK_RE.findall(text):
            target = _clean_markdown_target(raw_target)
            if not target:
                continue
            linked_path = (path.parent / target).resolve()
            try:
                linked_path.relative_to(vault.resolve())
            except ValueError:
                continue
            if not linked_path.exists():
                findings.append(
                    Finding(
                        check="broken-markdown-link",
                        severity=_severity_for_path(rel),
                        path=rel,
                        message=f"Markdown link target not found: {raw_target}",
                    )
                )
    return findings


def find_missing_markdown_images(vault: Path, profile: str) -> list[Finding]:
    findings: list[Finding] = []
    for path in iter_markdown_files(vault, profile):
        rel = _rel(path, vault)
        text = path.read_text(encoding="utf-8", errors="replace")
        for raw_target in MARKDOWN_IMAGE_RE.findall(text):
            target = _clean_markdown_target(raw_target)
            if not target:
                continue
            image_path = (path.parent / target).resolve()
            try:
                image_path.relative_to(vault.resolve())
            except ValueError:
                continue
            if not image_path.exists():
                findings.append(
                    Finding(
                        check="missing-image",
                        severity=_severity_for_path(rel, important="P2", source="P3"),
                        path=rel,
                        message=f"Markdown image target not found: {raw_target}",
                    )
                )
    return findings


def _durable_link_sources(vault: Path) -> dict[str, set[str]]:
    linked: dict[str, set[str]] = defaultdict(set)
    paths: list[Path] = []
    index = vault / "Index.md"
    if index.exists():
        paths.append(index)
    wiki = vault / "_wiki"
    if wiki.exists():
        paths.extend(wiki.rglob("*.md"))
    for path in paths:
        source_rel = _rel(path, vault)
        text = path.read_text(encoding="utf-8", errors="replace")
        for target in WIKI_LINK_RE.findall(text):
            linked[normalize_wiki_target(target)].add(source_rel)
    return linked


def find_orphan_wiki_pages(vault: Path) -> list[Finding]:
    wiki_dir = vault / "_wiki"
    if not wiki_dir.exists():
        return [Finding("missing-wiki-dir", "P1", "_wiki", "The _wiki directory does not exist.")]
    linked = _durable_link_sources(vault)
    findings: list[Finding] = []
    for path in wiki_dir.rglob("*.md"):
        if path.stem in {"Home", "Index"}:
            continue
        page_rel = _rel(path, vault)
        rel_no_suffix = _rel(path.with_suffix(""), vault)
        inbound = (linked.get(path.stem, set()) | linked.get(rel_no_suffix, set())) - {page_rel}
        if not inbound:
            findings.append(
                Finding(
                    check="orphan-wiki-page",
                    severity="P2",
                    path=_rel(path, vault),
                    message="Wiki page has no inbound durable link from Index.md or _wiki.",
                )
            )
    return findings


def find_ambiguous_note_names(vault: Path) -> list[Finding]:
    _stems, _rel_paths, stem_paths = _note_index(vault)
    findings: list[Finding] = []
    for stem, paths in sorted(stem_paths.items()):
        wiki_paths = [path for path in paths if path.startswith("_wiki/")]
        if len(wiki_paths) > 1:
            findings.append(
                Finding(
                    check="ambiguous-wiki-name",
                    severity="P2",
                    path=", ".join(wiki_paths),
                    message=f"Multiple _wiki pages share basename '{stem}'; basename links are ambiguous.",
                )
            )
    return findings


def find_wiki_schema_issues(vault: Path) -> list[Finding]:
    wiki = vault / "_wiki"
    if not wiki.exists():
        return []
    findings: list[Finding] = []
    for path in wiki.rglob("*.md"):
        if path.stem == "Home":
            continue
        rel = _rel(path, vault)
        text = path.read_text(encoding="utf-8", errors="replace")
        frontmatter = _frontmatter(text)
        for field in ("type", "updated"):
            if not frontmatter.get(field):
                findings.append(
                    Finding(
                        check=f"missing-frontmatter-{field}",
                        severity="P2" if field == "type" else "P3",
                        path=rel,
                        message=f"Durable wiki page is missing frontmatter field: {field}.",
                    )
                )
        note_type = str(frontmatter.get("type") or "")
        if note_type in {"synthesis-note", "comparison-note", "query-note"}:
            if not (_headings(text) & PROVENANCE_HEADINGS):
                findings.append(
                    Finding(
                        check="missing-provenance-section",
                        severity="P2",
                        path=rel,
                        message=f"{note_type} has no provenance section.",
                    )
                )
        status = str(frontmatter.get("status") or "")
        if status in {"stale", "needs-review"}:
            findings.append(
                Finding(
                    check="lifecycle-review",
                    severity="P2",
                    path=rel,
                    message=f"Page lifecycle status requires review: {status}.",
                )
            )
        review_after = str(frontmatter.get("review_after") or "")
        if review_after:
            try:
                review_date = datetime.strptime(review_after, "%Y-%m-%d").date()
            except ValueError:
                findings.append(
                    Finding(
                        check="invalid-review-date",
                        severity="P3",
                        path=rel,
                        message=f"review_after is not YYYY-MM-DD: {review_after}.",
                    )
                )
            else:
                if review_date <= date.today():
                    findings.append(
                        Finding(
                            check="lifecycle-review-due",
                            severity="P2",
                            path=rel,
                            message=f"review_after is due: {review_after}.",
                        )
                    )
    return findings


def _month_age_days(month: str) -> int | None:
    try:
        captured = datetime.strptime(month + "-01", "%Y-%m-%d").date()
    except ValueError:
        return None
    return (date.today() - captured).days


def find_inbox_backlog(vault: Path) -> list[Finding]:
    inbox = vault / "_sources/inbox"
    if not inbox.exists():
        return []
    findings: list[Finding] = []
    for path in inbox.rglob("*.md"):
        text = path.read_text(encoding="utf-8", errors="replace")
        status = str(_frontmatter(text).get("status") or "")
        if status != "to-ingest":
            continue
        rel = _rel(path, vault)
        month = next((part for part in path.relative_to(inbox).parts if re.fullmatch(r"\d{4}-\d{2}", part)), "")
        age = _month_age_days(month) if month else None
        severity = "P2" if age is not None and age > 45 else "P3"
        age_message = f"; source month is {age} days old" if age is not None else ""
        findings.append(
            Finding(
                check="inbox-backlog",
                severity=severity,
                path=rel,
                message="Source is waiting for ingest" + age_message + ".",
            )
        )
    return findings


def run_lint(vault: Path, profile: str = "wiki") -> list[Finding]:
    vault = vault.expanduser().resolve()
    if profile not in {"wiki", "sources", "all"}:
        raise ValueError(f"unknown lint profile: {profile}")
    findings: list[Finding] = []
    if profile in {"wiki", "all"}:
        findings.extend(find_root_attachments(vault))
        findings.extend(find_orphan_wiki_pages(vault))
        findings.extend(find_ambiguous_note_names(vault))
        findings.extend(find_wiki_schema_issues(vault))
    if profile in {"sources", "all"}:
        findings.extend(find_inbox_backlog(vault))
    findings.extend(find_broken_wiki_links(vault, profile))
    findings.extend(find_missing_markdown_links(vault, profile))
    findings.extend(find_missing_markdown_images(vault, profile))
    return sorted(findings, key=lambda finding: (SEVERITY_RANK[finding.severity], finding.check, finding.path, finding.message))


def should_fail(findings: list[Finding], fail_on: str) -> bool:
    if fail_on == "none":
        return False
    threshold = SEVERITY_RANK[fail_on]
    return any(SEVERITY_RANK[finding.severity] <= threshold for finding in findings)


def print_findings(findings: list[Finding], *, output: str) -> None:
    if output == "json":
        print(json.dumps([asdict(finding) for finding in findings], ensure_ascii=False, indent=2))
        return
    if not findings:
        print("No lint findings.")
        return
    counts: dict[str, int] = defaultdict(int)
    for finding in findings:
        counts[finding.severity] += 1
        print(f"[{finding.severity}] {finding.check}: {finding.path} - {finding.message}")
    summary = " ".join(f"{severity}={counts[severity]}" for severity in ("P0", "P1", "P2", "P3") if counts[severity])
    print(f"Summary: {summary}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run scoped deterministic checks for an LLM Wiki vault.")
    parser.add_argument("--vault", type=Path, default=Path.cwd(), help="Vault path. Defaults to current directory.")
    parser.add_argument("--profile", choices=("wiki", "sources", "all"), default="wiki")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--fail-on", choices=("none", "P0", "P1", "P2", "P3"), default="none")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.vault.exists():
        parser.error(f"vault does not exist: {args.vault}")
    findings = run_lint(args.vault, profile=args.profile)
    print_findings(findings, output=args.format)
    return 1 if should_fail(findings, args.fail_on) else 0


if __name__ == "__main__":
    raise SystemExit(main())
