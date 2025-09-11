# main.py
import argparse
import sys
from weather import get_current_weather, get_forecast

def _format_current(data, units):
    symbol = "°C" if units == "metric" else "°F" if units == "imperial" else "K"
    lines = []
    lines.append(f"{data['city']}")
    lines.append(f"{data['weather_main']} — {data['description'].capitalize()}")
    lines.append(f"Temperature: {data['temp']}{symbol} (feels like {data['feels_like']}{symbol})")
    lines.append(f"Min/Max: {data['temp_min']}{symbol} / {data['temp_max']}{symbol}")
    lines.append(f"Humidity: {data['humidity']}%  Pressure: {data['pressure']} hPa")
    lines.append(f"Wind speed: {data['wind_speed']}")
    return "\n".join(lines)

def _format_forecast(items, units):
    symbol = "°C" if units == "metric" else "°F" if units == "imperial" else "K"
    lines = []
    for it in items:
        lines.append(
            f"{it['date']}: {it['description'].capitalize()}, "
            f"{it['temp']}{symbol} (min {it['temp_min']}{symbol}, max {it['temp_max']}{symbol})"
        )
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(prog="weather", description="Simple Weather App (CLI)")
    parser.add_argument("city", nargs="?", help="City name (e.g. London). If omitted and --gui not used, shows help.")
    parser.add_argument("--units", "-u", choices=["metric", "imperial", "standard"], default="metric", help="Units system")
    parser.add_argument("--forecast", "-f", type=int, default=0, help="Show forecast for N days (1-5).")
    parser.add_argument("--gui", action="store_true", help="Launch the Tkinter GUI.")
    args = parser.parse_args()

    if args.gui:
        import gui
        gui.run_gui()
        return

    if not args.city:
        parser.print_help()
        sys.exit(0)

    try:
        if args.forecast:
            items = get_forecast(args.city, units=args.units, days=args.forecast)
            print(_format_forecast(items, args.units))
        else:
            cur = get_current_weather(args.city, units=args.units)
            print(_format_current(cur, args.units))
    except Exception as e:
        print("Error:", e, file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
