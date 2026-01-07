import { useState } from "react";
import { useAppointments } from "@/hooks/use-appointments";
import { BottomNav } from "@/components/BottomNav";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, isSameDay } from "date-fns";
import { Loader2, MapPin, Clock } from "lucide-react";
import { Link } from "wouter";

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  // Fetch all appointments - in a real app might want to fetch by month range
  const { data: appointments, isLoading } = useAppointments();

  const selectedDateAppointments = appointments?.filter(apt => 
    date && isSameDay(new Date(apt.date), date)
  ) || [];

  // Modifiers for the calendar to show dots on days with events
  const daysWithAppointments = appointments?.map(a => new Date(a.date)) || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="pt-8 px-6 mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Schedule</h1>
      </div>

      <div className="mx-6 bg-card rounded-2xl border border-border/50 shadow-sm p-2 mb-6">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={setDate}
          modifiers={{ hasAppointment: daysWithAppointments }}
          modifiersStyles={{
            hasAppointment: { 
              fontWeight: 'bold', 
              color: 'var(--primary)',
              textDecoration: 'underline'
            }
          }}
          styles={{
            caption: { color: 'var(--primary)' },
            head_cell: { color: 'var(--muted-foreground)' },
            day_selected: { 
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: '50%'
            }
          }}
          className="mx-auto"
        />
      </div>

      <div className="px-6 space-y-4">
        <h2 className="text-lg font-bold font-display">
          {date ? format(date, "EEEE, MMMM d") : "Select a date"}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : selectedDateAppointments.length > 0 ? (
          <div className="space-y-3">
            {selectedDateAppointments.map(apt => (
              <Link key={apt.id} href={`/clients/${apt.clientId}`}>
                <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-foreground">{apt.client.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(apt.date), "h:mm a")}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold
                      ${apt.type === 'Garden' ? 'bg-green-100 text-green-700' : 
                        apt.type === 'Pool' ? 'bg-blue-100 text-blue-700' : 
                        'bg-orange-100 text-orange-700'}`
                    }>
                      {apt.type}
                    </div>
                  </div>
                  {apt.client.address && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                      <MapPin className="w-3.5 h-3.5" />
                      {apt.client.address}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
            <p>No appointments scheduled.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
