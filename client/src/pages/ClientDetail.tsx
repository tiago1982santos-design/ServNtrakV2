import { useState } from "react";
import { useParams, Link } from "wouter";
import { useClient } from "@/hooks/use-clients";
import { useServiceLogs } from "@/hooks/use-service-logs";
import { useQuickPhotos, useDeleteQuickPhoto } from "@/hooks/use-quick-photos";
import { useAppointments } from "@/hooks/use-appointments";
import { useClientServiceStats } from "@/hooks/use-service-visits";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Phone, MapPin, Leaf, Waves, ThermometerSun, Plus, Calendar, CheckCircle2, Camera, X, Euro, Clock, Flower2, Sparkles, FolderPlus, Users, Timer, Check, MessageCircle, Banknote, Building2, Smartphone, CalendarDays, AlertTriangle, ChevronUp, Wrench, ClipboardList, Trash2, Lightbulb, ThumbsUp, ThumbsDown, PhoneCall, FileText } from "lucide-react";
import { generateServiceNote } from "@/lib/generateServiceNote";
import type { ServiceLogWithEntries } from "@shared/schema";
import { formatDuration } from "@/lib/utils";
import { CreatePendingTaskDialog } from "@/components/CreatePendingTaskDialog";
import { CreateSuggestedWorkDialog } from "@/components/CreateSuggestedWorkDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { PendingTaskWithClient, SuggestedWorkWithClient } from "@shared/schema";
import { SiWhatsapp, SiFacebook } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { getClientVisitSchedule, getSeason, getSeasonLabel, getTotalMonthlyVisits } from "@shared/scheduling";
import { AddServiceLogDialog } from "@/components/client-detail/AddServiceLogDialog";
import { EditClientDialog } from "@/components/client-detail/EditClientDialog";
import { ClientTimeline } from "@/components/client-detail/ClientTimeline";
import { ClientTasksTab } from "@/components/client-detail/ClientTasksTab";
import { ClientAgendaTab } from "@/components/client-detail/ClientAgendaTab";

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: client, isLoading } = useClient(clientId);
  const { data: logs } = useServiceLogs(id);
  const { data: appointments } = useAppointments({ clientId: id });
  const { data: quickPhotos } = useQuickPhotos(id);
  const { data: serviceStats } = useClientServiceStats(clientId);
  const deleteQuickPhoto = useDeleteQuickPhoto();

  const [activeTab, setActiveTab] = useState("overview");
  const [generatingNoteId, setGeneratingNoteId] = useState<number | null>(null);

  const handleGenerateNote = async (logId: number) => {
    if (!client) return;
    setGeneratingNoteId(logId);
    try {
      const res = await fetch(`/api/service-logs/${logId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar dados do serviço");
      const fullLog: ServiceLogWithEntries = await res.json();
      await generateServiceNote(fullLog, client);
      toast({ title: "PDF gerado", description: "A nota de despesa foi descarregada." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível gerar a nota de despesa.", variant: "destructive" });
    } finally {
      setGeneratingNoteId(null);
    }
  };

  // Tasks and suggestions are handled in ClientTasksTab

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!client) return <div>Cliente não encontrado</div>;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-primary text-primary-foreground pt-8 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <Link href="/clients" className="inline-flex items-center text-primary-foreground/80 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
            <EditClientDialog client={client} />
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold">{client.name}</h1>
            {(client.gardenVisitFrequency === "on_demand" || client.poolVisitFrequency === "on_demand" || client.jacuzziVisitFrequency === "on_demand") && (
              <Badge className="bg-purple-500/90 text-white border-0 text-xs">
                <PhoneCall className="w-3 h-3 mr-1" />
                A pedido
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4 text-primary-foreground/90">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm hover:underline">
                <Phone className="w-4 h-4" /> {client.phone}
              </a>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" /> {client.address}
              </div>
            )}
          </div>

          {/* Messaging Buttons */}
          {(client.phone || client.whatsapp || client.facebookMessenger) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(client.whatsapp || client.phone) && (
                <a
                  href={`https://wa.me/${(client.whatsapp || client.phone || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                  data-testid="button-whatsapp"
                >
                  <SiWhatsapp className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
              {client.phone && (
                <a
                  href={`sms:${client.phone}`}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  data-testid="button-sms"
                >
                  <MessageCircle className="w-4 h-4" />
                  SMS
                </a>
              )}
              {client.facebookMessenger && (
                <a
                  href={`https://m.me/${client.facebookMessenger}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  data-testid="button-messenger"
                >
                  <SiFacebook className="w-4 h-4" />
                  Messenger
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="px-6 -mt-8 relative z-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-muted/50 p-1 rounded-xl mb-6 flex overflow-x-auto">
            <TabsTrigger value="overview" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Resumo</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Serviços</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Timeline</TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Agenda</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Services Tags */}
            <div className="bg-card rounded-2xl p-4 shadow-lg border border-border/50 flex flex-wrap gap-3">
          {client.hasGarden && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <Leaf className="w-4 h-4" /> Jardim
            </div>
          )}
          {client.hasPool && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <Waves className="w-4 h-4" /> Piscina
              {client.poolLength && client.poolWidth && client.poolMinDepth && client.poolMaxDepth && (
                <span className="text-xs font-bold">
                  ({(client.poolLength * client.poolWidth * ((client.poolMinDepth + client.poolMaxDepth) / 2)).toFixed(0)} m³)
                </span>
              )}
            </div>
          )}
          {client.hasJacuzzi && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm font-medium">
              <ThermometerSun className="w-4 h-4" /> Jacuzzi
              {client.jacuzziLength && client.jacuzziWidth && client.jacuzziDepth && (
                <span className="text-xs font-bold">
                  ({(client.jacuzziLength * client.jacuzziWidth * client.jacuzziDepth).toFixed(0)} m³)
                </span>
              )}
            </div>
          )}
          {client.paymentMethod && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              client.paymentMethod === 'cash' ? 'bg-green-50 text-green-700' :
              client.paymentMethod === 'bank_transfer' ? 'bg-blue-50 text-blue-700' :
              'bg-red-50 text-red-700'
            }`}>
              {client.paymentMethod === 'cash' && <Banknote className="w-4 h-4" />}
              {client.paymentMethod === 'bank_transfer' && <Building2 className="w-4 h-4" />}
              {client.paymentMethod === 'mbway' && <Smartphone className="w-4 h-4" />}
              {client.paymentMethod === 'cash' ? 'Dinheiro' :
               client.paymentMethod === 'bank_transfer' ? 'Transferência' : 'MBway'}
              {client.paymentMethod === 'bank_transfer' && client.scheduledTransferDay && (
                <span className="text-xs font-normal opacity-80">
                  (dia {client.scheduledTransferDay})
                </span>
              )}
            </div>
          )}
        </div>

      {/* Visit Schedule Info */}
      {(client.hasGarden || client.hasPool || client.hasJacuzzi) && (
        <div className="px-6 mt-4">
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Frequência de Visitas</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeason(new Date()) === 'high' ? 'bg-muted text-muted-foreground' : 'bg-blue-100 text-blue-700'}`}>
                {getSeasonLabel(getSeason(new Date()))}
              </span>
            </div>
            <div className="space-y-2">
              {getClientVisitSchedule(client).map((schedule) => (
                <div key={schedule.type} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {schedule.type === 'Garden' && <Leaf className="w-3.5 h-3.5 text-green-600" />}
                    {schedule.type === 'Pool' && <Waves className="w-3.5 h-3.5 text-blue-600" />}
                    {schedule.type === 'Jacuzzi' && <ThermometerSun className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span>{schedule.type === 'Garden' ? 'Jardim' : schedule.type === 'Pool' ? 'Piscina' : 'Jacuzzi'}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">{schedule.description}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t flex justify-between text-sm font-medium">
                <span>Total este mês:</span>
                <span className="text-primary">{getTotalMonthlyVisits(client)} visitas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Statistics */}
      {serviceStats && serviceStats.totalVisits > 0 && (
        <div className="px-6 mt-4">
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <h3 className="font-semibold text-sm mb-3">Estatísticas de Visitas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total visitas</p>
                  <p className="font-semibold">{serviceStats.totalVisits}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Timer className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração média</p>
                  <p className="font-semibold">{serviceStats.averageDurationMinutes} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Média trabalhadores</p>
                  <p className="font-semibold">{serviceStats.averageWorkerCount.toFixed(1)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total horas</p>
                  <p className="font-semibold">{serviceStats.totalWorkerHours.toFixed(1)}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Registos de Serviço</h3>
              <div className="flex items-center gap-2">
                <Link
                  href={`/expense-notes?clientId=${clientId}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Notas
                </Link>
                <AddServiceLogDialog clientId={clientId} />
              </div>
            </div>

            {logs?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Ainda sem histórico de serviço.</p>
            ) : (
              logs?.map((log) => (
                <div key={log.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                      {log.type === 'Garden' ? 'Jardim' : log.type === 'Pool' ? 'Piscina' : log.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.date), "d 'de' MMM, yyyy")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{log.description}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                    <span className="text-xs font-medium text-muted-foreground">
                      {(log.totalAmount ?? 0) > 0 ? `${(log.totalAmount ?? 0).toFixed(2)} €` : "—"}
                      {log.billingType === "extra" && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                          Extra
                        </Badge>
                      )}
                    </span>
                    <Link
                      href={`/expense-notes/new?serviceLogId=${log.id}&clientId=${clientId}`}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      data-testid={`button-generate-note-${log.id}`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Criar Nota
                    </Link>
                  </div>
                </div>
              ))
            )}

            {/* Quick Photos Section - Organized by Category */}
            {quickPhotos && quickPhotos.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-4">Capturas Rápidas</h3>
                {(() => {
                  const grouped = quickPhotos.reduce((acc, photo) => {
                    const category = photo.serviceType === "Outros" && photo.customCategory
                      ? photo.customCategory
                      : photo.serviceType || "Geral";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(photo);
                    return acc;
                  }, {} as Record<string, typeof quickPhotos>);

                  const categoryIcons: Record<string, typeof Flower2> = {
                    "Jardim": Flower2,
                    "Piscina": Waves,
                    "Jacuzzi": Sparkles,
                    "Outros": FolderPlus,
                    "Geral": Camera,
                  };

                  const categoryOrder = ["Jardim", "Piscina", "Jacuzzi"];
                  const sortedCategories = [
                    ...categoryOrder.filter(c => grouped[c]),
                    ...Object.keys(grouped).filter(c => !categoryOrder.includes(c) && c !== "Outros" && c !== "Geral"),
                    ...(grouped["Outros"] ? ["Outros"] : []),
                    ...(grouped["Geral"] ? ["Geral"] : []),
                  ];

                  return sortedCategories.map((category) => {
                    const Icon = categoryIcons[category] || FolderPlus;
                    return (
                      <div key={category} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{category}</span>
                          <span className="text-xs text-muted-foreground">({grouped[category].length})</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {grouped[category].map((photo) => (
                            <div key={photo.id} className="relative group aspect-square">
                              <img
                                src={photo.photoUrl}
                                alt={`Captura - ${category}`}
                                className="w-full h-full object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-white hover:bg-white/20"
                                  onClick={() => deleteQuickPhoto.mutate(photo.id)}
                                  data-testid={`button-delete-quick-photo-${photo.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 rounded px-1 truncate">
                                {format(new Date(photo.createdAt!), "dd/MM/yy")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <ClientTimeline logs={logs || []} appointments={appointments || []} quickPhotos={quickPhotos || []} />
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {activeTab === "upcoming" && <ClientAgendaTab clientId={clientId} estimatedDuration={client.serviceDurationMinutes || 60} />}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {activeTab === "tasks" && <ClientTasksTab clientId={clientId} clientName={client.name} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
