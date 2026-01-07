import { Button } from "@/components/ui/button";
import { Leaf, Waves, ThermometerSun } from "lucide-react";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="flex justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 shadow-sm rotate-[-6deg]">
            <Leaf className="w-6 h-6" />
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 shadow-sm z-10 -mt-2">
            <Waves className="w-6 h-6" />
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-700 shadow-sm rotate-[6deg]">
            <ThermometerSun className="w-6 h-6" />
          </div>
        </div>

        <h1 className="text-4xl font-display font-bold text-foreground mb-3">Service Pro</h1>
        <p className="text-muted-foreground mb-12 text-lg">
          Manage your gardening, pool, and spa services with ease.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={handleLogin}
            className="w-full h-14 text-lg font-semibold rounded-2xl shadow-xl shadow-primary/20 btn-primary"
          >
            Get Started
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          Professional Service Management
        </p>
      </div>
    </div>
  );
}
