import { Link, useLocation } from "wouter";
import { Home, Calendar, Users, MapPin, CloudSun, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Início" },
    { href: "/clients", icon: Users, label: "Clientes" },
    { href: "/weather", icon: CloudSun, label: "Tempo" },
    { href: "/calendar", icon: Calendar, label: "Agenda" },
    { href: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe pt-1 px-2 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
      <div className="flex justify-around items-center max-w-md mx-auto h-14">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-300",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
