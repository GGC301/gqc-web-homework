# AGENTS.md

## What this repo is

Static, build-less HTML coursework for 《高级网页设计》(advanced web design class). Pure hand-written HTML/CSS/JS.

- **No** package.json, bundler, linter, formatter, tests, CI, or dev server. Do not add tooling or run build/test commands — there are none.
- Verify changes by opening the file in a browser (`file://` works; all paths are relative) and checking links/images render.
- Git: branch `master` has **no commits** and **no remote**; everything is untracked. Do not commit unless explicitly asked.

## Layout

- Repo root: early exercises `2-1.html`, `2-2.html`, `2-21.html`.
- `tupian/` ("图片"/images) is the **main page set**, not an image-only folder: all numbered exercises (`3-1.html` … `11-1.html`), `elements.html`, and the nav hub `tupian/index.html`.
- `tupian/img/*.jpg` — photos used by pages in `tupian/`. Two stray `.webp` files live directly in `tupian/` and are referenced from the **root** pages as `./tupian/*.webp`.
- `tupian/css.css` — the only external stylesheet; only `tupian/5-1.html` uses it. Every other page styles itself with an inline `<style>` block (that is the house style — keep it).

Paths are relative and pages are opened directly from disk. Moving or renaming a file means updating every referring page.

## Hard rules from the assignment prompt

The task prompt is embedded verbatim in `tupian/index.html` (and must stay there). It requires:

- **Native code only, no CDN** — no external libraries, frameworks, or web fonts. Use system font stacks (`"Microsoft YaHei", sans-serif` etc.). Local `<img>` only.
- The new index page must link **every HTML page in its own directory** and restate the prompt on the page.

Consequence when adding a page inside `tupian/`: also add a card link in `tupian/index.html`. It currently links only `3-1`…`9-1` + `elements.html` — `10-1`…`10-4` and `11-1` are missing.

## Naming & logging rules (user-mandated)

- **Every CSS class name, every `id`, and every JS variable must start with `yuan_`** (e.g. `class="yuan_card"`, `id="yuan_grid"`, `let yuan_count`). No exceptions in code you write or edit. Existing pre-2026-10 pages predate this rule and have not been renamed — do not mass-rename unless asked, but never add a new unprefixed name.
- **Before executing any prompt, append an entry to `yuan_prompt.md`** (append mode, UTF-8, never rewrite existing entries) containing: local timestamp, model ID (e.g. `opencode/mimo-v2.6-flash-free`), and the verbatim prompt text in a fenced block. `yuan_prompt.md` already exists — append, don't overwrite.

## Known defects (fix, don't propagate)

- **`tupian/4-2.html` is corrupted**: lines 1–377 are a leaked AI transcript, and the actual page is wrapped in a markdown fence ```` ```html ```` from line 378 to the closing fence at line 1114. It does not render. Repair = delete the transcript preamble and unwrap the fence; do not treat its content as valid.
- **`tupian/css.css`** has a typo: `ext-align: center;` → `text-align: center;`.
- **`tupian/7-1.html` and `7-2.html`** hotlink `https://picsum.photos/...` images — external, broken offline, and against the no-CDN rule. Prefer `./img/*.jpg`.

## Conventions

- Save all files as **UTF-8**. Pages are largely `lang="zh-CN"` with Chinese content; PowerShell reads them as mojibake without `-Encoding UTF8`. Never re-encode to ANSI/GBK.
- File naming is `N-M.html` (practice N, part M) — follow it for new exercises; keep the `<meta charset="UTF-8">` + viewport head.
- No JS build step; inline `<script>` is fine and used where dynamic behavior is needed.
