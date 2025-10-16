// ====== CONFIG ======
const WEATHER_API_KEY = "your api key"; 
const NEWS_API_KEY = "your api key";

// DOM Elements
const weatherForm = document.getElementById("weatherForm");
const searchInput = document.getElementById("searchInput");
const locationBtn = document.getElementById("locationBtn");
const currentLocationEl = document.getElementById("currentLocation");
const currentTimeEl = document.getElementById("currentTime");
const currentConditionEl = document.getElementById("currentCondition");
const currentTempEl = document.getElementById("currentTemp");
const currentHighLowEl = document.getElementById("currentHighLow");
const humidityEl = document.getElementById("humidity");
const uvIndexEl = document.getElementById("uvIndex");
const windSpeedEl = document.getElementById("windSpeed");
const precipitationEl = document.getElementById("precipitation");
const hourlyForecastEl = document.getElementById("hourlyForecast");
const dailyForecastEl = document.getElementById("dailyForecast");
const newsCardsEl = document.getElementById("newsCards");
const newsLocationSelect = document.getElementById("newsLocationSelect");

// ====== MAIN FUNCTIONS ======

// Fetch coordinates from city name
async function getCoordinates(city) {
    const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}`
    );
    if (!res.ok) {
        throw new Error(`City not found: ${city}`);
    }
    const data = await res.json();
    return { lat: data.coord.lat, lon: data.coord.lon, name: `${data.name}, ${data.sys.country}` };
}

// Fetch weather data x
// Fetch current + forecast weather separately
async function getWeather(lat, lon) {
    // Current
    const currentRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
    );
    if (!currentRes.ok) throw new Error("Current weather data error");
    const currentData = await currentRes.json();

    // Forecast (3-hour intervals)
    const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
    );
    if (!forecastRes.ok) throw new Error("Forecast data error");
    const forecastData = await forecastRes.json();

    // Convert forecast into a fake 'daily' + 'hourly'
    const hourly = forecastData.list.slice(0, 12).map(f => ({
        dt: f.dt,
        temp: f.main.temp,
        weather: f.weather,
    }));

    const dailyMap = {};
    forecastData.list.forEach(f => {
        const date = new Date(f.dt * 1000).toDateString();
        if (!dailyMap[date]) {
            dailyMap[date] = {
                dt: f.dt,
                temp: { min: f.main.temp, max: f.main.temp },
                pop: f.pop || 0,
                weather: f.weather,
            };
        } else {
            dailyMap[date].temp.min = Math.min(dailyMap[date].temp.min, f.main.temp);
            dailyMap[date].temp.max = Math.max(dailyMap[date].temp.max, f.main.temp);
        }
    });

    const daily = Object.values(dailyMap);

    // Match One Call structure
    return {
        current: {
            temp: currentData.main.temp,
            humidity: currentData.main.humidity,
            uvi: 0, // no UV from free API
            wind_speed: currentData.wind.speed,
            weather: currentData.weather,
        },
        hourly,
        daily,
    };
}



// Display weather in UI
function displayWeather(locationName, data) {
    currentLocationEl.textContent = locationName;
    currentTimeEl.textContent = new Date().toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
    });
    currentConditionEl.textContent = data.current.weather[0].description;
    currentTempEl.textContent = `${Math.round(data.current.temp)}°`;
    currentHighLowEl.textContent = `H:${Math.round(data.daily[0].temp.max)}° L:${Math.round(data.daily[0].temp.min)}°`;
    humidityEl.textContent = `Humidity: ${data.current.humidity}%`;
    uvIndexEl.textContent = `UV Index: ${data.current.uvi}`;
    windSpeedEl.textContent = `Wind: ${Math.round(data.current.wind_speed)} m/s`;
    precipitationEl.textContent = `Precip: ${data.daily[0].pop * 100}%`;

    // Hourly
    hourlyForecastEl.innerHTML = "";
    data.hourly.slice(0, 12).forEach(hour => {
        const time = new Date(hour.dt * 1000).toLocaleTimeString([], { hour: "numeric" });
        const temp = `${Math.round(hour.temp)}°`;
        const icon = hour.weather[0].icon;
        hourlyForecastEl.innerHTML += `
            <div class="flex flex-col items-center px-3">
                <span class="text-sm">${time}</span>
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="" />
                <span class="font-medium">${temp}</span>
            </div>
        `;
    });

    // Daily
    dailyForecastEl.innerHTML = "";
    data.daily.slice(1, 8).forEach(day => {
        const date = new Date(day.dt * 1000).toLocaleDateString("en-US", { weekday: "short" });
        const temp = `H:${Math.round(day.temp.max)}° L:${Math.round(day.temp.min)}°`;
        const icon = day.weather[0].icon;
        dailyForecastEl.innerHTML += `
            <div class="flex justify-between items-center">
                <span>${date}</span>
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="" />
                <span>${temp}</span>
            </div>
        `;
    });
}

// Fetch and display news (CHANGED: added error check)
async function fetchNews(query) {
    const res = await fetch(
        `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=6&apiKey=${NEWS_API_KEY}`
    );
    const data = await res.json();

    if (data.status !== "ok") { // NEW
        newsCardsEl.innerHTML = `<p class="text-red-500">News API error: ${data.message}</p>`; // NEW
        return; // NEW
    }

    newsCardsEl.innerHTML = "";
    data.articles.forEach(article => {
        newsCardsEl.innerHTML += `
            <div class="bg-white rounded-lg shadow p-4">
                <img src="${article.urlToImage || ''}" alt="" class="rounded mb-3" />
                <h3 class="font-bold mb-2">${article.title}</h3>
                <p class="text-sm text-gray-600 mb-3">${article.description || ""}</p>
                <a href="${article.url}" target="_blank" class="text-blue-500 text-sm">Read more</a>
            </div>
        `;
    });
}

// ====== EVENT LISTENERS ======
weatherForm.addEventListener("submit", async e => {
    e.preventDefault();
    try {
        const city = searchInput.value.trim();
        if (!city) return;
        const { lat, lon, name } = await getCoordinates(city);
        const weatherData = await getWeather(lat, lon);
        displayWeather(name, weatherData);
        fetchNews(city);
    } catch (err) {
        alert(err.message);
    }
});

locationBtn.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(async position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`
        );
        const data = await res.json();
        const name = `${data.name}, ${data.sys.country}`;
        const weatherData = await getWeather(lat, lon);
        displayWeather(name, weatherData);
        fetchNews(data.name);
    }, () => alert("Location access denied"));
});

newsLocationSelect.addEventListener("change", () => {
    const val = newsLocationSelect.value;
    let city = "current";
    switch (val) {
        case "new_york": city = "New York"; break;
        case "london": city = "London"; break;
        case "tokyo": city = "Tokyo"; break;
        case "paris": city = "Paris"; break;
        default: city = "India";
    }
    fetchNews(city);
});

// ====== INIT ======
(async function init() {
    try {
        navigator.geolocation.getCurrentPosition(async position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const res = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`
            );
            const data = await res.json();
            const name = `${data.name}, ${data.sys.country}`;
            const weatherData = await getWeather(lat, lon);
            displayWeather(name, weatherData);
            fetchNews(data.name);
        }, async () => {
            const { lat, lon, name } = await getCoordinates("New York");
            const weatherData = await getWeather(lat, lon);
            displayWeather(name, weatherData);
            fetchNews("New York");
        });
    } catch (err) {
        console.error(err);
    }
})();
