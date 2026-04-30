import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  ClipboardList, Plus, Leaf, Waves, ThermometerSun, Wrench, 
  AlertTriangle, ChevronUp, Trash2, Check, Lightbulb, Euro, 
  Clock, ThumbsDown, ThumbsUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { CreatePendingTaskDialog } from "@/components/CreatePendingTaskDialog";
import { CreateSuggestedWorkDialog } from "@/components/CreateSuggestedWorkDialog";
import { formatDuration } from "@/lib/utils";
import type { PendingTaskWithClient, SuggestedWorkWithClient } from "@shared/schema";

interface ClientTasksTabProps {
  clientId: number;
  clientName: string;
}

export function ClientTasksTab({ clientId, clientName }: ClientTasksTabProps) {
  const queryClient = useQueryClient();
  const [showPendingTaskDialog, setShowPendingTaskDialog] = useState(false);
  const [showSuggestedWorkDialog, setShowSuggestedWorkDialog] = useState(false);

  const { data: pendingTasks } = useQuery<PendingTaskWithClient[]>({
    queryKey: ["/api/pending-tasks", { clientId: clientId.toString() }],
    queryFn: async () => {
      const response = await fetch(`/api/pending-tasks?clientId=${clientId}`, { credentials: "include" });
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
    queryKey: ["/api/suggested-works", { clientId: clientId.toString() }],
    queryFn: async () => {
      const response = await fetch(`/api/suggested-works?clientId=${clientId}`, { credentials: "include" });
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

  return (
    <div className="space-y-6">
      {/* Pending Tasks Section */}
      <div>
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
        clientName={clientName}
      />

      {/* Suggested Works Section */}
      <div>
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
        clientName={clientName}
      />
    </div>
  );
}
