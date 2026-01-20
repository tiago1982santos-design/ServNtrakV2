import { useDetailedWeather, getWeatherInfo } from "@/hooks/use-weather";
import { BottomNav } from "@/components/BottomNav";
import { format, isToday, isTomorrow } from "date-fns";
import { pt } from "date-fns/locale";
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
  CloudMoon,
  Thermometer,
  Loader2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BackButton } from "@/components/BackButton";

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

const nightIconMap: Record<string, typeof Moon> = {
  sun: Moon,
  "cloud-sun": CloudMoon,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  "cloud-lightning": CloudLightning,
  "cloud-fog": CloudFog,
  snowflake: Snowflake,
};

function getIconForHour(weatherCode: number, hour: number) {
  const isNight = hour < 7 || hour >= 20;
  const weatherInfo = getWeatherInfo(weatherCode);
  if (isNight) {
    return nightIconMap[weatherInfo.icon] || Cloud;
  }
  return iconMap[weatherInfo.icon] || Cloud;
}

function getDayName(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return format(date, "EEEE", { locale: pt });
}

export default function Weather() {
  const { data: weather, isLoading, error } = useDetailedWeather();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <BottomNav />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Meteorologia</h1>
          <p className="text-muted-foreground mt-4">Erro ao carregar dados meteorológicos</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const weatherInfo = getWeatherInfo(weather.weatherCode);
  const CurrentIcon = weather.isDay
    ? iconMap[weatherInfo.icon] || Cloud
    : nightIconMap[weatherInfo.icon] || Moon;

  const now = new Date();
  const currentHour = now.getHours();
  const next24Hours = weather.hourly
    .filter((h) => new Date(h.time) >= now)
    .slice(0, 24);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <BackButton />
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Lourinhã</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-bold text-white">{weather.temperature}°</span>
                <span className="text-xl text-white/60 mb-2">C</span>
              </div>
              <p className="text-lg text-white/90 mt-1 capitalize">{weatherInfo.description}</p>
            </div>

            <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center">
              <CurrentIcon className="w-16 h-16 text-white" />
            </div>
          </div>

          <div className="flex gap-6 mt-6">
            <div className="flex items-center gap-2 text-white/80">
              <Wind className="w-5 h-5" />
              <span className="text-sm">{Math.round(weather.windSpeed)} km/h</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Droplets className="w-5 h-5" />
              <span className="text-sm">{weather.humidity}%</span>
            </div>
            {weather.precipitation > 0 && (
              <div className="flex items-center gap-2 text-white/80">
                <CloudRain className="w-5 h-5" />
                <span className="text-sm">{weather.precipitation} mm</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        {weather.alerts.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Avisos</h2>
            <div className="space-y-2">
              {weather.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                    alert.severity === "danger"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  )}
                  data-testid={`weather-alert-${alert.type}`}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">Próximas Horas</h2>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-4">
              {next24Hours.map((hour, index) => {
                const time = new Date(hour.time);
                const hourNum = time.getHours();
                const HourIcon = getIconForHour(hour.weatherCode, hourNum);
                const isNow = index === 0;

                return (
                  <div
                    key={hour.time}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl px-4 py-3 min-w-[72px] border",
                      isNow
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border"
                    )}
                    data-testid={`hourly-forecast-${index}`}
                  >
                    <span className={cn("text-xs font-medium", isNow ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {isNow ? "Agora" : format(time, "HH:mm")}
                    </span>
                    <HourIcon className={cn("w-6 h-6", isNow ? "text-primary-foreground" : "text-foreground")} />
                    <span className={cn("text-sm font-bold", isNow ? "text-primary-foreground" : "text-foreground")}>
                      {Math.round(hour.temperature)}°
                    </span>
                    {hour.precipitationProbability > 20 && (
                      <div className={cn("flex items-center gap-1 text-xs", isNow ? "text-primary-foreground/80" : "text-blue-500")}>
                        <Droplets className="w-3 h-3" />
                        {hour.precipitationProbability}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">Próximos 7 Dias</h2>
          <div className="space-y-2">
            {weather.daily.map((day, index) => {
              const DayIcon = iconMap[getWeatherInfo(day.weatherCode).icon] || Cloud;
              const dayName = getDayName(day.date);

              return (
                <div
                  key={day.date}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-3 bg-card border border-border",
                    index === 0 && "bg-primary/5 border-primary/20"
                  )}
                  data-testid={`daily-forecast-${index}`}
                >
                  <div className="w-20">
                    <span className={cn("text-sm font-medium capitalize", index === 0 ? "text-primary" : "text-foreground")}>
                      {dayName}
                    </span>
                  </div>

                  <DayIcon className="w-6 h-6 text-muted-foreground" />

                  <div className="flex-1 flex items-center justify-end gap-4">
                    {day.precipitationProbability > 20 && (
                      <div className="flex items-center gap-1 text-xs text-blue-500">
                        <Droplets className="w-3 h-3" />
                        {day.precipitationProbability}%
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{day.temperatureMin}°</span>
                      <div className="w-12 h-1.5 bg-gradient-to-r from-blue-400 to-orange-400 rounded-full" />
                      <span className="font-medium text-foreground">{day.temperatureMax}°</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
