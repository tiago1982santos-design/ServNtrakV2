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
import { AddAppointmentDialog } from "@/components/client-detail/AddAppointmentDialog";
import { EditClientDialog } from "@/components/client-detail/EditClientDialog";
import { CompleteVisitDialog } from "@/components/client-detail/CompleteVisitDialog";
import { ClientTimeline } from "@/components/client-detail/ClientTimeline";

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

  const [showPendingTaskDialog, setShowPendingTaskDialog] = useState(false);
  const [showSuggestedWorkDialog, setShowSuggestedWorkDialog] = useState(false);
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

  const { data: pendingTasks } = useQuery<PendingTaskWithClient[]>({
    queryKey: ["/api/pending-tasks", { clientId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/pending-tasks?clientId=${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch pending tasks");
      return response.json();
    },
  });

  const deletePendingTask = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/pending-tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-tasks/count"] });
    },
  });

  const completePendingTask = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/pending-tasks/${taskId}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to complete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-tasks/count"] });
    },
  });

  const { data: suggestedWorks } = useQuery<SuggestedWorkWithClient[]>({
    queryKey: ["/api/suggested-works", { clientId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/suggested-works?clientId=${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch suggested works");
      return response.json();
    },
  });

  const updateSuggestedWork = useMutation({
    mutationFn: async ({ workId, isAccepted, isRejected, isCompleted }: { workId: number; isAccepted?: boolean; isRejected?: boolean; isCompleted?: boolean }) => {
      const body: Record<string, any> = {};
      if (isAccepted !== undefined) {
        body.isAccepted = isAccepted;
        body.acceptedAt = isAccepted ? new Date().toISOString() : null;
      }
      if (isRejected !== undefined) {
        body.isRejected = isRejected;
        body.rejectedAt = isRejected ? new Date().toISOString() : null;
      }
      if (isCompleted !== undefined) {
        body.isCompleted = isCompleted;
        body.completedAt = isCompleted ? new Date().toISOString() : null;
      }
      const response = await fetch(`/api/suggested-works/${workId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update work");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-works"] });
    },
  });

  const deleteSuggestedWork = useMutation({
    mutationFn: async (workId: number) => {
      const response = await fetch(`/api/suggested-works/${workId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete work");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-works"] });
    },
  });

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

      {/* Services Tags */}
      <div className="px-6 -mt-8 relative z-20">
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

      {/* Pending Tasks Section */}
      <div className="px-6 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-destructive" />
            Tarefas Pendentes
            {pendingTasks && pendingTasks.length > 0 && (
              <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                {pendingTasks.length}
              </Badge>
            )}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPendingTaskDialog(true)}
            className="gap-1"
            data-testid="button-add-pending-task"
          >
            <Plus className="w-4 h-4" />
            Registar
          </Button>
        </div>

        {pendingTasks && pendingTasks.length > 0 ? (
          <div className="space-y-3">
            {pendingTasks.map((task) => {
              const ServiceIcon = task.serviceType === 'Jardim' ? Leaf :
                                  task.serviceType === 'Piscina' ? Waves :
                                  task.serviceType === 'Jacuzzi' ? ThermometerSun : Wrench;
              const priorityColors = {
                low: 'bg-gray-100 text-gray-600',
                normal: 'bg-blue-100 text-blue-600',
                high: 'bg-destructive/10 text-destructive',
                urgent: 'bg-red-100 text-red-600',
              };
              const priorityLabels = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };

              return (
                <div key={task.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <ServiceIcon className={`w-4 h-4 ${
                        task.serviceType === 'Jardim' ? 'text-green-600' :
                        task.serviceType === 'Piscina' ? 'text-blue-600' :
                        task.serviceType === 'Jacuzzi' ? 'text-muted-foreground' : 'text-gray-600'
                      }`} />
                      <span className="text-xs font-semibold">{task.serviceType}</span>
                      <Badge variant="secondary" className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.normal}`}>
                        {task.priority === 'urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {task.priority === 'high' && <ChevronUp className="w-3 h-3 mr-1" />}
                        {priorityLabels[task.priority as keyof typeof priorityLabels] || 'Normal'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(task.createdAt!), "d MMM", { locale: pt })}
                    </span>
                  </div>

                  <p className="text-sm text-foreground mb-3">{task.description}</p>

                  {task.photos && task.photos.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {task.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" data-testid={`button-delete-task-${task.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar Tarefa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem a certeza que deseja eliminar esta tarefa pendente? Esta ação não pode ser revertida.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePendingTask.mutate(task.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="gap-1 btn-primary" data-testid={`button-complete-task-${task.id}`}>
                          <Check className="w-4 h-4" />
                          Concluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Concluir Tarefa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Confirma que esta tarefa foi concluída?
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium text-foreground">{task.description}</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => completePendingTask.mutate(task.id)}
                            className="btn-primary"
                          >
                            Confirmar Conclusão
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem tarefas pendentes</p>
          </div>
        )}
      </div>

      <CreatePendingTaskDialog
        open={showPendingTaskDialog}
        onOpenChange={setShowPendingTaskDialog}
        clientId={clientId}
        clientName={client.name}
      />

      {/* Suggested Works Section */}
      <div className="px-6 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Trabalhos Sugeridos
            {suggestedWorks && suggestedWorks.filter(w => !w.isAccepted && !w.isRejected).length > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                {suggestedWorks.filter(w => !w.isAccepted && !w.isRejected).length}
              </Badge>
            )}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSuggestedWorkDialog(true)}
            className="gap-1"
            data-testid="button-add-suggested-work"
          >
            <Plus className="w-4 h-4" />
            Sugerir
          </Button>
        </div>

        {suggestedWorks && suggestedWorks.filter(w => !w.isAccepted && !w.isRejected).length > 0 ? (
          <div className="space-y-3">
            {suggestedWorks.filter(w => !w.isAccepted && !w.isRejected).map((work) => {
              const CategoryIcon = work.category === 'Plantação' || work.category === 'Poda' ? Leaf :
                                   work.category === 'Piscina' ? Waves :
                                   work.category === 'Jacuzzi' ? ThermometerSun : Wrench;
              const categoryColors: Record<string, string> = {
                'Limpeza': 'text-gray-600',
                'Plantação': 'text-green-600',
                'Poda': 'text-lime-600',
                'Construção': 'text-muted-foreground',
                'Reparação': 'text-muted-foreground',
                'Piscina': 'text-blue-600',
                'Jacuzzi': 'text-cyan-600',
                'Geral': 'text-gray-500',
              };

              return (
                <div key={work.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={`w-4 h-4 ${categoryColors[work.category] || 'text-gray-600'}`} />
                      <span className="text-xs font-semibold">{work.category}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(work.createdAt!), "d MMM", { locale: pt })}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm mb-1">{work.title}</h4>
                  {work.description && (
                    <p className="text-sm text-muted-foreground mb-2">{work.description}</p>
                  )}

                  {work.notes && (
                    <div className="bg-muted/50 rounded-lg p-2 mb-3">
                      <p className="text-xs text-muted-foreground italic">{work.notes}</p>
                    </div>
                  )}

                  {(work.estimatedCost || work.estimatedDurationMinutes) && (
                    <div className="flex items-center gap-4 mb-3">
                      {work.estimatedCost && (
                        <div className="flex items-center gap-1">
                          <Euro className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
                            {(work.estimatedCost / 100).toFixed(2)}€
                          </span>
                        </div>
                      )}
                      {work.estimatedDurationMinutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-600">
                            {formatDuration(work.estimatedDurationMinutes)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {work.photos && work.photos.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {work.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" data-testid={`button-delete-suggestion-${work.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar Sugestão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem a certeza que deseja eliminar esta sugestão de trabalho? Esta ação não pode ser revertida.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSuggestedWork.mutate(work.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => updateSuggestedWork.mutate({ workId: work.id, isRejected: true })}
                      data-testid={`button-reject-suggestion-${work.id}`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Recusar
                    </Button>

                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      onClick={() => updateSuggestedWork.mutate({ workId: work.id, isAccepted: true })}
                      data-testid={`button-accept-suggestion-${work.id}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Aceitar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem trabalhos sugeridos</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione sugestões de trabalhos extra</p>
          </div>
        )}
      </div>

      <CreateSuggestedWorkDialog
        open={showSuggestedWorkDialog}
        onOpenChange={setShowSuggestedWorkDialog}
        clientId={clientId}
        clientName={client.name}
      />

      {/* Main Content Tabs */}
      <div className="px-6 mt-6">
        <Tabs defaultValue="history">
          <TabsList className="w-full bg-muted/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Histórico</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Timeline</TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Agenda</TabsTrigger>
          </TabsList>

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
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Agendamentos</h3>
              <AddAppointmentDialog clientId={clientId} />
            </div>

            {appointments?.filter(a => !a.isCompleted).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sem agendamentos futuros.</p>
            ) : (
              appointments?.filter(a => !a.isCompleted).map((apt) => (
                <div key={apt.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex items-center gap-4">
                   <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary shrink-0">
                    <span className="text-xs font-bold uppercase">{format(new Date(apt.date), "MMM")}</span>
                    <span className="text-lg font-bold leading-none">{format(new Date(apt.date), "d")}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">Serviço de {apt.type === 'Garden' ? 'Jardim' : apt.type === 'Pool' ? 'Piscina' : apt.type}</h4>
                    <p className="text-sm text-muted-foreground">{format(new Date(apt.date), "HH:mm")}</p>
                  </div>
                  <CompleteVisitDialog
                    clientId={clientId}
                    appointmentId={apt.id}
                    appointmentType={apt.type}
                    estimatedDuration={client.serviceDurationMinutes || 60}
                  />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
