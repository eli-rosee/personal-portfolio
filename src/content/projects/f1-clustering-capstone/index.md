---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "F1 Clustering Capstone"
number: 1
status: in-orbit
summary: A tool built for GM Motorsports that sorts 18 million samples of Formula 1 telemetry into driving styles.
stack: [Python, PostgreSQL, Data Pipelines, K-means]

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

repo: https://github.com/eli-rosee/f1-clustering-capstone

# readouts (up to 4)
#   note

readouts:
  - label: My role
    value: Data / Backend
  - label: My commits
    value: 78 of 167
  - label: Team
    value: 6 Seniors
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
#       npm run slides <slug> deck.pptx makes the folder and the PDF
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
  - type: video
    file: demo.mp4
    title: Live demo
    wide: true
  - type: slides
    folder: slides/
    pdf: Final_Presentation.pdf
    title: Final slides
  - type: image
    file: Project_Poster.jpg
    crop: top
    zoom: 1.0
    title: Engineering Expo Poster
  - type: link
    href: https://youtu.be/OCAGYdfFWjQ
    label: YouTube
    title: Final presentation
  - type: link
    file: Final_Report.pdf
    label: PDF
    title: Final report

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
#     {values=N} right after a clip adds a count of N values and a progress bar
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

## At a glance

A year-long capstone for GM Motorsports where we set out to define "driving styles" amongst F1 drivers.

- **Awards:** 1st place for the CSCE Undergraduate Enrichment Fund, 1st place at the College of Engineering Expo (CSCE), and an invitation to present at the CSCE Alumni Conference.
- **My part:** I built the scraper, the database and the preprocessing pipeline, and made 78 of the team's 167 commits.
- **Scale:** 26,692 laps and over 18 million telemetry samples from all 24 races of the 2025 F1 season.
- **Live:** [f1.elirose.dev](https://f1.elirose.dev "The live dashboard")

## Background

This project lasted my entire senior year.

Capstone at the University of Arkansas is two semesters. In the fall, each team is matched with an industry sponsor and designs a solution to the sponsor's problem. In the spring, we built it. My team of six was sponsored by **GM Motorsports**, whose data science team mentored us throughout the project's duration.

## The prompt

Formula 1 teams measure everything about the car, but the driver is still hard to quantify.

Lap time is the number everyone looks at, but it's shaped by everything around the driver just as much as the driver themselves. GM Motorsports asked us to build a tool that digs into what defines a driver, and to do so independent of lap time. That meant stripping away the noise from the car, the tires and the track until all that was left were the driver's own inputs.

In the end, our ultimate goal was to define "driving styles" amongst the field of F1 drivers.

## My role

I built the data handling side of the project.

I made **78 of the team's 167 commits**. Most of them went into ingestion, the database, and preprocessing. The clustering was shared work that I joined near the end, and a teammate built the dashboard.

## Jan 15 · Scraper

The project began, and I started work on the scraper.

Tracing Insights publishes each driver's race telemetry as one JSON file per lap in a public GitHub repository, with no API or bulk download, so the scraper fetches every lap straight from a race's GitHub repository with a plain HTTP request. Each lap is nested by race, driver, and lap number, so the scraper uses FastF1 to pull the season's schedule and the number of laps each driver completed. It then builds the GitHub URL to request download individual driver's telemetry from a single lap of a single race. For 2025, there were **26,692 laps** across 24 races, each one its own request.

![](lap-data.mp4 "One lap. One driver. One race."){values=10914}

## Feb 17 · Overnight

With the whole season on disk, the hard part became getting it into the database, and this took five overnight runs.

The scraper finished on the night of February 16, and my [commit](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/8e7a600 "See the commit") that night said all that was left was the overnight transfer into the database. Runs failed on null values, mismatched columns, a [full disk](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/d574779 "See the commit") and half-finished loads, and each failure meant starting over the next night. The loader that finally worked validates every value before inserting it and checks its row counts when it's done.

## Mar 10 · Redesign

I rebuilt the database because pulling a single race took over 30 seconds.

The first design kept the whole season, over **18 million** samples, in two tables, and every clustering experiment re-read the data. The [new design](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/5017cc7 "See the commit") gives each race its own pair of tables, about 750,000 rows each.

![](db_telemetry_schema.png "One race's telemetry table")

## Mar 12 · Indexes

Two days later, B-tree indexes cut a driver's query from **over 10 minutes to 15–20 seconds**.

The [commit](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/d86b2cd "See the commit") that added them also put every read behind one small query class, so nobody on the team wrote their own SQL again, alongside a metadata cache built once from FastF1. After that, loading a race was one line of code.

![](db_meta_schema.png "The metadata table and its driver and lap index")

## Mar 16 · RaceData

Fast data still isn't comparable data.

Each lap becomes a single point to cluster, so two laps have to line up sample for sample before the distance between them means anything. I built a class called RaceData to do that, and spent most of the next month refining it. Given a race, it runs the whole pipeline in order.

1. **Load.** Every lap for every driver comes out of the database in lap order.
2. **Align by distance, not time.** Telemetry arrives at uneven intervals, so each lap is interpolated onto the same 500 points along the track. A lap that still has gaps afterward is dropped.
3. **Normalize per driver.** Each of the eight metrics (RPM, speed, throttle, brake, gear, and acceleration in x, y and z) is scaled 0–1 against that driver's own range over a block of five laps. The scale runs from the 2nd to the 98th percentile, so a single spike can't stretch it. This takes out most of the difference between cars, along with the way a car changes over a race as fuel burns off and tires wear.
4. **Drop outlier laps.** The first lap is always dropped, and so is any lap whose average speed falls more than 1.5 × IQR below the driver's norm, which catches safety cars, pit stops and incidents. Unlike a fixed speed cutoff, this works on any track without tuning.
5. **Reduce with PCA.** PCA compresses the eight metrics at each point to the few combinations that carry 95% of the variation, which takes a lap from 4,000 values to about 2,500.

Most of these steps started out simpler and got rebuilt when a race broke them, starting with the per-driver scaling, which [landed that day](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/1f73aec "See the commit").

## Apr 3 · Every race

The outlier filter was [rewritten](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/9cba86c "See the commit") so it could run on every race, not only the one it was tested on.

Nothing gets dropped silently. Every lap the pipeline throws out is logged with its reason, and those counts ship with the results. Across the season, 2,200 of the 26,692 laps were dropped, 1,460 as speed outliers, 458 as first laps and 282 for gaps in the data, and the dashboard shows each race's breakdown.

## Apr 9 · First results

Three months after the first line of the scraper, the pipeline produced its [first clustering results](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/dd5d075 "See the commit").

K-means sorts each race's laps into five clusters, so a driver's style is the share of their laps in each one, a distribution rather than a single label. We tried hierarchical clustering, Gaussian mixtures and DBSCAN first, and K-means held up best across a full season of tracks. One lesson stuck with me. Adding PCA lowered our silhouette score, yet it was the first time drivers' distributions actually differed from each other, so from then on we judged every run by its distributions as well as its scores.

![](without_pca.png "Without PCA")
![](with_pca.png "With PCA")

We left the clusters **unlabeled**. A cluster's meaning shifts from track to track, and calling one "aggressive" would be our opinion, not the data's.

## What we built

The finished system is a pipeline from raw telemetry to an interactive dashboard, in three layers.

![](architecture.png "From raw telemetry to the dashboard")

Clustering runs offline, so the site only serves precomputed JSON files, one set per race, with no database or API behind it. During the capstone it ran on an Amazon EC2 instance, and it now runs on my own server alongside this site. Pick a track and any drivers on the dashboard, and each driver gets a breakdown of their laps across the five clusters and a radar chart of the same mix, beside a chart of what each cluster means and a count of the laps that were dropped and why.

## Where I went wrong

Looking back, there are three things I'd change.

1. **One season.** We only covered 2025. More seasons would mean more laps per driver, and a way to see whether a style holds up from year to year.
2. **No link from style to speed in the tool.** We left that analysis to the user on purpose, but the dashboard could still make it easier: showing each cluster's pace beside its telemetry would let a viewer spot a faster style at a glance. We discussed it but ran out of time.
3. **No comparisons between races.** Clusters are fit per race, so a cluster at Monaco isn't the same cluster at Monza, and comparing a driver across tracks takes a lot of statistical work on the user's end. I'm still proud of the project, but this is the gap we never closed.

## Awards

1. **1st Place, CSCE Undergraduate Enrichment Fund ($1,000)**  
  Recognized for outstanding capstone project work by the Department of Computer Science and Computer Engineering. Presented by our capstone professor Dr. Patitz, with the award stewarded by Dr. Ogden.

2. **1st Place, College of Engineering Expo**  
  Earned first place among Computer Science and Computer Engineering teams for our Formula 1 telemetry analysis and visualization project.

3. **Invited Presenter, CSCE Alumni Conference**  
  Selected as one of three capstone teams invited to present our project to University of Arkansas CSCE alumni.
