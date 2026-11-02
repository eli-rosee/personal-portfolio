# Project guide

Reference for a project's `index.md`.

## Start

```
npm run new-project "Project Title"
```

Makes `src/content/projects/<slug>/` with an `index.md`, an empty `assets/` folder for its files, and the title art. The project starts as a draft: it shows in `npm run dev`, but not on the deployed site.

- **Files** go in `assets/`. Fields name them relative to that folder: `demo.mp4`, `slides/`.
- **Clips and videos:** run `npm run media` to compress them and make their posters.
- **Slides:** `npm run slides <slug> deck.pptx` exports the folder of slides and the PDF.
- **Renamed the title?** Rename the folder too (it's the page's address), then `npm run art`.
- **Publishing:** delete `draft: true`, then run `npm run build`. A published project with a missing file stops the build and names the file.

## Fields, in order

**title** · **number** (mission number, also the order) · **summary** (one or two sentences, on the card) · **stack** (`[Python, C++]`)

**status**
- `liftoff`: in development
- `in-orbit`: done
- `decommissioned`: no longer maintained

**display**: the card's screen, and the project page's when there are no highlights. Leave it out for "no signal".
- `image`
- `fit`: `crop` (default) or `whole`
- `crop`: `center` (default), `top`, `bottom`, `left`, `right`, `top left`, `top right`, `bottom left`, `bottom right`, or `x% y%`
- `zoom`: 1 and up
- `effects`: `true` (default) or `false`

**highlights**: what Media shows, up to four, in the order listed: the first shown large, the rest in a row under it. Each is a file from `media` or a figure in the write-up, and opens in the theater; a video or clip gets a play button. Media has no heading: the hook leads into it.
- `screen`: the highlight playing on the top card's screen in place of the display (default: the first).
- The names come from each item's `title` (or a figure's caption) and show on one line, so keep them short; a long one ends in "…".

```yaml
highlights:
  - slides/
  - demo.mp4
  - lap-data.mp4
screen: demo.mp4
```

**Code** (one or neither)
- `repo: <url>`: the Repo button
- `private: <tooltip>`: a "Code on request" button

**readouts**: up to four, each a `label` and `value` (optional `note`)

**media**: what highlights pick from, plus links. Links show as full-width bars under the screens, in this order.
- `video`: `file`, `title`; optional `thumbnail`, `sound: false`
- `clip`: `file` (`.mp4`, `.webm`, `.gif`), `title`
- `image`: `file`, `title`
- `slides`: `folder`, `pdf`, `title`
- `link`: `href` or `file`, `title`, `label` (the bar's tag: "PDF", "YouTube"); `live: true` makes it the hero's Live site button instead
- any of them: `caption` (shown in the theater)

**draft**: `true` hides it from the built site; delete to publish.

**achievement**: the best result, one grey line under the statement. Quote it if it has a colon.

**statement**: one line, with `*one phrase*` in amber. It sits above Media.

## The write-up

Everything after the second `---`.

- `## Heading` starts a section
- `**bold**`, `[text](url "tooltip")`
- `- list` · `1. steps` (numbered 01, 02, …) · `- **Label:** text`
- A blank line starts a new paragraph; extra blank lines or spaces add nothing
- `&ensp;` or `&emsp;` for a one-off wider space; `line\` for a line break
- `![alt](file "caption")` on its own line is a figure; two or three in a row sit side by side
  - `{effects=true}` right after it adds the screen effects
  - `{values=N}` right after a clip adds a count of N values and a progress bar
- Code in a fenced block, with options after the language: `title="backend"`, `file=path/in/repo.py lines=151-162` (links to it on GitHub), or `link=repo`
- A file tree in a ` ```tree ` block, one file a line: its branch drawing (`├─ `, `└─ `, `│  `), the name, then two or more spaces and a short comment (a few words; it sits in its own column, and under the name on phones)
- Equations in a ` ```math ` block, one a line: `Label:  x = F x    (note)`
- Exponents, subscripts and fractions: `n^2`, `10^-8`, `n_2`, `v_x`, `{1/2}`
  - Braces for anything longer: `x^{n+1}`, `S_{xy}`, `{n+1/2}`
  - In backticks they stay as typed, and `file_name`, `x_1.py` and `15/17` are left alone
  - They work in the write-up, equations, summary, statement, achievement and captions. In a field, quote a line that starts with `{`

**Suggested sections, in order** (pick what fits): Background · The problem / The prompt · Approach / What we built · The core algorithm · My role (team projects) · Where I went wrong · Results · Awards
