# server.py
from flask import Flask, jsonify, request, send_from_directory
from weather import get_current_weather, get_forecast, API_KEY, _request

app = Flask(__name__, static_folder="public", static_url_path="")


@app.get("/")
def index():
        return send_from_directory("public", "index.html")


@app.get("/api/weather")
def api_weather():
    city = request.args.get("city", "").strip()
    units = request.args.get("units", "metric")
    if not city:
        return jsonify(error="Please type a city name."), 400
    if units not in ("metric", "imperial"):
        units = "metric"

    try:
        cur = get_current_weather(city, units=units)
        fc = get_forecast(city, units=units, days=5)
    except RuntimeError as e:
        msg = str(e)
        if "404" in msg:
            return jsonify(error=f"Couldn't find “{city}”. Check the spelling?"), 404
        if "401" in msg:
            return jsonify(error="Invalid API key. Check your .env file."), 500
        if "not set" in msg:
            return jsonify(error="OPENWEATHER_API_KEY is missing in .env"), 500
        return jsonify(error="Weather service is unreachable right now."), 502

    raw = cur.get("raw", {})
    sys_ = raw.get("sys", {})
    current = {
        **{k: v for k, v in cur.items() if k != "raw"},
        "sunrise": sys_.get("sunrise"),
        "sunset": sys_.get("sunset"),
        "timezone": raw.get("timezone", 0),
        "visibility": raw.get("visibility"),
        "wind_deg": raw.get("wind", {}).get("deg"),
        "clouds": raw.get("clouds", {}).get("all"),
    }
    forecast = [{k: v for k, v in d.items() if k != "raw"} for d in fc]
    return jsonify(current=current, forecast=forecast, units=units)

@app.get("/api/suggest")
def api_suggest():
    q = request.args.get("q", "").strip()
    if len(q) < 2 or not API_KEY:
        return jsonify([])
    try:
        data = _request("https://api.openweathermap.org/geo/1.0/direct",
                        {"q": q, "limit": 5, "appid": API_KEY}, timeout=5)
    except RuntimeError:
        return jsonify([])
    seen, out = set(), []
    for p in data:
        key = (p.get("name"), p.get("state"), p.get("country"))
        if key in seen:
            continue
        seen.add(key)
        out.append({"name": p["name"], "state": p.get("state", ""), "country": p.get("country", "")})
    return jsonify(out)
        
if __name__ == "__main__":
    app.run(debug=True, port=5000)
