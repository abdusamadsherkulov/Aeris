import os
import time
import json
from collections import defaultdict, Counter
from datetime import datetime
from typing import List, Dict, Any
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv('OPENWEATHER_API_KEY')
CACHE_FILE = "/tmp/cache_json" if os.getenv("VERCEL") else os.path.join(os.path.dirname(__file__), 'cache_json')
DEFAULT_TTL = 600

def _load_cache() -> dict:
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def _save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f)

def _get_cached(key: str, ttl: int = DEFAULT_TTL):
    cache = _load_cache()
    entry = cache.get(key)
    if not entry:
        return None
    if time.time() - entry.get("_ts", 0) > ttl:
        return None
    return entry.get("data")

def _set_cache(key: str, data: Any):
    cache = _load_cache()
    cache[key] = {"_ts": time.time(), "data": data}
    _save_cache(cache)

def _require_key():
    if not API_KEY:
        raise RuntimeError(
            "OPENWEATHER_API_KEY is not set. Create a .env file with OPENWEATHER_API_KEY=your_key"
        )

def _request(url: str, params: dict, timeout: int = 10) -> dict:
    try:
        resp = requests.get(url, params=params, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        raise RuntimeError(f"Network/API error: {e}") from e

def get_current_weather(city: str, units: str = "metric", use_cache: bool = True, cache_ttl: int = DEFAULT_TTL) -> Dict[str, Any]:
    """
    Returns a normalized dictionary of current weather for `city`.
    units: 'metric' (C), 'imperial' (F) or 'standard' (K).
    """
    _require_key()
    if units not in ("metric", "imperial", "standard"):
        raise ValueError("units must be 'metric', 'imperial' or 'standard'")

    key = f"current::{city.lower()}::{units}"
    if use_cache:
        cached = _get_cached(key, ttl=cache_ttl)
        if cached:
            return cached

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": API_KEY, "units": units}
    data = _request(url, params)

    result = {
        "city": f"{data.get('name')},{data.get('sys', {}).get('country')}",
        "temp": data.get("main", {}).get("temp"),
        "feels_like": data.get("main", {}).get("feels_like"),
        "temp_min": data.get("main", {}).get("temp_min"),
        "temp_max": data.get("main", {}).get("temp_max"),
        "pressure": data.get("main", {}).get("pressure"),
        "humidity": data.get("main", {}).get("humidity"),
        "weather_main": data.get("weather", [{}])[0].get("main"),
        "description": data.get("weather", [{}])[0].get("description"),
        "icon": data.get("weather", [{}])[0].get("icon"),
        "wind_speed": data.get("wind", {}).get("speed"),
        "raw": data,
    }

    if use_cache:
        _set_cache(key, result)
    return result

def get_forecast(city: str, units: str = "metric", days: int = 3, use_cache: bool = True, cache_ttl: int = DEFAULT_TTL) -> List[Dict[str, Any]]:
    """
    Returns a list of daily forecasts (up to 5 days as provided by OWM's 5-day forecast).
    Each item contains: date, temp, temp_min, temp_max, description, icon.
    """
    _require_key()
    if days < 1 or days > 5:
        raise ValueError("days must be between 1 and 5 (OpenWeatherMap provides a 5-day forecast)")
    key = f"forecast::{city.lower()}::{units}::{days}"
    if use_cache:
        cached = _get_cached(key, ttl=cache_ttl)
        if cached:
            return cached

    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {"q": city, "appid": API_KEY, "units": units}
    data = _request(url, params)

    by_date = defaultdict(list)
    for it in data.get("list", []):
        dt = datetime.utcfromtimestamp(it.get("dt"))
        date_str = dt.date().isoformat()
        by_date[date_str].append(it)

    dates = sorted(by_date.keys())
    results = []
    for date in dates[:days]:
        items = by_date[date]
        target_hour = 12
        best = min(items, key=lambda x: abs(datetime.utcfromtimestamp(x["dt"]).hour - target_hour))
        main = best.get("main", {})
        weather = best.get("weather", [{}])[0]
        results.append({
            "date": date,
            "temp": main.get("temp"),
            "temp_min": min(it.get("main", {}).get("temp_min", main.get("temp")) for it in items),
            "temp_max": max(it.get("main", {}).get("temp_max", main.get("temp")) for it in items),
            "humidity": main.get("humidity"),
            "description": weather.get("description"),
            "icon": weather.get("icon"),
            "raw": best
        })

    if use_cache:
        _set_cache(key, results)
    return results
