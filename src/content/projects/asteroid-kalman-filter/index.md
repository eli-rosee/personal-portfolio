---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "Asteroid Kalman Filter"
number: 2
status: in-orbit
summary: A Kalman filter for every asteroid, predicting where each one moves next so a stranded ship can hop-scotch home.
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
  image: project_image.png

# code (one or neither)
#   repo: <url> (default)
#   private: <tooltip>

repo: https://github.com/eli-rosee/asteroid-field-kalman-filter

# readouts (up to 4)
#   note

readouts:
  - label: OMSCS Course Project
    value: 'Robotics: AI Techniques'
  - label: Team
    value: Solo
  - label: When
    value: Sept 2026

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
  - type: link
    file: project_outline.pdf
    title: Project Outline

# draft
#   delete to publish

draft: false

# write-up (files go in assets/)
#   ## Heading
#   **bold**
#   [text](url "tooltip")
#   - list
#   1. steps in order (numbered 01, 02, …)
#   - **Label:** text (the gap after the colon is set by the site)
#   blank line = new paragraph; extra blank lines or spaces add nothing
#   &ensp; or &emsp; = a one-off wider space
#   line\ (line break)
#   ![alt](file "caption") on its own line
#     2–3 in a row sit side by side
#     {effects=true} right after it adds the image effects
#   ```math … ``` = equations, one a line
#     Label:  x = F x    (note)
#     v_x  F^T  S^{-1}

# order
#   Background (opt)
#   The problem · The prompt
#   Approach · What we built
#   The core algorithm (opt)
#   My role (team projects)
#   Where I went wrong
#   Results
#   Awards (opt)

statement: Our stranded crew has a broken engine and *400 days* to get back to Earth.
---

## The problem

While traveling through the solar system, the engine in our ship sputters out.

Luckily, an asteroid field is approaching, and we realize the ship can hop-scotch from asteroid to asteroid to get back to Earth, at the top edge of the field. Asteroid hopping is a tricky operation, though. The ship can only jump so far, and **a jump out of range sends us flying into deep space, castaways forever.** Even a good jump isn't safe. If the asteroid we land on drifts out of the field, we suffer the same fate.

To top it all off, we only have **400 days of supplies**.

## Approach

I gave every asteroid its own Kalman filter.

At every timestep, we're given a noisy (x, y) measurement of every asteroid in the field. Each asteroid also has an unknown velocity and acceleration that the measurements never tell us directly. A Kalman filter is uniquely equipped for this job, as it can **estimate those hidden values from position alone**, while deciding how much to trust its own prediction versus each new noisy measurement.

A particle filter could do this too, but it would be overkill. There's only ever **one likely position to track**, as we are provided the measurements (however nosiy) at every timestep. A Kalman filter follows it with a single estimate and its uncertainty, where a particle filter would need thousands of particles to do the same.

In Part A, our goal was predicting where each asteroid would be one timestep in the future. Each filter needs a few timesteps to converge, then its predictions stay roughly within the match range.

![](part_a_success.mp4 "Part A: tracking every asteroid")

In Part B, those predictions were used to **decide which asteroid (if any) to jump to** at each timestep in order to reach Earth at the top of the field.

![](part_b_success.mp4 "Part B: hopping home")

## The math

The whole filter comes down to a few lines of linear algebra.

Each asteroid's state is its position, velocity, and acceleration in each axis:

```math
x = [x, v_x, a_x, y, v_y, a_y]ᵀ
```

Movement follows constant-acceleration kinematics (**x + vΔt + ½aΔt²**), which gets packed into a state transition matrix **F**. Since we only ever measure position, the measurement matrix **H** just pulls x and y out of the state.

```math
Predict:  x = F x
          P = F P Fᵀ

Update:   y = z − H x
          S = H P Hᵀ + R
          K = P Hᵀ S⁻¹
          x = x + K y
          P = (I − K H) P
```

**P** is our uncertainty, starting with a variance of 0.5 on every value. There's no process noise term (**Q**). **R** is the measurement noise, which has unknown values. After tuning, I landed on a standard deviation of 0.035 in x and 0.055 in y. The Kalman gain **K** is how weighting gets decided. When we're uncertain in our state estimate, it values the measurement higher, and when we're confident, it values the prediction.

## The core algorithm

Each asteroid's filter is set up once, then every timestep runs the same steps:

0. **Initialize:** Each new asteroid gets its own filter, set to its first (x, y) measurement with velocity and acceleration at 0. The filter converges on the real values over the next several timesteps.
1. **Update:** Each asteroid's measurement is used to update its filter's belief. Because the measurement is noisy, we can't fully trust it, but we can't fully trust our prediction either. That's where the Kalman gain is used.
2. **Predict:** Each asteroid is predicted exactly one timestep into the future.
3. **Jump (Part B only):** Of the asteroids in jump range, the ship chooses the one predicted to be closest to the top-middle point 5 timesteps from now. The algorithm skips any too close to the field's edges to prevent the asteroid we're riding from carrying us out of bounds.

## Where I went wrong

My biggest bug was hopping around just short of the finish line.

Every time the ship got close to home, it would keep jumping between asteroids that were closer to the top-middle point in 5 timesteps, but it would never actually want to cross the finish line. To fix this, I used a **moving finish line**. Once the ship got close enough, the target moved past the boundary, so crossing it became the best option.

Some runs also failed simply from **running out of supplies before reaching home**. In this run, the algorithm got unlucky with its field of asteroids. They were pretty sparse, and a lot of the ones that fell into the ship's jump window had downward momentum. Despite this, the ship was still making progress, and it most likely would have made it home given a bit more supplies.

![](failed_too_slow.mp4 "A failed run: out of supplies")

## Results

My filters scored 30 out of 32, full marks.

**15/15 in Part A, and 15/17 in Part B.** A 100% required 15/15 in Part A and 15/17 in Part B, which I hit on the nose. These results can differ depending on the specific test suite used.
