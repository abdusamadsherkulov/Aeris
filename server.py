# server.py
from flask import Flask, jsonify, request, send_from_directory
from weather import get_current_weather, get_forecast

app = Flask(__name__, static_folder="web", static_url_path="")


@app.get("/")
def index():
    return send_from_directory("web", "index.html")


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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
