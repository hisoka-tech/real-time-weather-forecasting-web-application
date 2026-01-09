const apiKey = "c90459cc35b99d3c0d9f9127529cef91";

document.getElementById("searchBtn").addEventListener("click", () => {
    const city = document.getElementById("cityInput").value.trim();
    if (city) {
        getWeather(city);
    }
});

async function getWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);

    // City not found
    if (!response.ok) {
      showError("City not found. Try again.");
      return;
    }

    const data = await response.json();
    updateUI(data);

    // Fetch forecast and show summarized 5-day forecast
    const forecastData = await fetchForecast(city);
    const days = summarizeForecast(forecastData);
    displayForecast(days);

  } catch (error) {
    showError("Network error. Please try again.");
  }
}

function getWeatherClass(id) {
    if (id === 800) {
        return 'clear';
    } else if (id >= 200 && id < 300) {
        return 'thunderstorm';
    } else if (id >= 300 && id < 400) {
        return 'drizzle';
    } else if (id >= 500 && id < 600) {
        return 'rain';
    } else if (id >= 600 && id < 700) {
        return 'snow';
    } else if (id >= 700 && id < 800) {
        return 'clouds';
    } else if (id > 800 && id < 900) {
        return 'clouds';
    } else {
        return 'clouds';
    }
}
// Fetch 5-day / 3-hour forecast for the given city
async function fetchForecast(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Forecast fetch error:", err);
    return null;
  }
}

// Summarize forecast: pick one representative entry per day (closest to 12:00)
function summarizeForecast(forecastData) {
  if (!forecastData || !forecastData.list) return [];

  // Group entries by date string 'YYYY-MM-DD'
  const groups = {};
  forecastData.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    groups[date] = groups[date] || [];
    groups[date].push(item);
  });

  // For each date, pick the entry closest to 12:00:00 (midday), and compute min/max temps
  const summaries = Object.keys(groups).map(date => {
    const entries = groups[date];

    // find entry closest to midday
    const middayTarget = "12:00:00";
    let chosen = entries.reduce((best, curr) => {
      const bestDiff = Math.abs(new Date(best.dt_txt).getHours() - 12);
      const currDiff = Math.abs(new Date(curr.dt_txt).getHours() - 12);
      return currDiff < bestDiff ? curr : best;
    }, entries[0]);

    // compute min and max temps for the day
    const temps = entries.map(e => e.main.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    return {
      date,
      icon: chosen.weather[0].icon,
      id: chosen.weather[0].id,
      description: chosen.weather[0].description,
      temp_min: Math.round(minTemp),
      temp_max: Math.round(maxTemp),
    };
  });

  // Sort by date ascending and take next 5 days (skip today if you want only future days)
  summaries.sort((a,b) => a.date.localeCompare(b.date));

  // Optionally, drop the first date if you prefer only future days and current day is included.
  // For this implementation we'll include next 5 calendar days (including today)
  return summaries.slice(0, 5);
}
function displayForecast(days) {
  const forecastEl = document.getElementById("forecast");
  const cardsContainer = document.getElementById("forecastCards");

  if (!days || days.length === 0) {
    forecastEl.classList.add("hidden");
    return;
  }

  // Clear previous
  cardsContainer.innerHTML = "";

  days.forEach(day => {
    const card = document.createElement("div");
    card.className = "forecast-card";

    // Date label (friendly)
    const dateObj = new Date(day.date + "T00:00:00");
    const options = { weekday: "short", month: "short", day: "numeric" };
    const dateLabel = dateObj.toLocaleDateString(undefined, options);

    // OpenWeather icon URL
    const iconUrl = `https://openweathermap.org/img/wn/${day.icon}@2x.png`;

    card.innerHTML = `
      <div class="forecast-date">${dateLabel}</div>
      <img src="${iconUrl}" alt="${day.description}" />
      <div class="forecast-desc">${day.description}</div>
      <div class="forecast-temps">${day.temp_min}° / ${day.temp_max}°</div>
    `;

    cardsContainer.appendChild(card);
  });

  forecastEl.classList.remove("hidden");
}

function updateUI(data) {
    document.getElementById("error").textContent = "";

    document.getElementById("cityName").textContent = data.name;
    document.getElementById("temp").textContent = data.main.temp;
    document.getElementById("humidity").textContent = data.main.humidity;
    document.getElementById("wind").textContent = data.wind.speed;
    document.getElementById("condition").textContent = data.weather[0].description;

    document.getElementById("weatherBox").classList.remove("hidden");

    // ===== APPLY WEATHER BACKGROUND =====
    const id = data.weather[0].id;  // weather condition ID
    const weatherClass = getWeatherClass(id);

    // Remove previous weather classes
    document.body.className = "";

    // Add new weather class
    document.body.classList.add(weatherClass);

    // Detect night mode using "10d" or "10n" icon
    const icon = data.weather[0].icon;
    if (icon.endsWith("n")) {
        document.body.classList.add("night");
    }
}

function showError(message) {
  document.getElementById("weatherBox").classList.add("hidden");
  document.getElementById("forecast").classList.add("hidden");  // hide forecast too
  document.getElementById("error").textContent = message;
}
