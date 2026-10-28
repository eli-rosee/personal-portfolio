---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "F1 Clustering Capstone"
number: 1
status: in-orbit
summary: A dashboard that clusters Formula 1 telemetry into driving styles.
stack: [Python, Clustering, K-means, Data Processing]

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

# display:
#   image: display.png

# code (one or neither)
#   repo: <url> (default)
#   private: <tooltip>

repo: https://github.com/eli-rosee/f1-clustering-capstone

# readouts (up to 4)
#   note

readouts:
  - label: My role
    value: Backend / Clustering
  - label: Team
    value: "6"
  - label: When
    value: Aug 2025 - May 2026

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
    href: https://f1.elirose.dev
    live: true
    title: Live site
  # Needs teammates' OK (and GM's) before going public
  # - type: video
  #   file: demo.mp4
  #   title: Demo
  # - type: image
  #   file: Project_Poster.jpg
  #   fit: whole
  #   title: Poster
  # - type: slides
  #   folder: slides/
  #   pdf: Final_Slides.pdf
  #   title: Final slides
  # - type: link
  #   href: https://youtu.be/OCAGYdfFWjQ
  #   label: YouTube
  #   title: Final presentation
  # - type: link
  #   file: Final_Report.pdf
  #   label: PDF
  #   title: Final report

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

statement: Is there a *best way* to drive a Formula 1 car?
---

## Results

[f1.elirose.dev](https://f1.elirose.dev "The live dashboard")

## Awards

1. **1st Place, CSCE Undergraduate Enrichment Fund ($1,000)**  
  Recognized for outstanding capstone project work by the Department of Computer Science and Computer Engineering. Presented by our capstone professor Dr. Patitz, with the award stewarded by Dr. Ogden.

2. **1st Place, College of Engineering Expo**  
  Earned first place among Computer Science and Computer Engineering teams for our Formula 1 telemetry analysis and visualization project.

3. **Invited Presenter, CSCE Alumni Conference**  
  Selected as one of three capstone teams invited to present our project to University of Arkansas CSCE alumni.

<!--
## Background

A bit about the background of Capstone 1 / 2

This project encompassed my entire senior year. In the Fall semester, we took Capstone 1, a class to pick our projects, introduce us to our sponsors, and come up with a design and plan for how to implement our specified project. In capstone 2, we were tasked with implementing our designed solution. 

## The Prompt

The prompt general motorsports provided us for the project.

## What we built

A summary of what we created, our project, and some of the architecture

## My role

What I owned, in a sentence or two.

## Where I went wrong

What I would change about the project looking back. Mainly:
1. Expand past just the 2025 season
2. Have a way to compare performance to "styles." Would make it infinitely easier for people to glean insights off of the data, which was the ultimate goal. We did have discussions about this, but ran out of time to implement it.
3. This is a bit of a murkier point, and not something super concrete we could have done. But, this tool we built is specifically for inter race comparisons, and there is no possibility to compare BETWEEN races, without a large amount of effort and statistical work on the user's end. In this regard, it failed it's goal, and while I am still super proud of it as a project, this is one of the issues we were never really able to overcome.

## Results

The website (duh). Maybe with the demo as well.
-->
