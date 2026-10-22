---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "Lunar Lander Autopilot"
number: 1
status: liftoff
summary: A made-up autopilot that lands a simulated lunar module with a PID controller and a Kalman-filtered altimeter.
stack: [Python, NumPy, SciPy, Matplotlib]

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
#   zoom: 1 and up
#   effects:
#     true (default)
#     false

display:
  image: display.png
  crop: 50% 60%

# code (one or neither)
#   repo: <url> (default)
#   private: <tooltip>

repo: https://github.com/eli-rosee/lunar-lander-autopilot

# readouts (up to 4)

readouts:
  - label: My role
    value: Controls · Estimation
    note: Wrote the controller and the filter
  - label: The team
    value: 3 students
    note: For a made-up course
  - label: Timeline
    value: Jan 2026 → Mar 2026
    note: 10 weeks

statement: Teaching a simulated lander to *touch down softly* on noisy sensors.

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
#       pdf
#     link
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
    file: demo.webm
    thumbnail: demo-poster.png
    title: Demo
    caption: The final run, start to touchdown.
    wide: true
  - type: clip
    file: clip.webm
    title: Hover test
    caption: Holding altitude against a gust.
  - type: clip
    file: climb-test.webm
    shape: portrait
    title: Phone clip
    caption: A tall clip, filmed on a phone.
  - type: image
    file: photo.png
    effects: true
    title: Bench rig
    caption: With the screen effects on.
  - type: image
    file: leg-2.png
    shape: portrait
    title: Leg test 2
    caption: A portrait card, two rows tall.
  - type: image
    file: before.png
    fit: whole
    title: Before tuning
    caption: A 4:3 image shown whole.
  - type: slides
    folder: slides/
    pdf: deck.pdf
    title: Final presentation
    caption: Five slides, made up.
  - type: link
    href: https://example.com
    live: true
    title: Live site
  - type: link
    file: report.pdf
    title: Final report
  - type: link
    href: https://example.com/paper
    label: Paper
    title: The paper it's based on

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
  line\ (line break)
  ![alt](file "caption") on its own line
    2–3 in a row sit side by side
    {effects=true} right after it adds the image effects

writing
  5–7 sections, 40–100 words each, 250–600 in all
  first paragraph = the takeaway: one sentence, set a size up; **bold** its key fact
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

## My role

I owned the lander's brain: the **controller** that sets the throttle and the **estimator** that tells it where it is.

My two teammates built the physics sim and the plots; I wrote the tuning sweeps that tied the pieces together.

## The problem

A lander falling from **2 km** has one tank of fuel and an altimeter that lies by up to 15 m.

It has to touch down under **1 m/s** without running dry, and it can't trust any single reading to get there.

![The filter's estimate over the raw altimeter](estimate.png "The Kalman estimate (amber) over the raw readings")

## Approach

A Kalman filter cleans up the altitude, and a PID controller flies on the clean number.

The filter fuses the noisy altimeter with the accelerometer, which drifts but doesn't jump; together they're better than either. Try it in the [live sim](https://example.com "Opens the browser version").

- **Controller:** PID on vertical speed, with anti-windup.
- **Estimator:** a two-state Kalman filter (altitude, speed).
- **Tuning:** a sweep over 400 simulated landings.

![Before tuning](before.png "Before tuning")
![After tuning](after.png "After tuning"){effects=true}

## The hard part

Tuning for a soft landing made the lander burn fuel it didn't have.

Every gain that cut the touchdown speed also made the throttle twitch on sensor noise, and twitching is expensive. Lowering the filter's trust in the altimeter near the ground fixed both.

![Leg test one](leg-1.png "Leg test 1")
![Leg test two](leg-2.png "Leg test 2")
![Leg test three](leg-3.png "Leg test 3")

## Results

**391 of 400** simulated landings touched down under 1 m/s, averaging 0.6 m/s with 18% fuel left.

The nine failures all started with a gust in the last 50 m.

![The lander touching down](touchdown.gif "Touchdown, as a GIF")

![The descent](descent.webm "The descent, as a looping clip")

![A phone clip](climb-test.webm "A tall clip in the write-up")

## What I'd change

I'd model gusts in the filter instead of treating them as noise.

All nine failures were gusts the filter averaged away; a third state for wind would have seen them coming. I'd also tune on fuel left, not just landing speed.
