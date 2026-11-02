---
title: "F1 Clustering Capstone"
number: 1
status: in-orbit
summary: A tool built for General Motors that sorts 18 million samples of Formula 1 telemetry into driving styles.
stack: [Python, PostgreSQL, pandas, scikit-learn]

display:
  image: project_image.png

highlights:
  - slides/
  - demo.mp4
  - Project_Poster.jpg
  - lap-data.mp4
screen: demo.mp4

repo: https://github.com/eli-rosee/f1-style-analysis-capstone-project

readouts:
  - label: My role
    value: Data / Backend
  - label: Team
    value: 6 Seniors
  - label: When
    value: Sept 2025 - May 2026

media:
  - type: link
    href: https://f1.elirose.dev
    live: true
    title: Live site
  - type: slides
    folder: slides/
    pdf: Final_Presentation.pdf
    title: Final slides
  - type: image
    file: Project_Poster.jpg
    crop: top
    zoom: 1.0
    title: Engineering Expo Poster
  - type: video
    file: demo.mp4
    title: Live demo (by me)
    wide: true
  - type: link
    href: https://youtu.be/OCAGYdfFWjQ
    label: YouTube
    title: Full presentation
  - type: link
    file: Final_Report.pdf
    label: PDF
    title: Final report

draft: false

achievement: "This project was awarded the CSCE Undergraduate Enrichment Fund."
statement: Is there a *best way* to drive a Formula 1 car?
---

## At a glance

A year-long capstone for General Motors where we set out to define "driving styles" amongst F1 drivers.

- **Awards:** 1st place for the CSCE Undergraduate Enrichment Fund, 1st place at the College of Engineering Expo (CSCE), and an invitation to present at the CSCE Alumni Conference.
- **My part:** I built the scraper, the database and the preprocessing pipeline, and made 78 of the team's 167 commits.
- **Scale:** 26,692 laps and over 18 million telemetry samples from all 24 races of the 2025 F1 season.
- **Live:** [f1.elirose.dev](https://f1.elirose.dev "The live dashboard")

## The prompt

Formula 1 teams measure everything about the car, but the driver is still hard to quantify.

Lap time is the metric everyone looks at, but it's shaped by everything around the driver just as much as the driver themselves. GM asked us to build a tool that digs into what exactly differs amongst drivers, and to do so **independent of lap time**. It was an interesting challenge, and one that had previously been relatively unexplored in F1 data analytics (see '3.2 Related Work' in our paper).

Capstone at the University of Arkansas is two semesters. In the fall, we were matched with an industry sponsor and designed a solution to the sponsor's given problem statement. In the spring, we built it. My team of six was sponsored by **General Motors**, whose data science team mentored us throughout the project's duration.

## My role

I wrote nearly all of `data_ingestion/` and the core of `data_analysis/`.

```text title="backend" link=repo
data_ingestion/
├─ scrape.py                  downloads every lap's JSON from Tracing Insights
├─ postgresql_db.py           creates the 48 tables, a pair for each race
├─ database_intake.py         validates every lap and loads it into PostgreSQL
├─ psql_index_creation.py     indexes driver and lap so reads are fast
└─ query_db.py                early query helpers for checking the load
data_analysis/
├─ cache/
│  └─ build_metadata_cache.py records each race's tables and lap counts
├─ query_db.py                fetches one driver's lap, sorted by distance
├─ race_data.py               aligns, normalizes, filters and reduces a race
├─ export_library.py          (teammate) logs dropped laps for the dashboard
└─ kmeans_clustering.py       (shared) clusters a race into the dashboard's JSON
frontend/                     (teammate) the dashboard
```

## scrape.py and database_intake.py

All 26,692 laps of the 2025 season, loaded into PostgreSQL after three failed overnight runs.

The scraper uses FastF1 (a python library) for each driver's lap count and requests each lap's JSON from [Tracing Insights on GitHub](https://github.com/tracinginsights). At the beginning of the project, we were given the choice between the two open source F1 data sources. The reason we ultimately chose Tracing Insight's data was due to its data being in nested JSON files, which we found much easier to fetch. TI also had built in fuel correction that adjusted driver statistics based on the weight of the car. However, the FastF1 module was good for getting metadata, so we used it to help build the github links to download from.

![](lap-data.mp4 "One lap, One driver, One race."){values=10914}

## postgresql_db.py and query_db.py

Our database 2 tables per race (a metadata table and a telemetry entry table) and Binary-tree indexing cut pulling the whole season's data from over 10 minutes to 15–20 seconds.

Our metadata table was built so we wouldn't have to search massive telemetry rows during lookups. Each metadata row points to its sample in the telemetry table by a foreign key, so with the index on driver and lap, any one lap is **a single lookup**.

![](db_telemetry_schema.png "One race's telemetry table")

Keep in mind that telemetry is measured 10s of times a second, and each of these measurements needs an invidual entry in our database (again, totaling over 18 million records in the entirety of our DB).

![](db_meta_schema.png "Its metadata table and index")

## race_data.py

RaceData turns a race's raw laps into clean and comparable data.

1. **Load.** Every lap for every driver is fetched from the database in lap order.
2. **Aligned by distance, not time.** Each lap is interpolated onto the same **500 distance points** along the track for clean comparisons.
3. **Normalize per driver.** Each of the eight metrics is scaled 0–1 against the driver's own **2nd to 98th percentile** over a block of five laps, so one spike can't stretch the scale, and tire wear is accounted for.
4. **Drop outlying laps.** The first lap always gets dropped, and so does any lap more than **1.5 × IQR** slower than the driver's norm (catches safety cars and pit stops).
5. **Reduce with PCA.** The eight metrics at each point compress to ~4-5 components that account for 95% of the variance, taking a lap from **4,000 values to about 2,000 - 2,500**. We found much better cluster results with this mechanism.

Here's step 2, the alignment, in code:

```python file=data_analysis/race_data.py lines=151-162
def _reindex_df_operations(self, df):
    uniform_index = np.linspace(0, 1, DATAPOINTS_PER_LAP)
    df = df[~df.index.duplicated(keep='first')]
    df = df.reindex(df.index.union(uniform_index))
    df = df.infer_objects(copy=False)
    df = df[df.index.notna()]
    df = df.interpolate(method='index')
    df = df.ffill()
    df = df.bfill()
    df = df.reindex(np.linspace(0, 1, DATAPOINTS_PER_LAP))

    return df
```

## kmeans_clustering.py

Each individual lap is sorted into one of five clusters, and a driver's style is represented by a distribution across the different clusters.

Besides K-means, we tested hierarchical clustering (its O(n^2) memory had difficulties evaluating an entire season), Gaussian mixtures (no different than k-means without soft assignments, which went against our hard lap classifcation strategy) and DBSCAN (F1 laps are too alike for density to separate). Adding PCA lowered the silhouette / DBI scores, yet it was **the first run where drivers' distributions actually differed**, so we judged every run by its distributions as well as its scores.

![](without_pca.png "Without PCA")

![](with_pca.png "With PCA")

We left the clusters unlabeled. A cluster's meaning changes from track to track, so the dashboard shows how each one **differs from the race average** and leaves the interpretation to the user.

## Architecture

Our pipelin was three layers, This diagram displays the path from raw telemetry to the dashboard.

![](architecture.png "Architecture Diagram")

We hosted this on a EC2 instance during the capstone, but now I [self-host](https://f1.elirose.dev) it.


## What I'd do next

Three things I would add if we had more time.

1. **More seasons.** Our tool being 2025 alone limits race to race comparisons. More years would show how a track evolves over time, and give us more data to compare drivers by.
2. **Style beside performance.** Adding performance metrics like lap time, pace and finishing position to each cluster would let a user compare how a style was driven versus how well it actually did, without leaving the dashboard.
3. **Findings from the tool.** Building it took the whole year, and none of us were data scientists, so we never used it to answer any style questions ourselves. The next step is the analysis, such as which styles are fastest, how a style changes as tires wear, and what separates two drivers in the same car.

## Awards

1. **1st Place, CSCE Undergraduate Enrichment Fund ($1,000)**  
  Recognized for outstanding capstone project work by the Department of Computer Science and Computer Engineering. Presented by our capstone professor Dr. Patitz, with the award stewarded by Dr. Ogden.

2. **1st Place, College of Engineering Expo (CSCE)**  
  Earned first place among Computer Science and Computer Engineering teams for our Formula 1 telemetry analysis and visualization project.

3. **Invited Presenter, CSCE Alumni Conference**  
  Selected as one of three capstone teams invited to present our project to University of Arkansas CSCE alumni.
