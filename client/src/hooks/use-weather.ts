import { useQuery } from "@tanstack/react-query";

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
  precipitation: number;
  humidity: number;
  alerts: WeatherAlert[];
}

export interface WeatherAlert {
  type: "rain" | "wind" | "storm";
  message: string;
  severity: "warning" | "danger";
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  precipitationSum: number;
  precipitationProbability: number;
  windSpeedMax: number;
}

export interface DetailedWeatherData extends WeatherData {
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "Céu limpo", icon: "sun" },
  1: { description: "Principalmente limpo", icon: "sun" },
  2: { description: "Parcialmente nublado", icon: "cloud-sun" },
  3: { description: "Nublado", icon: "cloud" },
  45: { description: "Nevoeiro", icon: "cloud-fog" },
  48: { description: "Nevoeiro com geada", icon: "cloud-fog" },
  51: { description: "Chuvisco leve", icon: "cloud-drizzle" },
  53: { description: "Chuvisco moderado", icon: "cloud-drizzle" },
  55: { description: "Chuvisco intenso", icon: "cloud-drizzle" },
  56: { description: "Chuvisco gelado", icon: "cloud-drizzle" },
  57: { description: "Chuvisco gelado intenso", icon: "cloud-drizzle" },
  61: { description: "Chuva leve", icon: "cloud-rain" },
  63: { description: "Chuva moderada", icon: "cloud-rain" },
  65: { description: "Chuva forte", icon: "cloud-rain" },
  66: { description: "Chuva gelada", icon: "cloud-rain" },
  67: { description: "Chuva gelada intensa", icon: "cloud-rain" },
  71: { description: "Neve leve", icon: "snowflake" },
  73: { description: "Neve moderada", icon: "snowflake" },
  75: { description: "Neve forte", icon: "snowflake" },
  77: { description: "Grãos de neve", icon: "snowflake" },
  80: { description: "Aguaceiros leves", icon: "cloud-rain" },
  81: { description: "Aguaceiros moderados", icon: "cloud-rain" },
  82: { description: "Aguaceiros violentos", icon: "cloud-rain" },
  85: { description: "Aguaceiros de neve", icon: "snowflake" },
  86: { description: "Aguaceiros de neve intensos", icon: "snowflake" },
  95: { description: "Trovoada", icon: "cloud-lightning" },
  96: { description: "Trovoada com granizo", icon: "cloud-lightning" },
  99: { description: "Trovoada com granizo forte", icon: "cloud-lightning" },
};

export function getWeatherInfo(code: number) {
  return WEATHER_CODES[code] || { description: "Desconhecido", icon: "cloud" };
}

function generateAlerts(
  currentWindSpeed: number,
  hourlyData: HourlyForecast[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const next6Hours = hourlyData.filter((h) => {
    const time = new Date(h.time);
    return time > now && time <= new Date(now.getTime() + 6 * 60 * 60 * 1000);
  });

  if (currentWindSpeed >= 50) {
    alerts.push({
      type: "wind",
      message: `Vento muito forte: ${Math.round(currentWindSpeed)} km/h`,
      severity: "danger",
    });
  } else if (currentWindSpeed >= 35) {
    alerts.push({
      type: "wind",
      message: `Vento forte: ${Math.round(currentWindSpeed)} km/h`,
      severity: "warning",
    });
  }

  const rainHours = next6Hours.filter(
    (h) => h.precipitation > 0.5 || (h.weatherCode >= 61 && h.weatherCode <= 67)
  );
  if (rainHours.length > 0) {
    const firstRain = new Date(rainHours[0].time);
    const hoursUntilRain = Math.round(
      (firstRain.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
    if (hoursUntilRain <= 1) {
      alerts.push({
        type: "rain",
        message: "Chuva prevista dentro de 1 hora",
        severity: "warning",
      });
    } else {
      alerts.push({
        type: "rain",
        message: `Chuva prevista em ${hoursUntilRain} horas`,
        severity: "warning",
      });
    }
  }

  const stormHours = next6Hours.filter((h) => h.weatherCode >= 95);
  if (stormHours.length > 0) {
    alerts.push({
      type: "storm",
      message: "Trovoada prevista nas próximas horas",
      severity: "danger",
    });
  }

  return alerts;
}

async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,is_day,precipitation,relative_humidity_2m&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code&timezone=auto&forecast_days=1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Erro ao obter dados meteorológicos");
  }

  const data = await response.json();

  const hourlyForecast: HourlyForecast[] = data.hourly.time.map(
    (time: string, i: number) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      precipitation: data.hourly.precipitation[i],
      precipitationProbability: data.hourly.precipitation_probability[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      weatherCode: data.hourly.weather_code[i],
    })
  );

  const alerts = generateAlerts(data.current.wind_speed_10m, hourlyForecast);

  return {
    temperature: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    isDay: data.current.is_day === 1,
    precipitation: data.current.precipitation,
    humidity: data.current.relative_humidity_2m,
    alerts,
  };
}

async function fetchDetailedWeather(
  latitude: number,
  longitude: number
): Promise<DetailedWeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,is_day,precipitation,relative_humidity_2m&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Erro ao obter dados meteorológicos");
  }

  const data = await response.json();

  const hourlyForecast: HourlyForecast[] = data.hourly.time.map(
    (time: string, i: number) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      precipitation: data.hourly.precipitation[i],
      precipitationProbability: data.hourly.precipitation_probability[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      weatherCode: data.hourly.weather_code[i],
    })
  );

  const dailyForecast: DailyForecast[] = data.daily.time.map(
    (date: string, i: number) => ({
      date,
      temperatureMax: Math.round(data.daily.temperature_2m_max[i]),
      temperatureMin: Math.round(data.daily.temperature_2m_min[i]),
      weatherCode: data.daily.weather_code[i],
      precipitationSum: data.daily.precipitation_sum[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
      windSpeedMax: data.daily.wind_speed_10m_max[i],
    })
  );

  const alerts = generateAlerts(data.current.wind_speed_10m, hourlyForecast);

  return {
    temperature: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    isDay: data.current.is_day === 1,
    precipitation: data.current.precipitation,
    humidity: data.current.relative_humidity_2m,
    alerts,
    hourly: hourlyForecast,
    daily: dailyForecast,
  };
}

export function useWeather(latitude = 39.2417, longitude = -9.3128) {
  return useQuery({
    queryKey: ["weather", latitude, longitude],
    queryFn: () => fetchWeather(latitude, longitude),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });
}

export function useDetailedWeather(latitude = 39.2417, longitude = -9.3128) {
  return useQuery({
    queryKey: ["weather-detailed", latitude, longitude],
    queryFn: () => fetchDetailedWeather(latitude, longitude),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });
}
