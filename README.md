# personal-portfolio

My personal portfolio site: a single static page with a light mission-control theme, built with [Astro](https://astro.build). No UI framework, just Astro components, plain CSS and a little TypeScript.

## Running it

Requires Node 22.12+.

```sh
npm install
npm run dev      # dev server at http://localhost:4321
npm run build    # static site in ./dist
npm run preview  # serve the production build
```

## Editing content

All the copy lives outside the components:

| What | Where |
| --- | --- |
| Name, tagline, availability, resume and profile links | `src/data/site.ts` |
| About text and its opening statement | `src/data/about.md` (conventions at the top of `About.astro`) |
| The climbing clip card in About | `src/content/clip.md` |
| Projects, one file each | `src/content/projects/*.md` |

The fields for projects and the clip are checked against the schemas in `src/content.config.ts`.

**Adding a project:** create `src/content/projects/<slug>.md` with `number` (the display order), `title`, `status` (`liftoff`, `in-orbit` or `decommissioned`), a one-sentence `summary` and a `stack` list. To show an image on the card, put it in `src/assets/projects/` and add a `display` block with `image` and `alt` (plus optional `position` and `zoom` to frame a busy screenshot). Set `draft: true` to hide a project.

## Files not in the repo

These are gitignored and mounted into the server's container at deploy time. The page works without them: the missing pieces hide themselves.

- `public/Eli-Rose-Resume.pdf`: the resume the hero button links to
- `public/videos/`: the climbing clip and its poster (paths set in `clip.md`)
- `public/status.json`: `{ "started": "<ISO date>" }`, written when the container starts; drives the uptime readout. Create one by hand to see it locally.

## Brand art

The name, the logo and the section headings are set in Mission Control DCU. Its license allows images of the font but not embedding it, so they're pre-rendered PNGs. After changing any of them, re-run:

```sh
python3 scripts/render-art.py   # needs Pillow, and the font in design/fonts/ (not in the repo)
```

It also draws the rocket used in the logo, the favicons and the About card from one set of coordinates, and writes that outline to `src/assets/rocket.json`.

## Layout

```
src/
  pages/index.astro       the page: Nav, Hero, Missions (projects), About, Footer
  layouts/Layout.astro    <head>, fonts, metadata
  components/
    ConsoleCard.astro     the card shared by projects and the clip (tab, frame, screen, text)
    MissionCard.astro     a project on that card
    ClipCard.astro        the climbing clip on that card, plus the landed rocket
    Footer.astro          live telemetry (ISS, Voyager 1, server uptime)
    ...
  scripts/                client-side helpers (rocket launch, live readouts)
  styles/global.css       design tokens and the few shared classes
scripts/render-art.py     renders the brand art
```
