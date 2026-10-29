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
  # - type: video
  #   file: demo.mp4
  #   title: Demo
  - type: slides
    folder: slides/
    pdf: Final_Slides.pdf
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

A year-long capstone for GM Motorsports that took first place twice.

- **Awards:** 1st place for the CSCE Undergraduate Enrichment Fund, 1st place at the College of Engineering Expo, and an invitation to present at the CSCE Alumni Conference.
- **My part:** I owned ingestion, the database and preprocessing, and made 78 of the team's 167 commits.
- **Scale:** 26,692 laps and over 18 million telemetry samples from all 24 races of 2025.
- **Speed:** a database redesign cut a driver's query from two minutes to 15–20 seconds.
- **Live:** [f1.elirose.dev](https://f1.elirose.dev "The live dashboard")

## The prompt

Formula 1 teams measure everything about the car, but the driver is still hard to quantify.

Lap time is the number that everyone looks at, but it's shaped by everything around the driver. The car, the tires, the track, and other things outside of the driver's control can influence a driver's performance. GM Motorsports wanted to see past it, with a tool that clusters drivers by driving style **independent of lap time**.

Capstone at the University of Arkansas is two semesters. In the fall, each team is matched with an industry sponsor and designs a solution to the sponsor's problem. In the spring, we build it. My team of six was sponsored by **GM Motorsports**, whose data science team mentored us throughout the project's duration.

## My role

I owned the data, from the first download to the laps the clustering ran on.

I made **78 of the team's 167 commits**, more than anyone else on a team of six, and most of them went into ingestion, the database and preprocessing. The clustering was shared work that I joined near the end, and a teammate built the dashboard.

## Getting the data

The first problem was getting a full season of telemetry onto one machine.

Tracing Insights publishes each driver's race telemetry as one JSON file per lap on GitHub, with no bulk download, so every lap has to be requested by name. I started the scraper in mid-January. It uses FastF1 to pull the season's schedule and the number of laps each driver completed, builds the address of every lap from those, and saves each file under its race and driver. For 2025 that came to **26,692 laps** across 24 races, each one its own request.

By 3 a.m. on February 17 the whole season was on disk, and my [commit](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/8e7a600 "See the commit") that night said all that was left was the transfer into the database, to run overnight. That evening the disk filled up halfway through the load, and the [next commit](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/d574779 "See the commit") reads "storage full. need to redo transfer." That set the pattern for the next few days. It took **nearly five overnight runs** before every lap made it in correctly, and many hours of rewriting the scraper and the loader in between.

The loader that finally worked trusts nothing. It checks each value against the schema before inserting it, so a gear outside 0–8 or a throttle reading outside 0–100 becomes a null instead of a failed insert. Every sample goes into the race's telemetry table with a metadata row tying it to its driver and lap, and the run ends by counting both tables and stopping if the numbers disagree.

## Making it fast

With the data finally in, the next problem was that it was too slow to use.

The first design kept the whole season, over **18 million** samples, in two tables, and pulling a single race took over ten minutes. Every clustering experiment re-read the data, so that cost was paid again and again. In March I [redesigned the database](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/5017cc7 "See the commit") around a pair of tables per race, about 750,000 rows each, and two days later [added B-tree indexes](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/d86b2cd "See the commit") on driver and lap. A driver's query dropped from about **two minutes to 15–20 seconds**.

I also put every read behind one small query class, so nobody on the team wrote their own SQL again, and a metadata cache built once from FastF1 that stores each race's tables and every driver's lap count. After that, loading a race was one line of code.

## Making laps comparable

Fast data still isn't comparable data.

Each lap becomes a single point to cluster, so two laps have to line up sample for sample before the distance between them means anything. I built a class called RaceData to do that, and spent most of the next month refining it. Given a race, it runs the whole pipeline in order.

1. **Load.** Every lap for every driver comes out of the database in lap order.
2. **Align by distance, not time.** Telemetry arrives at uneven intervals, so each lap is interpolated onto the same 500 points along the track. A lap that still has gaps afterward is dropped.
3. **Normalize per driver.** Each of the eight metrics (RPM, speed, throttle, brake, gear, and acceleration in x, y and z) is scaled 0–1 against that driver's own range over a block of five laps. The scale runs from the 2nd to the 98th percentile, so a single spike can't stretch it. This takes out most of the difference between cars, along with the way a car changes over a race as fuel burns off and tires wear.
4. **Drop outlier laps.** The first lap is always dropped, and so is any lap whose average speed falls more than 1.5 × IQR below the driver's norm, which catches safety cars, pit stops and incidents. Unlike a fixed speed cutoff, this works on any track without tuning.
5. **Reduce with PCA.** PCA compresses the eight metrics at each point to the few combinations that carry 95% of the variation, which takes a lap from 4,000 values to about 2,500.

Most of these steps started out simpler and got rebuilt when a race broke them. The per-driver scaling [came in mid-March](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/1f73aec "See the commit"), and the outlier filter was rewritten in April so it [could finally run on every race](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/9cba86c "See the commit") instead of only the race it was tested on.

Nothing gets dropped silently. Every lap the pipeline throws out is logged with its reason, and those counts ship with the results. Across the season, 2,200 of the 26,692 laps were dropped, 1,460 as speed outliers, 458 as first laps and 282 for gaps in the data, and the dashboard shows each race's breakdown.

## Clustering

On April 9 the pipeline produced its [first clustering results](https://github.com/eli-rosee/f1-style-analysis-capstone-project/commit/dd5d075 "See the commit"), three months after the first line of the scraper.

K-means sorts each race's laps into five clusters, so a driver's style is the share of their laps in each one, a distribution rather than a single label. We tried hierarchical clustering, Gaussian mixtures and DBSCAN first, and K-means held up best across a full season of tracks. One lesson stuck with me. Adding PCA lowered our silhouette score, yet it was the first time drivers' distributions actually differed from each other, so from then on we judged every run by its distributions as well as its scores.

We left the clusters **unlabeled**. A cluster's meaning shifts from track to track, and calling one "aggressive" would be our opinion, not the data's.

## What we built

The finished system is a pipeline from raw telemetry to an interactive dashboard, in three layers.

1. **Ingestion and storage:** the scraper and loader bring every lap of the 2025 season from Tracing Insights into PostgreSQL, 48 tables in all, one pair per race.
2. **Preprocessing and clustering:** RaceData aligns, normalizes, cleans and reduces each race's laps, and K-means sorts them into five clusters per race.
3. **Dashboard:** a static single-page site built with Chart.js and Leaflet. Pick a track and any drivers, and each driver gets a breakdown of their laps across the five clusters and a radar chart of the same mix, beside a chart of what each cluster means and a count of the laps that were dropped and why.

Clustering runs offline, so the site only serves precomputed JSON files, one set per race, with no database or API behind it.

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
