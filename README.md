# Zorix Weather Live

A GitHub Pages ready weather card inspired by the provided mobile screenshot.

## Features

- Real-time weather from `https://wttr.in/<city>?format=j1`
- Pure SVG weather icons, no emoji assets
- Animated glass phone UI
- Six-day forecast strip
- Hourly temperature curve
- Fahrenheit / Celsius toggle
- Static frontend only, deployable on GitHub Pages

## Deploy on GitHub Pages

1. Upload all files in this folder to a GitHub repository.
2. Open repository Settings.
3. Go to Pages.
4. Choose `Deploy from a branch`.
5. Select `main` and `/root`.
6. Open the Pages URL after deployment finishes.

## Local Test

Open `index.html` directly, or run:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.
