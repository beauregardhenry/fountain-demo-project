# Editing the tour's words

Every chapter is one file in `content/chapters/`. Edit it in any text editor,
or directly on GitHub (open the file, click the pencil icon). Refresh the
browser to see the change.

## The shape of a chapter file

```markdown
# Chapter title

## Story

The plain-English explanation. Blank lines separate paragraphs.

## Takeaway

The one sentence you want an investor to remember.

## Under the hood

- Technical detail, as a bulleted list.

[[verify: A note about a claim that still needs checking.]]
```

Keep the three `##` headings spelled exactly as above; the tour uses them to
decide what goes where. **Under the hood** is optional (the welcome and
closing chapters don't have one).

## Formatting you can use

| You type | You get |
|----------|---------|
| `**words**` | **bold** |
| `*words*` | *italics* |
| `` `words` `` | `code style`, for API names |
| `[label](https://…)` | a link |
| `- item` at the start of a line | a bulleted list |
| `1. item` at the start of a line | a numbered list |

## Verify notes

Write `[[verify: …]]` next to any claim you're not sure of. While the tour is
in draft mode, these show up in a yellow box under the chapter; they never
appear in the story text itself. Before presenting, resolve every note, then
set `"draft": false` in `content/tour.json` to hide them and the Draft badge.

## Changing the order or adding a chapter

`content/tour.json` lists the chapters in order. Each entry has an `id` (used
in the web address, like `#parking`), the chapter `file`, and optionally a
`recording` for the demo panel. A chapter without a recording shows the story
across the full width.
