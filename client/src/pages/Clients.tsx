import { useState } from "react";
import { useClients } from "@/hooks/use-clients";
import { BottomNav } from "@/components/BottomNav";
import { Link } from "wouter";
import { Search, MapPin, Leaf, Waves, ThermometerSun, Loader2, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CreateClientDialog } from "@/components/CreateClientDialog";

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState("");

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.address?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <CreateClientDialog />
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar clientes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-muted/50 border-none shadow-inner"
          />
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <div className="mobile-card cursor-pointer hover:bg-muted/30 group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {client.address || "Sem morada listada"}
                    </p>
                  </div>
                  {client.phone && (
                    <a 
                      href={`tel:${client.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-secondary-foreground hover:bg-secondary transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  {client.hasGarden && (
                    <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                      <Leaf className="w-3 h-3" /> Jardim
                    </div>
                  )}
                  {client.hasPool && (
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                      <Waves className="w-3 h-3" /> Piscina
                    </div>
                  )}
                  {client.hasJacuzzi && (
                    <div className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
                      <ThermometerSun className="w-3 h-3" /> Jacuzzi
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum cliente encontrado.</p>
            <p className="text-sm">Adicione o seu primeiro cliente para começar!</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
