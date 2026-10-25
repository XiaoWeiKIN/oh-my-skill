---
name: markdown-translation-cn
description: Translate an existing Markdown document into polished Simplified Chinese while preserving structure, links, images, code blocks, and frontmatter, then delete the original after self-check passes unless the user asks to keep it. Use when the user asks to translate a Markdown article or note into Chinese, especially when they require full-document coverage, strict preservation of resources, title hierarchy cleanup, output as *_CN.md, source cleanup, or explicit self-checks on length and links.
---

# Markdown Translation CN

Use this skill when the user wants a Markdown file translated into Simplified Chinese with strict formatting preservation.

## Workflow

1. Locate the target Markdown file and read the full document.
2. If the file is longer than 800 lines, read it in chunks until the entire file is covered.
3. Do not summarize or skip sections during reading or translation.
4. Write the translated file next to the source file, using the name `original_filename_CN.md`.
5. Run a self-check before finishing.
6. After the self-check passes, delete the original source Markdown file unless the user explicitly asked to keep it.

## Translation Rules

### Frontmatter

- Preserve the frontmatter structure exactly.
- Translate only `title` and `description`.
- Preserve `tags`, `source`, and other fields as-is unless the user explicitly asks otherwise.

### Terminology

- Keep terminology consistent across the document.
- Preserve key domain and technical terms in the form `中文（English）` on first mention. This is required for important concepts, product/domain nouns, feature names, architecture components, workflow names, standards, roles, and abbreviations (for example: `软件目录（Software catalog）`, `自助服务工作流（Self-service workflows）`, `黄金路径（Golden paths）`, `基于角色的访问控制（Role-Based Access Control，RBAC）`).
- After the first bilingual mention, use the Chinese term, the abbreviation, or the English term according to readability and local convention; do not repeat the English gloss on every occurrence unless needed for clarity.
- It is acceptable to keep the original English term when translation would make it less precise.

### Code And Commands

- Do not translate fenced code blocks.
- Do not translate inline code identifiers, commands, paths, flags, env vars, SQL, or config keys.
- Comments inside code blocks may be translated only if the user explicitly wants that.

### Links And Media

- Preserve every original Markdown link, image, gif, and video-cover link.
- Keep resource ordering and placement aligned with the source.
- Never drop links or images because the document is long.

### Byline Cleanup

- Remove non-content author cards from the document body when they appear before the substantive article text and consist only of author headshots, repeated names, and job titles.
- Preserve the `author` field in frontmatter. Keep product screenshots, diagrams, illustrations, and any image that carries article content.
- Record the number of removed author headshots as an intentional image-count difference in the self-check and final response.

### Structure And Formatting

- Ensure the final document has exactly one H1.
- Normalize the remaining headings to a clean hierarchy.
- Preserve lists, blockquotes, emphasis, and inline formatting unless a small adjustment improves readability without losing meaning.
- Convert comparison-heavy or parameter-heavy sections into Markdown tables when it improves readability.
- Convert important notices, warnings, and tips into blockquotes when appropriate.

## Output Rules

- Save the result in the same directory as the source file.
- Use the filename pattern `*_CN.md`.
- Keep the translated document close in size to the original. It should not shrink drastically.
- Delete the original source file only after the translated file exists and all self-checks pass.
- If any self-check fails, keep the original file and explain what needs attention.
- If the source is already a `*_CN.md` file, do not delete or overwrite it unless the user explicitly asks.

## Self-Check

Before responding:

1. Compare source and translated file sizes.
2. Verify image counts match after excluding intentionally removed author headshots; report any intentional difference and its reason.
3. Verify Markdown link counts match, or explain any intentional difference.
4. Confirm the translated file has exactly one H1.
5. If the source was chunk-read, make sure every chunk was processed.
6. Delete the original source file only after steps 1-5 pass; then confirm the original path no longer exists.

## Response Style

In the final response, briefly report:

- the output file path;
- that the full document was translated;
- the self-check result for size, images, and links;
- any removed non-content author cards;
- whether the original source file was deleted or intentionally kept.
