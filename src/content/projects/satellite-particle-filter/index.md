---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "Satellite Particle Filter"
number: 1
status: in-orbit
summary: A particle filter that finds a lost satellite within 0.01 AU from noisy gravity and light readings.
stack: [Python, Particle Filters, Bayesian Estimation, Monte Carlo]

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

display:
  image: project_image.png
  crop: right
  zoom: 1.3

# code (one or neither)
#   repo: <url> (default)
#   private: <tooltip>

private: Private per course policy

# readouts (up to 4)
#   note

readouts:
  - label: OMSCS Course Project
    value: 'Robotics: AI Techniques'
  - label: Team
    value: 'Solo'
  - label: When
    value: Oct 2026

statement: Mission control has *300 days* to find the intergalactic heroes after a wormhole jump.

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

  - type: link
    file: project_outline.pdf
    title: Project Outline

# draft
#   delete to publish

draft: false
---

<!--
write-up (files go in assets/)
  ## Heading
  **bold**
  [text](url "tooltip")
  - list
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

## The problem

I built a particle filter that finds a lost satellite to within **0.01 AU**.

The satellite could be anywhere in an **8 × 8 AU** box around the sun. **Nothing tells the filter where it is.** All it gets each timestep is a sensor reading, plus the steering and distance the satellite just flew.

- **Part A:** a single gravimeter reading, the combined pull of every planet.
- **Part B:** the percent illumination of each planet as seen from the satellite.

Part B has the added challenge of transmitting an **SOS message** to the home planet. Only after **10 successful transmissions** can the crew fully relay their position.

The budget is tight. The crew's supplies last **300 days**, one timestep each, and the whole test case gets **15 seconds** of CPU. A test passes only when the estimate lands inside 0.01 AU with **both limits met**, or in Part B, once all 10 transmissions are through.

## How it works

One loop per timestep: **weigh, resample, fuzz, move, estimate**.

It starts with **2,000 particles** scattered uniformly across the box, each one a guess at (x, y, θ). Every heading begins tangent to a circle around the sun, θ = atan2(y, x) + π/2, so each particle starts out **already in orbit** instead of wasting steps learning which way to fly.

- **Weigh:** A **Gaussian likelihood** compares each particle's predicted reading with the real one.
- **Resample:** Sebastian Thrun's **resampling wheel** draws the next generation in O(N), versus O(N log N) for ordinary weighted sampling.
- **Fuzz:** Only duplicates get jittered, by up to ±0.05 AU and ±0.03 rad. **The originals hold their ground** while the copies explore.
- **Move:** Every particle advances with the **kinematic bicycle model**.
- **Estimate:** The **cloud's mean** is the answer. In Part B, an atan2 from it to the home planet gives the SOS bearing.

The motion model is the core of the filter. **The satellite is simulated as a bicycle**, and every particle moves through the same five equations each step:

- **Turning radius:** R = L / tan(α). The ship's length L and the steering angle α set how tight the turn is.
- **Center of the turn:** cx = x − R sin θ, cy = y + R cos θ. Step R from the particle, perpendicular to its heading, to find the circle it's turning around: **the sun**.
- **Arc angle:** β = d / R. How far around that circle a step of distance d carries it.
- **New position:** x′ = cx + R sin(θ + β), y′ = cy − R cos(θ + β). The point β further around the circle.
- **New heading:** θ′ = (θ + β) mod 2π. The heading turns by the same angle, wrapped to one revolution.

Put the sun at the center of that circle and the orbit falls right out. **An orbit, it turns out, is just a very long left turn.**

<!--
  GIF slot: one full run, the particles closing in on the satellite
-->

## What went wrong

The likelihood's **standard deviation** was the hardest part to get right.

My first value was sized for ordinary numbers, and gravity at interplanetary distances is **anything but**. Every particle's likelihood came out **nearly identical**. The weights went flat, resampling degenerated into a **random shuffle**, and the cloud drifted wherever the noise took it.

Too tight fails just as badly, in the other direction. A handful of particles take all the weight, the rest round to zero, and the cloud **collapses onto one wrong guess** before it has looked around.

The fix was **matching the deviation to each sensor's scale**. Part A only converged at a variance of **10⁻¹³**. Illumination runs from 0 to 100, so Part B operated well at **10**.

That's the same filter, tuned **14 orders of magnitude** apart. If Part A's variance were **a millimeter**, Part B's would stretch **two-thirds of the way to the sun**.

<!--
  GIF slot: variance set wrong vs. tuned
  GIF slot: initial sd set wrong vs. tuned
-->

## Trade-offs

I **pared** the particle count down from **2,000** to **250**.

Each timestep sheds 100 particles until it hits the floor. The filter spends its CPU early, when it knows the least, and coasts once the cloud has settled. **That speed has a cost.**

The cloud commits fast. If it pares down while it's still far from the satellite, **there's no way back**: with only ±0.05 AU of fuzz, the survivors can't jitter far enough to find the true position again.

<!--
  GIF slot: a failed test case, the cloud pared down in the wrong place and unable to recover
-->

**I also got lucky with the grader.** It only counts total time, so spending it unevenly cost nothing. A real flight computer runs on a fixed cycle where every step gets the same budget, and **this shortcut wouldn't fly**.

## Results

**18 of 20** on the autograder: 8 of 10 in Part A, all 10 in Part B.

Passing took **7 of 10** in each part, so both cleared the bar.

**Those numbers aren't fixed.** The filter is random by design, the autograder's test cases differ from the local ones, and a slower CPU leaves less headroom under the 15-second limit. The same code can pass a case on one run and **miss it on the next**.

If I did it again, I'd change two things:

- **Fuzz only a fraction:** Duplicates are identical, so jittering every one of them **injects randomness right when the filter is trying to converge**. Even with the cloud almost on top of the satellite, it can take several steps to close in. Fuzzing a fraction would let the converged particles stay put.
- **Add threading:** Splitting the work across threads would fit **more particles under the CPU limit**, so the filter could account for more possible positions before it converges for good.
