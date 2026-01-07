import { Link, useLocation } from "wouter";
import { Home, Calendar, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
    { href: "/clients", icon: Users, label: "Clients" },
    { href: "/profile", icon: Settings, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe pt-2 px-6 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
      <div className="flex justify-between items-center max-w-md mx-auto h-16 pb-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300",
              isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
            )}>
              <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
