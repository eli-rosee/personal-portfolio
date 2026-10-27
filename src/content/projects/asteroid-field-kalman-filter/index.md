---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "Asteroid Kalman Filter"
number: 2
status: in-orbit
summary: A spaceship stranded in an asteroid field needs to localize all asteroids in order to find its way home.
stack: [Python, Kalman Filter, State Estimation, Gaussian Filtering]

# display (delete for no signal)
#   fit:
#     crop (default)
#     whole
#   crop:
#     center (default)
#     top
#     bottom
#     left
#     right
#     top left
#     top right
#     bottom left
#     bottom right
#     x% y%
#   effects:
#     true (default)
#     false
#   zoom: 1 and up

display:
  image: display.png

# code (one or neither)
#   repo: <url> (default)
#   private: <tooltip>

repo: https://github.com/eli-rosee/asteroid-field-kalman-filter

# readouts (up to 4)
#   note

readouts:
  - label: My role
    value: Role
  - label: Team
    value: Solo
  - label: When
    value: Sept 2026

statement: One line, with *one phrase* in amber.

# media (in order)
#   type:
#     video
#       thumbnail
#       sound:
#         true (default)
#         false
#     clip
#       file:
#         .mp4
#         .webm
#         .gif
#       shape:
#         landscape (default)
#         portrait
#     image
#       shape:
#         landscape (default)
#         portrait
#       fit, crop, zoom: as in display
#     slides
#       folder
#       pdf
#     link
#       href or file
#       live:
#         false (default)
#         true
#       label
#   every card
#     caption
#     wide:
#       false (default)
#       true
#   image, clip, video, slides
#     effects:
#       false (default)
#       true

media:
  - type: video
    file: demo.mp4
    title: Demo

# draft
#   delete to publish

draft: true
---

<!--
write-up (files go in assets/)
  ## Heading
  **bold**
  [text](url "tooltip")
  - list
  1. steps in order (numbered 01, 02, …)
  - **Label:** text (the gap after the colon is set by the site)
  blank line = new paragraph; extra blank lines or spaces add nothing
  &ensp; or &emsp; = a one-off wider space
  line\ (line break)
  ![alt](file "caption") on its own line
    2–3 in a row sit side by side
    {effects=true} right after it adds the image effects

writing
  4–5 sections, 80–200 words each, 400–750 in all
  depth over breadth: the first lines carry the skim, the paragraphs carry the detail
  first paragraph = the takeaway: one sentence
  one idea per paragraph, 2–4 sentences
  "I" for what you did, "we" only for the team
  numbers over adjectives: a count, a time, a size or a score beats "fast" or "robust"
  name what got worse, not only what got better
  a figure wherever words would take a paragraph

order
  My role · Context · Background (opt)
  The problem
  Goals (opt)
  Constraints (opt)
  Approach · How it works
  Alternatives considered (opt)
  The hard part · What went wrong · A bug worth mentioning
  What went well (opt)
  Where I got lucky (opt)
  Trade-offs (opt)
  Results · Outcome · Final result
  What I'd change · Future work
-->

## The Problem

While traveling through the solar system, the engine in a spacecraft sputters out.

Luckily, an asteroid field approaches, and you realize that you can use my spacecraft to hop (scotch) from asteroid to asteroid in order to get back to Earth.

Now asteroid hopping is a tricky operation. Missing a jump will send you flying out into deep space, and our rocket has a limited jump window. Attempting to jump outside of this will result in becoming a castaway forever.

And to top it all off, we only have 400 days (timesteps) of supplies on board (with heavy rationing).

## Approach

For this problem, we are provided with the asteroids' position (x, y) at every timestep.

These asteroids all have unknown velocities and accelerations associated with them. Using a Kalman Filter for each asteroid, we are able to predict what the most likely velocity and acceleration is for each individual asteroid, and update our belief based on both prediction and measurement.

For Part B, we have to take these measurements,

## The core algorithm


## Where I went wrong

Biggest bug was hopping around near the border of the Earth.

## Results

My filter scored 30 out of 32 on the autograder.

**15/15 in Part A, and 15/17 in Part B**. A 100% required 15/15 in Part A, and 15/17 in Part B, which I hit on the nose. These results can differ depending on the specific test suite used.
