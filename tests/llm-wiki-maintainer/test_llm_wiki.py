from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_ROOT = REPO_ROOT / "skills/llm-wiki-maintainer"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


wiki_ingest = load_module("wiki_ingest_test", SKILL_ROOT / "scripts/wiki_ingest.py")
wiki_lint = load_module("wiki_lint_test", SKILL_ROOT / "scripts/wiki_lint.py")
wiki_query = load_module("wiki_query_test", SKILL_ROOT / "scripts/wiki_query.py")
sync_skill = load_module("sync_skill_test", REPO_ROOT / "scripts/sync_skill.py")


def write(root: Path, rel: str, content: str) -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def source_note(title: str = "Alpha Routing Engine") -> str:
    return f"""---
type: source-note
status: to-ingest
title: {title}
source: https://example.com/alpha
tags:
  - inbox
  - alpha
---

# {title}

Source body.
"""


def wiki_note(title: str, body: str, note_type: str = "synthesis-note") -> str:
    return f"""---
type: {note_type}
updated: 2026-08-09
status: compiled
---

# {title}

{body}

## 来源

{body}
"""


class IngestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.vault = Path(self.tempdir.name)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_plan_emits_hash_and_ranked_dynamic_target(self) -> None:
        source = write(self.vault, "_sources/inbox/2026-08/alpha.md", source_note())
        write(
            self.vault,
            "_wiki/Engineering/Alpha Routing.md",
            wiki_note("Alpha Routing", "Routing design."),
        )
        item = wiki_ingest.item_from_path(self.vault, source.relative_to(self.vault).as_posix())
        plan = wiki_ingest.build_plan(self.vault, item, [], 5)
        self.assertTrue(plan["source_sha256"].startswith("sha256:"))
        self.assertEqual(plan["targets"], ["_wiki/Engineering/Alpha Routing.md"])
        self.assertGreater(plan["candidate_targets"][0]["score"], 0)

    def test_multi_target_process_validates_archives_and_rewrites_links(self) -> None:
        source_rel = "_sources/inbox/2026-08/alpha.md"
        source = write(self.vault, source_rel, source_note())
        first_rel = "_wiki/Engineering/Alpha Map.md"
        second_rel = "_wiki/Engineering/Alpha Concept.md"
        write(self.vault, "Index.md", "# Index\n\n- [[_wiki/Engineering/Alpha Map]]\n")
        write(
            self.vault,
            first_rel,
            wiki_note(
                "Alpha Map",
                f"- [[_wiki/Engineering/Alpha Concept]]\n- [[{source_rel.removesuffix('.md')}]]",
                note_type="topic-note",
            ),
        )
        write(
            self.vault,
            second_rel,
            wiki_note("Alpha Concept", f"Evidence: [[{source_rel.removesuffix('.md')}]]"),
        )
        digest = wiki_ingest.sha256_path(source)
        manifest_rel = "_meta/ingest-manifests/alpha.json"
        write(
            self.vault,
            manifest_rel,
            json.dumps(
                {
                    "schema_version": 1,
                    "source": source_rel,
                    "source_sha256": digest,
                    "targets": [first_rel, second_rel],
                }
            ),
        )
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            result = wiki_ingest.main(
                [
                    "--vault",
                    str(self.vault),
                    "process",
                    source_rel,
                    "--manifest",
                    manifest_rel,
                ]
            )
        self.assertEqual(result, 0, stdout.getvalue())
        archived_rel = "_sources/articles/alpha.md"
        archived = self.vault / archived_rel
        self.assertFalse(source.exists())
        self.assertTrue(archived.exists())
        frontmatter, body, _ = wiki_ingest.split_frontmatter(archived.read_text(encoding="utf-8"))
        self.assertEqual(frontmatter["compiled_to"], [first_rel, second_rel])
        self.assertEqual(frontmatter["source_sha256"], digest)
        self.assertIn(f"[[{first_rel.removesuffix('.md')}]]", body)
        for rel in (first_rel, second_rel):
            target_text = (self.vault / rel).read_text(encoding="utf-8")
            self.assertIn(archived_rel.removesuffix(".md"), target_text)
            self.assertNotIn(source_rel.removesuffix(".md"), target_text)
        self.assertIn("2 target page(s) passed", (self.vault / "_meta/log.md").read_text(encoding="utf-8"))

    def test_hash_drift_is_rejected_without_writes(self) -> None:
        source_rel = "_sources/inbox/2026-08/alpha.md"
        source = write(self.vault, source_rel, source_note())
        target_rel = "_wiki/Engineering/Alpha.md"
        write(self.vault, "Index.md", "- [[_wiki/Engineering/Alpha]]\n")
        write(self.vault, target_rel, wiki_note("Alpha", f"[[{source_rel.removesuffix('.md')}]]"))
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            result = wiki_ingest.main(
                [
                    "--vault",
                    str(self.vault),
                    "process",
                    source_rel,
                    "--target",
                    target_rel,
                    "--expect-source-sha256",
                    "sha256:deadbeef",
                ]
            )
        self.assertEqual(result, 2)
        self.assertTrue(source.exists())
        self.assertFalse((self.vault / "_sources/articles/alpha.md").exists())
        self.assertIn("source hash changed", stderr.getvalue())

    def test_missing_provenance_blocks_process(self) -> None:
        source_rel = "_sources/inbox/2026-08/alpha.md"
        source = write(self.vault, source_rel, source_note())
        target_rel = "_wiki/Engineering/Alpha.md"
        write(self.vault, "Index.md", "- [[_wiki/Engineering/Alpha]]\n")
        write(self.vault, target_rel, wiki_note("Alpha", "No source citation."))
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            result = wiki_ingest.main(
                ["--vault", str(self.vault), "process", source_rel, "--target", target_rel]
            )
        self.assertEqual(result, 2)
        self.assertTrue(source.exists())
        self.assertIn("missing-provenance", stderr.getvalue())

    def test_reference_rewrite_changes_only_explicit_references(self) -> None:
        old = "_sources/inbox/2026-08/alpha.md"
        new = "_sources/articles/alpha.md"
        text = f"plain {old}\n`{old}`\n[[{old.removesuffix('.md')}|source]]\n[label]({old})\n"
        updated = wiki_ingest.rewrite_reference_text(text, old, new)
        self.assertIn(f"plain {old}", updated)
        self.assertIn(f"`{new}`", updated)
        self.assertIn(f"[[{new.removesuffix('.md')}|source]]", updated)
        self.assertIn(f"[label]({new})", updated)

    def test_path_guards_reject_scope_escape(self) -> None:
        write(self.vault, "outside.md", "outside\n")
        with self.assertRaisesRegex(ValueError, "must be under"):
            wiki_ingest.resolve_inbox_path(self.vault, "outside.md")
        source = write(self.vault, "_sources/inbox/2026-08/alpha.md", source_note())
        frontmatter, _body, _ = wiki_ingest.split_frontmatter(source.read_text(encoding="utf-8"))
        with self.assertRaisesRegex(ValueError, "must stay under _sources"):
            wiki_ingest.resolve_archive_destination(self.vault, source, frontmatter, "../escaped.md")


class LintTests(unittest.TestCase):
    def test_profiles_isolate_source_candidate_links_and_hidden_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            write(vault, "Index.md", "- [[_wiki/Alpha]]\n- [[_wiki/Review]]\n")
            write(vault, "_wiki/Alpha.md", wiki_note("Alpha", "Durable content."))
            write(
                vault,
                "_wiki/Review.md",
                "---\ntype: concept-note\nupdated: 2020-01-01\nreview_after: 2020-02-01\n---\n\n# Review\n",
            )
            write(vault, "_wiki/Self.md", wiki_note("Self", "[[Self]]"))
            write(vault, "_sources/inbox/2026-08/raw.md", source_note("Raw") + "\n[[Future Candidate]]\n")
            write(vault, ".temporary/import.md", "[[Hidden Missing]]\n")
            wiki_findings = wiki_lint.run_lint(vault, profile="wiki")
            source_findings = wiki_lint.run_lint(vault, profile="sources")
            self.assertFalse(any("Future Candidate" in finding.message for finding in wiki_findings))
            self.assertTrue(any("Future Candidate" in finding.message for finding in source_findings))
            self.assertFalse(any("Hidden Missing" in finding.message for finding in wiki_findings + source_findings))
            self.assertTrue(any(finding.check == "orphan-wiki-page" and finding.path == "_wiki/Self.md" for finding in wiki_findings))
            self.assertTrue(any(finding.check == "lifecycle-review-due" for finding in wiki_findings))
            self.assertFalse(wiki_lint.should_fail(source_findings, "P1"))


class QueryAndSyncTests(unittest.TestCase):
    def test_query_note_records_temporal_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            index_rel = "_wiki/AI/AI Map.md"
            write(vault, index_rel, "# AI Map\n\n## Questions\n")
            with contextlib.redirect_stdout(io.StringIO()):
                result = wiki_query.main(
                    [
                        "--vault",
                        str(vault),
                        "new",
                        "--title",
                        "What is Alpha?",
                        "--domain",
                        "AI",
                        "--source",
                        index_rel,
                        "--index",
                        index_rel,
                        "--index-section",
                        "Questions",
                        "--as-of",
                        "2026-08-09",
                        "--review-after",
                        "2026-12-01",
                    ]
                )
            self.assertEqual(result, 0)
            note = vault / "_wiki/AI/Questions/What is Alpha.md"
            self.assertTrue(note.exists())
            text = note.read_text(encoding="utf-8")
            self.assertIn("as_of: 2026-08-09", text)
            self.assertIn("review_after: 2026-12-01", text)
            self.assertIn("answered_from:", text)

    def test_sync_install_and_compare(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = write(root, "source/SKILL.md", "canonical\n").parent
            destination = root / "dest/skill"
            sync_skill.install(source, destination, force=False)
            self.assertTrue(sync_skill.compare(source, destination)["in_sync"])
            write(root, "dest/skill/SKILL.md", "drift\n")
            self.assertFalse(sync_skill.compare(source, destination)["in_sync"])
            sync_skill.install(source, destination, force=True)
            self.assertTrue(sync_skill.compare(source, destination)["in_sync"])


if __name__ == "__main__":
    unittest.main()
