# Lint Checklist

Run deterministic checks before semantic review. Keep source-layer noise separate from durable-wiki failures.

## Deterministic profiles

### Wiki profile

- Root has no stray attachments.
- `Index.md` and `_wiki/` links resolve.
- Durable pages have inbound links from `Index.md` or `_wiki/`.
- `_wiki` basenames are unambiguous.
- Durable pages have `type` and `updated` frontmatter.
- Synthesis, comparison, and query notes have provenance sections.
- Local Markdown links and images resolve.
- `stale` and `needs-review` pages appear in the maintenance queue.

### Sources profile

- Pending inbox sources are visible and aged.
- Source-layer links and local images are classified separately.
- Raw candidate links do not create durable-page stubs automatically.
- Source notes show whether they are pending, compiled, skipped, or need review.

### All profile

Combine both profiles for a complete report. Hidden directories, generated caches, dependency folders, and bundled skill documentation are excluded by default.

Run:

```bash
python3 -B scripts/wiki_lint.py --vault "/path/to/vault" --profile wiki --fail-on P1
python3 -B scripts/wiki_lint.py --vault "/path/to/vault" --profile sources
python3 -B scripts/wiki_lint.py --vault "/path/to/vault" --profile all --format json
```

`--fail-on P1` fails on P0 or P1 findings. Use `P2` or `P3` only when the vault is ready for stricter CI.

## Semantic review

Use LLM judgment for checks that deterministic code cannot prove:

- contradictory claims across pages;
- claims superseded by newer evidence;
- duplicate topics with diverging conclusions;
- high-frequency concepts that deserve their own page;
- comparisons without decision criteria;
- unsupported or overconfident conclusions;
- gaps worth filling with new sources.

For large vaults, review changed pages, their outbound links, inbound durable links, and directly cited sources. Expand scope only when evidence points to a wider conflict.

## Severity

- P0: data loss, source corruption, unsafe or destructive migration.
- P1: broken important navigation, missing critical provenance, invalid source preservation.
- P2: orphan pages, ambiguous names, stale claims, missing schema or provenance sections.
- P3: source-layer noise, minor metadata, naming, or attachment hygiene.

## Report shape

Write reports under `_meta/lint-reports/YYYY-MM-DD-topic.md` when writes are allowed.

```markdown
# Lint Report: topic

- Date:
- Scope:
- Commands:

## Findings

| Severity | Finding | Evidence | Suggested fix |
| --- | --- | --- | --- |
| P2 | ... | ... | ... |

## Fixes applied

- ...

## Follow-up

- ...
```

Log significant repairs. A purely observational report may be linked from the log without rewriting knowledge pages.
