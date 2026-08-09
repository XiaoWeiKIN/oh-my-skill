# Note Schemas

Use these schemas when creating or substantially restructuring durable notes in an Obsidian LLM Wiki. Keep frontmatter minimal and human-readable; do not invent fields the vault does not already use unless the task needs them.

## Contents

- Common principles
- Topic page
- Concept page
- Comparison or decision page
- Query note
- Source note
- Conversation source
- Index entry

## Common principles

- A durable note should answer "why this exists" in the first few lines.
- Prefer synthesis over extraction. Preserve raw quotations in source notes, not topic pages.
- Include provenance: link source files, legacy notes, articles, papers, or clippings that support the synthesis.
- Add outbound links to related concepts so the note is not a dead end.
- Keep headings stable and boring; they become navigation anchors.
- Add `as_of` and `review_after` only when a claim can age.
- Add `supersedes` only when the new page or judgment explicitly replaces an older one.
- Store multi-page source compilation in `compiled_to` as a list.

## Topic page

Use for broad, evolving areas such as AI observability, ClickHouse storage, or architecture practices.

```markdown
# 主题名

## 核心判断

- ...

## 主题地图

- [[相关概念]]
- [[对比分析]]

## 关键问题

### 问题一

...

## 资料与证据

- [[source note or path]]

## 待更新

- ...
```

## Concept page

Use for reusable concepts that appear across sources.

```markdown
# 概念名

## 定义

...

## 为什么重要

...

## 与相近概念的区别

| 概念 | 区别 |
| --- | --- |
| [[概念A]] | ... |

## 使用场景

- ...

## 来源

- ...
```

## Comparison or decision page

Use for durable comparisons, trade-off analysis, and user-facing judgments.

```markdown
# A 与 B 的取舍

## 结论

...

## 对比维度

| 维度 | A | B | 判断 |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

## 适用条件

- ...

## 风险与未知

- ...

## 参考资料

- ...
```

## Query note

Use when a user question or conversation produces a durable answer, judgment, or workflow decision worth reusing later. Query notes are not source notes; they preserve the answer's distilled judgment, not the full chat transcript.

Recommended path:

```text
_wiki/<Domain>/Questions/<Question Title>.md
```

```markdown
---
type: query-note
status: seed
created: YYYY-MM-DD
updated: YYYY-MM-DD
answered_from:
  - _wiki/Domain/Related.md
as_of:
review_after:
supersedes:
---

# 问题标题

## 问题

...

## 结论

...

## 分析

...

## 来源

- [[相关 wiki 页面]]

## 后续问题

- ...
```

When `wiki_query.py` is available, create the scaffold with:

```bash
python3 -B /path/to/wiki_query.py new --vault "/path/to/vault" \
  --title "问题标题" \
  --domain "AI" \
  --topic "LLMWiki" \
  --source "_wiki/AI/AI 知识地图.md" \
  --index "_wiki/AI/AI 知识地图.md"
```

## Source note

Use only when preserving a single source in `_sources/` or a compatibility source area.

```markdown
---
type: source-note
status: to-ingest
source:
captured:
compiled_to:
source_sha256:
topics:
  - inbox
tags:
  - inbox
  - source
---

# 原始标题

- Source:
- Author:
- Date:
- Captured:
- Type:
- Status: raw | summarized | integrated

## 3-7 个要点

- ...

## 摘录

> Keep quotes short and clearly attributed.

## 可并入的主题

- [[主题页]]
```

## Conversation source

Use when preserving a ChatGPT, Claude, Codex, or other assistant conversation as raw source material. Store it under `_sources/inbox/` first, then archive to `_sources/conversations/YYYY-MM/` after compilation.

```markdown
---
type: conversation-source
status: to-ingest
platform:
source:
captured:
compiled_to:
review: true
topics:
  - inbox
tags:
  - inbox
  - conversation
---

# 对话标题

## 来源

- Platform:
- URL:
- Captured:
- Participants:

## 原始对话

### User

...

### ChatGPT

...

## Ingest 结果

- status: to-ingest
- compiled_to: []
- review: true
```

## Index entry

When adding a new durable page, add one concise entry to `Index.md` or the nearest topic map.

```markdown
- [[页面名]]：一句话说明它解决什么问题。
```
