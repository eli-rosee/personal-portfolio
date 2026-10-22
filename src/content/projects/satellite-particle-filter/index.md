---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "Satellite Particle Filter"
number: 1
status: in-orbit
summary: Created a localization algorithm to help locate a lost crew before supplies ran out.
stack: [Localization, Kinematic Bicycle Model, Python]

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

statement: Mission control has *300 days* to get the intergalactic heroes home before supplies run out.

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
    file: demo.mp4
    title: Demo
  - type: clip
    file: clip.mp4
    title: Clip
  - type: image
    file: photo.png
    title: Photo
  - type: slides
    folder: slides/
    title: Slides
  - type: link
    href: https://example.com
    title: Live site
  - type: link
    file: report.pdf
    title: Report

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
  Trade-offs (opt)
  Results · Outcome · Final result
  What I'd change · Future work
-->

## Constraints

For this localization project, we were alotted 300 time steps to localize within 0.01 AU of the 10.2 meter satellite.

<!--
  Biggest bug worth mentioning is the standard deviation errors
  Potential fix: percentage of fuzzing instead of every duplicate. allows for more direct convergence. Basic averaging usage.
  Measurement is noisy
  Sun is (0, 0) initially, but kinematic motion model acocunts for that.
  Could've added threading capabilities if CPU restrictions were tighter

  Results on gradescope (8 / 10 successful tests passed for Part A), (10 / 10 for part B)

  Cheesed it a bit with frontloading particle count. in the real world, time step lengths cannot vary.
-->
