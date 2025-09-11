# gui.py
import threading
import requests
from io import BytesIO
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk
from weather import get_current_weather

def run_gui():
    root = tk.Tk()
    root.title("Weather App")
    root.geometry("420x320")
    root.resizable(False, False)

    frame = ttk.Frame(root, padding=12)
    frame.pack(fill="both", expand=True)

    top = ttk.Frame(frame)
    top.pack(fill="x", pady=(0,8))

    lbl = ttk.Label(top, text="Enter city:")
    lbl.pack(side="left")

    entry = ttk.Entry(top, width=28)
    entry.pack(side="left", padx=(6,6))
    entry.focus()

    status = ttk.Label(frame, text="", anchor="w")
    status.pack(fill="x", pady=(6,2))

    result_frame = ttk.Frame(frame)
    result_frame.pack(fill="both", expand=True)

    city_label = ttk.Label(result_frame, text="", font=("TkDefaultFont", 14, "bold"))
    city_label.pack(anchor="w")

    weather_label = ttk.Label(result_frame, text="", wraplength=380, justify="left")
    weather_label.pack(anchor="w", pady=(6,0))

    icon_label = ttk.Label(result_frame)
    icon_label.pack(anchor="ne")

    def _show_error(msg):
        messagebox.showerror("Error", msg)
        status.config(text=msg)

    def _update_ui(data):
        city_label.config(text=data["city"])
        weather_label.config(text=f"{data['description'].capitalize()}\nTemp: {data['temp']}°C (feels like {data['feels_like']}°C)\nHumidity: {data['humidity']}%")
        status.config(text="")
        # download icon
        icon = data.get("icon")
        if icon:
            try:
                url = f"http://openweathermap.org/img/wn/{icon}@2x.png"
                r = requests.get(url, timeout=8)
                r.raise_for_status()
                img = Image.open(BytesIO(r.content)).resize((80, 80), Image.LANCZOS)
                photo = ImageTk.PhotoImage(img)
                icon_label.config(image=photo)
                icon_label.image = photo  # keep reference
            except Exception:
                icon_label.config(image="")
                icon_label.image = None

    def _fetch(city):
        try:
            status.config(text="Fetching...")
            data = get_current_weather(city, units="metric")
            root.after(0, _update_ui, data)
        except Exception as e:
            root.after(0, _show_error, str(e))

    def on_get():
        city = entry.get().strip()
        if not city:
            _show_error("Please type a city name.")
            return
        threading.Thread(target=_fetch, args=(city,), daemon=True).start()

    btn = ttk.Button(top, text="Get Weather", command=on_get)
    btn.pack(side="left")

    entry.bind("<Return>", lambda e: on_get())

    root.mainloop()
