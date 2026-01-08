import { useWeather, getWeatherInfo } from "@/hooks/use-weather";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Snowflake,
  Wind,
  Droplets,
  AlertTriangle,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Sun> = {
  sun: Sun,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  "cloud-lightning": CloudLightning,
  "cloud-fog": CloudFog,
  snowflake: Snowflake,
};

interface WeatherWidgetProps {
  className?: string;
  showAlerts?: boolean;
}

export function WeatherWidget({
  className,
  showAlerts = true,
}: WeatherWidgetProps) {
  const { data: weather, isLoading, error } = useWeather();

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2",
          className
        )}
      >
        <div className="w-5 h-5 rounded-full bg-white/20 animate-pulse" />
        <div className="w-8 h-4 bg-white/20 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  const weatherInfo = getWeatherInfo(weather.weatherCode);
  const WeatherIcon = weather.isDay
    ? iconMap[weatherInfo.icon] || Cloud
    : weather.weatherCode === 0
      ? Moon
      : iconMap[weatherInfo.icon] || Cloud;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20"
          data-testid="weather-current"
        >
          <WeatherIcon className="w-5 h-5 text-white" />
          <span className="text-lg font-bold text-white">
            {weather.temperature}°
          </span>
        </div>

        {weather.windSpeed >= 25 && (
          <div
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-2 border border-white/20"
            data-testid="weather-wind"
          >
            <Wind className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/90">
              {Math.round(weather.windSpeed)} km/h
            </span>
          </div>
        )}

        {weather.precipitation > 0 && (
          <div
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-2 border border-white/20"
            data-testid="weather-rain"
          >
            <Droplets className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/90">
              {weather.precipitation} mm
            </span>
          </div>
        )}
      </div>

      {showAlerts && weather.alerts.length > 0 && (
        <div className="space-y-1.5" data-testid="weather-alerts">
          {weather.alerts.map((alert, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                alert.severity === "danger"
                  ? "bg-red-500/20 text-red-100 border border-red-400/30"
                  : "bg-amber-500/20 text-amber-100 border border-amber-400/30"
              )}
              data-testid={`weather-alert-${alert.type}`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WeatherWidgetCompact({ className }: { className?: string }) {
  const { data: weather, isLoading } = useWeather();

  if (isLoading || !weather) {
    return null;
  }

  const weatherInfo = getWeatherInfo(weather.weatherCode);
  const WeatherIcon = weather.isDay
    ? iconMap[weatherInfo.icon] || Cloud
    : weather.weatherCode === 0
      ? Moon
      : iconMap[weatherInfo.icon] || Cloud;

  const hasAlert = weather.alerts.length > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-white/90",
        hasAlert && "text-amber-200",
        className
      )}
      data-testid="weather-compact"
    >
      <WeatherIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{weather.temperature}°</span>
      {hasAlert && <AlertTriangle className="w-3 h-3 text-amber-300" />}
    </div>
  );
}
