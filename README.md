# Bicol Weather Archive – Naga City & Milaor

Interactive historical weather viewer (month / year / date / time) with weather cards and charts,
plus an auto-recorder for scheduled readings (e.g. 9:00 and 15:00 every Wednesday and Friday).

## Structure
```
index.html, style.css, app.js     website (no build step)
schedule.json                     recording schedule used by GitHub Actions
scripts/record.mjs                records current weather (Node 20, no dependencies)
data/records.json                 recorded readings (written by Actions)
.github/workflows/record.yml      hourly check + commit
```

## Data source
[Open-Meteo](https://open-meteo.com) (free, no API key).
- **History:** Historical Weather API (ERA5 reanalysis). Typically lags ~2 days. It is gridded model data (~10–25 km), not a ground-station reading; PAGASA is the official source for station observations.
- **Recording:** Forecast API `current` conditions, taken at the moment of recording.

## Run locally
```
python3 -m http.server 8000     # open http://localhost:8000
```

## Deploy to GitHub Pages
1. Create a GitHub repo and push these files to `main`.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`**.
3. Your site appears at `https://<username>.github.io/<repo>/`.

## Enable automatic recording (GitHub Actions)
1. **Settings → Actions → General → Workflow permissions → Read and write permissions → Save.**
2. Edit `schedule.json` (or build it in the site's side panel and copy the JSON). Times are Philippine Time, 24-hour. Days: Sun–Sat.
3. Test it: **Actions → Record weather → Run workflow → tick "Record now"**.
4. The workflow runs hourly (minute :05), records when the day/hour matches, and commits to `data/records.json`. GitHub cron can run several minutes late, so readings are stamped with the scheduled time. Scheduled workflows pause after 60 days without repo activity; re-enable them under the Actions tab.

The side panel also records while the page is open (saved in that browser only), and shows both sources together.
