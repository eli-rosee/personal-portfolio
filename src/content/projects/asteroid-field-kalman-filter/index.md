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

draft: false
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

## The problem

While traveling through the solar system, the engine in our spacecraft sputters out.

Luckily, an asteroid field is approaching, and we realize the spacecraft can hop (scotch) from asteroid to asteroid to get back to Earth. Asteroid hopping is a tricky operation, though. Missing a jump will send us flying out into deep space, and the rocket has a limited jump window. **Attempting a jump outside of it means becoming a castaway forever.**

To top it all off, we only have **400 days (timesteps) of supplies**.

## Approach

The approach I implemented was a Kalman filter, one for every asteroid.

At every timestep, we're given a noisy (x, y) measurement of every asteroid in the field. Each asteroid also has an unknown velocity and acceleration that the measurements never tell us directly. A Kalman filter is uniquely equipped for this job, as it can **estimate those hidden values from position alone**, while deciding how much to trust its own prediction versus each new noisy measurement.

In Part A, our goal was predicting where each asteroid would be one timestep in the future. While it wasn't perfect, my tracking was precise enough given enough time to converge on each asteroid.

![](part_a_success.mp4 "Part A: tracking every asteroid")

In Part B, those predictions were used to **decide which asteroid (if any) to jump to** at each timestep in order to reach home, which is the upper boundary of the window.

![](part_b_success.mp4 "Part B: hopping home")

## The math

The Kalman Filter's magic can be broken down into just a few simple Linear Algebra equations.

Each asteroid's state is its position, velocity, and acceleration in both axes:

    x = [x, y, vx, vy, ax, ay]ᵀ

Movement follows constant-acceleration kinematics (x + vΔt + ½aΔt²), which gets packed into a state transition matrix **F**. Since we only ever measure position, the measurement matrix **H** just pulls x and y out of the state.

    Predict:  x = F x
              P = F P Fᵀ + Q

    Update:   y = z − H x          (how far off the prediction was)
              S = H P Hᵀ + R
              K = P Hᵀ S⁻¹         (Kalman gain)
              x = x + K y
              P = (I − K H) P

**P** is our uncertainty, **Q** is the process noise, and **R** is the measurement noise. The Kalman gain **K** is how weighting gets decided. When we're uncertain in our state estimate, it values the measurement higher, and when we're confident, it values the prediction.

## The core algorithm

Before the first timestep, every asteroid is initialized with its own Kalman filter.

This was set to the (x, y) of its first measurement with velocity and acceleration at 0. The filter converges closer to the actual values after several timesteps.

Every timestep, the following steps were taken:

1. **Update:** Each asteroid's measurement is used to update its filter's belief. Because the measurement is noisy, we can't fully trust it, but we can't fully trust our prediction either. That's where Kalman Gain is used.
2. **Predict:** Each asteroid is predicted exactly one timestep into the future.
3. **Jump (Part B only):** The ship chooses the asteroid predicted to be closest to the top-middle point 5 timesteps from now, as long as it's within a certain level of padding from the boundaries.

## Where I went wrong

My biggest bug was **hopping around just short of the finish line**.

Every time the ship got close to home, it would keep jumping between asteroids that were closer to the top-middle point in 5 timesteps, but it would never actually want to cross the finish line. To fix this, I used a **moving finish line**. Once the ship got close enough, the goal target was then set past the boundary, so crossing it became the best option.

Some runs also failed simply from **running out of supplies before reaching home**. In this run, the algorithm got unlucky with its field of asteroids. They were pretty sparse, and a lot of the ones that fell into the ship's jump window had downward momentum. Despite this, the ship was still making progress, and it most likely would have made it home given a bit more supplies.

![](failed_too_slow.mp4 "A failed run: out of supplies")

## Results

My filter scored 30 out of 32 on the autograder.

**15/15 in Part A, and 15/17 in Part B**. A 100% required 15/15 in Part A and 15/17 in Part B, which I hit on the nose. These results can differ depending on the specific test suite used.
