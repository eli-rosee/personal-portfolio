---
title: "Lunar Lander Autopilot"
number: 1                 # order on the home page
status: liftoff           # liftoff (in progress) · in-orbit (done) · decommissioned
summary: A made-up autopilot that lands a simulated lunar module with a PID controller and a Kalman-filtered altimeter.
stack: [Python, NumPy, SciPy, Matplotlib]

display:
  image: display.png
  alt: The lander's altitude against range, the filtered path in amber
  crop: 50% 60%
  readout: Sim run 42

repo: https://github.com/eli-rosee/lunar-lander-autopilot

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

media:
  - type: video
    file: demo.webm
    poster: demo-poster.png
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
    alt: The bench rig
    title: Bench rig
    caption: Lorem ipsum dolor sit amet.
  - type: image
    file: leg-2.png
    alt: The second leg test
    shape: portrait
    title: Leg test 2
    caption: A portrait card, two rows tall.
  - type: image
    file: before.png
    alt: The descent before tuning
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
    screenshot: site.png
    label: Live site
    title: Live site
    caption: example.com · a browser version of the sim
  - type: link
    file: report.pdf
    title: Final report
  - type: link
    href: https://example.com/paper
    label: Paper
    title: The paper it's based on

draft: true
---

## My role

I wrote the **controller** and the **state estimator**, and ran the tuning sweeps. Lorem ipsum dolor sit amet.

## The problem

The lander starts **two kilometres up**, falling, with a noisy altimeter and a limited tank. The goal: touch down under **1 m/s** without running dry. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.

![The filter's estimate over the raw altimeter](estimate.png "The Kalman estimate (amber) over the raw readings")

## What I built

A PID controller on the throttle, fed by a Kalman filter that fuses the altimeter with the accelerometer. See the [live sim](https://example.com "Opens the browser version") for yourself.

- **Controller:** PID on vertical speed, with anti-windup.
- **Estimator:** a two-state Kalman filter.
- **Tuning:** a sweep over 400 simulated landings.

![Before tuning](before.png "Before tuning")
![After tuning](after.png "After tuning")

## Testing

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

![Leg test one](leg-1.png "Leg test 1")
![Leg test two](leg-2.png "Leg test 2")
![Leg test three](leg-3.png "Leg test 3")

A GIF and a looping clip, each on its own:

![The lander touching down](touchdown.gif "Touchdown, as a GIF")

![The descent](descent.webm "The descent, as a looping clip")

![A phone clip](climb-test.webm "A tall clip in the write-up")

## What I learned

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
