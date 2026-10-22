# 🌦️ Weather App — Live Weather Forecast

A responsive weather application built using **HTML, CSS, JavaScript, and React.js**, powered by the OpenWeather API. Search for any city to view real-time weather conditions, explore a 5-day forecast, and check the weather at your current location.

## 🚀 Live Demo

**[🌐 View Live Weather App](https://weatherappayush.netlify.app/)**

## ✨ Features

- 🔍 **City Search** — Get weather information for any city.
- 📍 **Current Location** — Fetch local weather using browser geolocation.
- 🌡️ **Real-Time Weather** — View current temperature and weather conditions.
- 📅 **5-Day Forecast** — Check upcoming weather forecasts.
- 🌤️ **Detailed Weather Information** — View feels-like temperature, humidity, wind speed, and atmospheric pressure.
- 🔄 **Temperature Toggle** — Switch between Celsius (°C) and Fahrenheit (°F).
- ⏳ **Loading States** — Get feedback while weather data loads.
- ⚠️ **Error Handling** — Display helpful messages for invalid cities and API errors.
- 📱 **Responsive Design** — Access the application across different screen sizes.
- ⚛️ **Two Implementations** — Choose between vanilla JavaScript and React.js.

## 🛠️ Technologies Used

- **HTML5** — Application structure
- **CSS3** — Styling and responsive layouts
- **JavaScript (ES6+)** — Application logic and API integration
- **React.js 18** — Component-based UI for the React version
- **OpenWeather API** — Real-time weather and forecast data
- **Browser Geolocation API** — Current location detection
- **Netlify** — Live deployment

## 📂 Project Structure

```text
weather-app/
├── vanilla/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── react/
│   └── index.html
│
└── README.md
```

- `vanilla/` — Built with HTML, CSS, and vanilla JavaScript.
- `react/` — Built with React 18 loaded through a CDN, without a build step.

*Note: The file structure above is illustrative. Adjust the filenames if your actual project differs.*

## ⚙️ Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd weather-app
```

### 2. Get an OpenWeather API Key

1. Create a free account at [OpenWeather](https://openweathermap.org/).
2. Visit the [API Keys page](https://home.openweathermap.org/api_keys).
3. Generate or copy your API key.

New API keys may take up to approximately two hours to activate.

### 3. Configure the API Key

Add your API key to the appropriate location in each implementation.

**Vanilla JavaScript:** `vanilla/script.js`

```javascript
const API_KEY = "YOUR_OPENWEATHER_API_KEY";
```

**React version:** `react/index.html`

Add the key wherever the API configuration is defined in your React implementation.

Replace `YOUR_OPENWEATHER_API_KEY` with your actual key.

### 4. Run the Application

You can use either implementation.

**Option A: Vanilla JavaScript**

```bash
cd vanilla
python3 -m http.server 8000
```

**Option B: React.js**

```bash
cd react
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

You can also use VS Code Live Server. Running through `localhost` or HTTPS is recommended for browser geolocation.

## 🌐 API Endpoints

This application uses the OpenWeather API.

| Purpose | Endpoint |
|---|---|
| Current Weather | `/data/2.5/weather` |
| 5-Day Forecast | `/data/2.5/forecast` |
| Weather Icons | `https://openweathermap.org/img/wn/{icon}@2x.png` |

Example current weather request:

```text
https://api.openweathermap.org/data/2.5/weather?q=London&units=metric&appid=YOUR_API_KEY
```

The `units` parameter supports metric (Celsius) and imperial (Fahrenheit) measurements.

## 🔐 API Key Security

The application makes API requests directly from the browser, meaning the API key can be exposed to visitors.

This approach is suitable for learning and personal projects. **For production deployments, use a backend or serverless function to protect your API key**, and configure appropriate API usage limits.

If you have already deployed a publicly exposed key, review your OpenWeather account settings and rotate the key if necessary.

## 🎯 What I Learned

- Integrating third-party APIs using JavaScript's Fetch API.
- Handling asynchronous requests and JSON responses.
- Building interactive interfaces with vanilla JavaScript and React.
- Implementing browser geolocation.
- Managing loading states and API errors.
- Working with temperature conversions and weather data.
- Deploying a web application using Netlify.

## 🔮 Future Improvements

- Weather forecasts by hour.
- Recent city search history.
- Automatic theme changes based on weather conditions.
- Weather maps and radar integration.
- Improved accessibility and offline-friendly error handling.

## 👨‍💻 Author

**Ayush Tiwari**

- GitHub: [Add your GitHub profile](https://github.com/)
- Live Project: [Weather App](https://weatherappayush.netlify.app/)

## 📄 License

This project is available for educational and personal use. Add a license file to the repository if you want to specify formal reuse and distribution permissions.

---

⭐ **If you find this project useful, consider giving the repository a star!**
