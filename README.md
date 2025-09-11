# Weather App (Python) — CLI + Tkinter GUI

Small portfolio project demonstrating:

- API consumption (OpenWeatherMap)
- CLI (argparse)
- GUI (Tkinter)
- .env config & secrets management
- Basic caching and error handling

## Features

- Current weather (temperature, humidity, description)
- 1–5 day forecast (via `--forecast`)
- Simple Tkinter GUI with weather icons
- File-based cache (`cache.json`) to reduce repeated API calls

## Setup

1. Clone repo
2. Create virtualenv:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
