import { useMemo } from "react";
import { CheckCircle2, Calendar, Camera } from "lucide-react";
import type { ServiceLog, Appointment, QuickPhoto } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  date: Date;
  type: "service" | "appointment" | "photo";
  title: string;
  description?: string;
  serviceType?: string;
  photos?: string[];
  isCompleted?: boolean;
}

export function ClientTimeline({
  logs,
  appointments,
  quickPhotos
}: {
  logs: ServiceLog[];
  appointments: Appointment[];
  quickPhotos: QuickPhoto[];
}) {
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    logs.forEach((log) => {
      const photos = [
        ...(log.photosBefore || []),
        ...(log.photosAfter || []),
      ];
      allEvents.push({
        id: `log-${log.id}`,
        date: new Date(log.date),
        type: "service",
        title: log.type === "Garden" ? "Serviço de Jardim" :
               log.type === "Pool" ? "Serviço de Piscina" :
               log.type === "Jacuzzi" ? "Serviço de Jacuzzi" : "Serviço Geral",
        description: log.description || undefined,
        serviceType: log.type,
        photos: photos.length > 0 ? photos : undefined,
        isCompleted: true,
      });
    });

    appointments.forEach((apt) => {
      allEvents.push({
        id: `apt-${apt.id}`,
        date: new Date(apt.date),
        type: "appointment",
        title: apt.type === "Garden" ? "Agendamento Jardim" :
               apt.type === "Pool" ? "Agendamento Piscina" :
               apt.type === "Jacuzzi" ? "Agendamento Jacuzzi" : "Agendamento",
        description: apt.notes || undefined,
        serviceType: apt.type,
        isCompleted: apt.isCompleted || false,
      });
    });

    quickPhotos.forEach((photo) => {
      allEvents.push({
        id: `photo-${photo.id}`,
        date: new Date(photo.createdAt!),
        type: "photo",
        title: "Captura Rápida",
        description: photo.notes || undefined,
        serviceType: photo.serviceType || "Geral",
        photos: [photo.photoUrl],
      });
    });

    return allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [logs, appointments, quickPhotos]);

  const eventsByMonth = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    events.forEach((event) => {
      const monthKey = format(event.date, "yyyy-MM");
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(event);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case "service":
        return <CheckCircle2 className="w-4 h-4" />;
      case "appointment":
        return event.isCompleted
          ? <CheckCircle2 className="w-4 h-4" />
          : <Calendar className="w-4 h-4" />;
      case "photo":
        return <Camera className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getEventColor = (event: TimelineEvent) => {
    if (event.type === "photo") return "bg-pink-500";
    switch (event.serviceType) {
      case "Garden": return "bg-green-500";
      case "Pool": return "bg-blue-500";
      case "Jacuzzi": return "bg-muted-foreground";
      default: return "bg-gray-500";
    }
  };

  const getEventBadgeClass = (event: TimelineEvent) => {
    if (event.type === "photo") return "bg-pink-100 text-pink-700 border-pink-200";
    switch (event.serviceType) {
      case "Garden": return "bg-green-100 text-green-700 border-green-200";
      case "Pool": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Jacuzzi": return "bg-muted text-muted-foreground border-border";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Ainda sem histórico para este cliente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-lg">Timeline do Cliente</h3>

      {eventsByMonth.map(([monthKey, monthEvents]) => {
        const [year, month] = monthKey.split("-");
        const monthDate = new Date(parseInt(year), parseInt(month) - 1);
        const monthLabel = format(monthDate, "MMMM yyyy", { locale: pt });

        return (
          <div key={monthKey} className="relative">
            <div className="sticky top-0 z-10 bg-background py-2">
              <Badge variant="outline" className="text-xs font-semibold capitalize">
                {monthLabel}
              </Badge>
            </div>

            <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-4 pb-4">
              {monthEvents.map((event, idx) => (
                <div
                  key={event.id}
                  className="relative"
                  data-testid={`timeline-event-${event.id}`}
                >
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full ${getEventColor(event)} flex items-center justify-center text-white`}>
                    <span className="w-2 h-2 bg-white rounded-full" />
                  </div>

                  <div className="bg-card border border-border/50 rounded-xl p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${getEventBadgeClass(event)}`}>
                          {getEventIcon(event)}
                        </div>
                        <span className="font-medium text-sm">{event.title}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(event.date, "d MMM, HH:mm", { locale: pt })}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {event.photos && event.photos.length > 0 && (
                      <div className="flex gap-1 mt-2 overflow-x-auto">
                        {event.photos.slice(0, 4).map((photo, photoIdx) => (
                          <img
                            key={photoIdx}
                            src={photo}
                            alt={`Foto ${photoIdx + 1}`}
                            className="w-12 h-12 object-cover rounded-lg shrink-0"
                          />
                        ))}
                        {event.photos.length > 4 && (
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-xs text-muted-foreground">+{event.photos.length - 4}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {event.type === "appointment" && !event.isCompleted && (
                      <Badge variant="outline" className="mt-2 text-[10px] bg-muted text-muted-foreground border-border">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
