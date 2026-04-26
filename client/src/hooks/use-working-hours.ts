import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_WORKING_HOURS,
  fromDTO,
  normalizeSettings,
  readCachedSettings,
  toDTO,
  writeCachedSettings,
  type WorkingHoursDTO,
  type WorkingHoursSettings,
} from "@/lib/working-hours";

const ENDPOINT = "/api/user/preferences/working-hours";

export function useWorkingHours() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryKey = [ENDPOINT, userId] as const;

  const query = useQuery<WorkingHoursDTO>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(ENDPOINT, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return (await res.json()) as WorkingHoursDTO;
    },
    retry: false,
    staleTime: 60_000,
    enabled: !!userId,
  });

  const serverSettings = query.data ? fromDTO(query.data) : null;
  const cached = readCachedSettings(userId);
  const settings: WorkingHoursSettings = serverSettings ?? cached ?? DEFAULT_WORKING_HOURS;

  useEffect(() => {
    if (serverSettings && userId) writeCachedSettings(userId, serverSettings);
  }, [serverSettings, userId]);

  const mutation = useMutation({
    mutationFn: async (next: WorkingHoursSettings) => {
      const normalized = normalizeSettings(next);
      const res = await apiRequest("PUT", ENDPOINT, toDTO(normalized));
      return (await res.json()) as WorkingHoursDTO;
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WorkingHoursDTO>(queryKey);
      const normalized = normalizeSettings(next);
      queryClient.setQueryData<WorkingHoursDTO>(queryKey, toDTO(normalized));
      writeCachedSettings(userId, normalized);
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
        writeCachedSettings(userId, fromDTO(ctx.previous));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const setSettings = useCallback(
    (next: WorkingHoursSettings) => {
      mutation.mutate(next);
    },
    [mutation]
  );

  return [settings, setSettings] as const;
}
