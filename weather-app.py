import argparse
import requests

API_KEY = "cfc96543d31009dcf6469485362c5e7b"
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

def get_weather(city: str):
  params = {'q': city, 'appid': API_KEY, 'units': 'metrics'}
  response = requests.get(BASE_URL, params=params)
  if response.status_code == 200:
    data = response.json()
    temp = data['main']['temp']
    desc = data['weather'][0]['description']
    print(f"Weather in {city}: {temp}°C, {desc}")
  else:
    print('Error:', response.json().get('message', 'Failed to fetch data'))

def main():
  parser = argparse.ArgumentParser(description='Simple CLI Weather App')
  parser.add_argument('city', type=str, help='City name to check weather for')
  args = parser.parse_args()

  get_weather(args.city)

if __name__ == '__main__':
  main()