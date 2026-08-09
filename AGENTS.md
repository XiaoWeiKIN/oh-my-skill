# Repository Guide

This repository is the canonical source for the owner's reusable Codex skills.

## Layout

- Store each skill under `skills/<skill-name>/`.
- Keep the required instructions in `SKILL.md`.
- Keep deterministic helpers in `scripts/`, conditional guidance in `references/`, and UI metadata in `agents/openai.yaml`.
- Do not commit `.DS_Store`, `__pycache__`, bytecode, or installed skill copies.

## Change workflow

1. Read the target skill and every reference required by the task.
2. Use the `skill-creator` workflow for new skills or substantial updates.
3. Edit the canonical repository copy first. Treat `~/.codex/skills` and project-local copies as deployment targets.
4. Add or update deterministic tests for script behavior.
5. Run the skill validator and relevant tests before committing.
6. Use `scripts/sync_skill.py` to install or compare deployment copies.

## Validation

For `llm-wiki-maintainer`, run:

```bash
python3 -m py_compile skills/llm-wiki-maintainer/scripts/*.py scripts/sync_skill.py
python3 -m unittest discover -s skills/llm-wiki-maintainer/tests -v
```

Also run the current Codex `skill-creator` `quick_validate.py` against the changed skill directory.
