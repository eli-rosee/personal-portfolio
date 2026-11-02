---
title: "Satellite Particle Filter"
number: 2
status: in-orbit
summary: A particle filter that finds a lost satellite within 0.01 AU from noisy gravity and light readings.
stack: [Python, Particle Filter, Localization]

display:
  image: project_image.png
  crop: right
  zoom: 1.3

highlights:
  - part_a_success_1.mp4
  - part_b_success_2.mp4
  - failed_convergence.mp4

private: Private per course policy

readouts:
  - label: OMSCS Course Project
    value: 'Robotics: AI Techniques'
  - label: Team
    value: 'Solo'
  - label: When
    value: Oct 2026

media:

  - type: link
    file: project_outline.pdf
    title: Project Outline

draft: false

achievement: My filter scored an 18 out of 20 on test cases, earning a 100% on the assignment.
statement: We have just *300 days* to find ourselves and make it home.
---

## The problem

After a long mission, our ship, a 10-meter satellite, is warped through a wormhole and set adrift in our solar system.

The jump fried our GPS. All that still works is our gravity sensor, giving us one reading a day. From the jump, we know we're somewhere in an 8 × 8 AU patch of space. We have 300 days of supplies to survive on our own, which gives us only 300 readings to find ourselves and get home.

In Part B, we warp back again, but this time the gravity sensor is dead too. All our ship can read is how bright each planet (up to four) looks from its window, on a scale of 0–100. Our main comm line failed as well, so to call for help, we have to aim SOS messages home. Mission control needs **10 SOS messages** before launching a rescue.

For both missions, our onboard computer was damaged in the jump. It gives us **15 seconds of total CPU time to pin ourselves down within 0.01 AU** before giving out.

## Approach

I used a particle filter.

A particle filter can **simultaneously track all possible locations of the ship**. Single gravity and brightness readings can look almost identical from very different places in the solar system, so we use particles to track pockets of our best guesses until we have enough measurements to converge onto a single most likely location. A Kalman filter would most likely converge on a single, incorrect guess.

In Part A, the filter localizes the ship from the gravity it feels each day.

![](part_a_success_1.mp4 "Part A: localizing from gravity")

In Part B, each particle is weighed on up to four brightness readings at once. I combined the difference between expected and observed brightness for every planet into a single weight per particle.

![](part_b_success_2.mp4 "Part B: localizing from planet illumination")

## The core algorithm

The filter sets up its particles once, then runs the same five steps with every new timestep.

0. **Initialize:** 2,000 particles are scattered across the 8 × 8 AU patch. Each one's heading is its angle from the Sun (atan2) plus π/2, setting it in a counter-clockwise orbit around the Sun.
1. **Weigh:** Each particle is evaluated using a Gaussian distribution for how likely it is the ship's real position.
2. **Resample:** The resampling wheel from Sebastian Thrun's lectures draws new particles in O(N), as opposed to O(N log N) for ordinary weighted sampling.
3. **Fuzz:** Duplicates have a slight offset added to them to keep guesses from collapsing into a few identical ones.
4. **Move:** Every particle is simulated with the kinematic bicycle model. An orbit, as it turns out, is just a very long left-hand turn.
5. **Estimate:** In Part A, the mean of all particles' positions. In Part B, an atan2 from that estimate to the home planet gives the bearing to send an SOS signal.

## Where I went wrong

My initial variance values were set incorrectly.

For Part A, they were roughly **5 orders of magnitude too high** (10^-8), and after I determined the variance value was the reason there was no convergence, I managed to decrease it to a workable value (10^-13). For Part B, the readings switched to a standard percentage scale (0–100), which also caused issues until I corrected my variance to 10.

I also spent most of the CPU budget early. I started with 2,000 particles and cut 100 every timestep until 250 remained. Doing this allowed me to pass the CPU constraint comfortably, while taking longer on earlier timesteps. The risk is that if the particle count gets low before the particles are close to the ship, **the filter can sometimes fail**, and this did happen on a few of the test cases.

![](failed_convergence.mp4 "A failed run")

In the future, I would love to implement a way to **decrease the particle count based on the level of convergence** the filter has experienced, as opposed to a flat rate that can fail on certain test cases. This would make the filter more like particle filters on robots, which have a set amount of compute **per timestep** (not total).

## Results

My filter scored an 18 out of 20, earning full marks.

**8/10 in Part A, and 10/10 in Part B.** A 100% required 7 of 10 in each part. Because the filter is random by design, these numbers can vary based on the particular test case.
