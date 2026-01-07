import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertServiceLog, type ServiceLog } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useServiceLogs(clientId?: string) {
  return useQuery({
    queryKey: [api.serviceLogs.list.path, clientId],
    queryFn: async () => {
      const url = new URL(api.serviceLogs.list.path, window.location.origin);
      if (clientId) url.searchParams.set("clientId", clientId);
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.serviceLogs.list.responses[200].parse(await res.json());
    },
    enabled: !!clientId, // Typically only fetch when viewing a specific client
  });
}

export function useCreateServiceLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertServiceLog) => {
      const res = await fetch(api.serviceLogs.create.path, {
        method: api.serviceLogs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.serviceLogs.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to log service");
      }
      return api.serviceLogs.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceLogs.list.path, String(variables.clientId)] });
      // Also invalidate appointments as one might have been marked completed
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Logged", description: "Service record saved" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
