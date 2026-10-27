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
stack: [Python, Particle Filter, State Estimation, Monte Carlo Sampling]

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

A galactic group of heroes has just warped back into our solar system.

It is our job, as mission control, to locate their spaceship for recovery. We are given limited resources to do so (we have government funding to thank for that), and only get **15 seconds of CPU time to localize within 0.01 AU of the ship**. The grid is 8 AU x 8 AU, and the crew only has 300 days of supplies to survive on their own, giving us 300 attempts at localization.

## Approach

The approach I implemented was a particle filter.

In Part A of this project, I developed an algorithm to localize the crew based on the gravity forces their ship was experiencing. Because a single gravity reading could match many different locations, a particle filter is uniquely equipped for this job, as it can **simultaneously track all possible locations of the ship**. If a Kalman filter were used, it would most likely converge on a single, incorrect guess.

![](part_a_success_1.mp4 "Part A: localizing from gravity")

In Part B, it was also a localization challenge, but we additionally had to calculate the bearing to our home planet (using atan2) and **send 10 successful transmissions to mission control**. This had the added challenge of localizing based on the percent illumination of each planet, as seen from the ship, forcing me to combine the error from each planet's observed illumination into a single weight for each particle.

![](part_b_success_2.mp4 "Part B: localizing from planet illumination")

## The core algorithm

Every timestep, the following steps were taken:

1. **Weigh:** Each particle is evaluated using a Gaussian distribution for how likely it is the satellite's real position.
2. **Resample:** Sebastian Thrun's provided resampling wheel draws new particles in O(N), as opposed to O(N log N) for ordinary weighted sampling.
3. **Fuzz:** Duplicates have a slight offset added to them to keep guesses from converging incorrectly.
4. **Move:** Every particle is simulated with the kinematic bicycle model. An orbit, as it turns out, is just a very long left hand turn.
5. **Estimate:** This is calculated by using the mean of every simulated particle. In Part B, an atan2 from the satellite location estimate to the home planet gives the bearing to send an SOS signal.

## Where I went wrong

My initial variance values were wildly incorrect.

For Part A, they were roughly **5 orders of magnitude too high** (10⁻⁸), and after I determined the variance value was the reason there was no convergence, I managed to decrease it to a workable value (10⁻¹³). For Part B, the readings switched to a standard percentage scale (0–100), which also caused issues until I corrected my variance to 10.

I also exploited the CPU run time constraint. I frontloaded a lot of my calculation to the initial batch of particles, and reduced the count by 100 particles every timestep until I reached a group of 250 guesses. Doing this allowed me to pass the CPU constraint comfortably, while taking longer on earlier timesteps. The risk is that if the particle count is low before they're close to the ship, **the filter can sometimes fail**, and this did happen on a few of the test cases. In the real world, this frontloading shortcut would not work due to standardized time step lengths.

![](failed_convergence.mp4 "A failed run")

In the future, I would love to implement a way to **decrease the particle count based on the level of convergence** the filter has experienced, as opposed to a flat rate that can fail on certain test cases. This would allow for fewer initial particles as well, making the filter overall more efficient.

## Results

My filter scored 18 out of 20 on the autograder.

**8/10 in Part A, and 10/10 in Part B**. A 100% required 7 of 10 in each part. Because the filter is random by design, these numbers can vary from run to run.
