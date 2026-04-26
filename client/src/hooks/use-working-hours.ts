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

const QUERY_KEY = ["/api/user/preferences/working-hours"] as const;

export function useWorkingHours() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery<WorkingHoursDTO>({
    queryKey: QUERY_KEY,
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
      const res = await apiRequest("PUT", "/api/user/preferences/working-hours", toDTO(normalized));
      return (await res.json()) as WorkingHoursDTO;
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<WorkingHoursDTO>(QUERY_KEY);
      const normalized = normalizeSettings(next);
      queryClient.setQueryData<WorkingHoursDTO>(QUERY_KEY, toDTO(normalized));
      writeCachedSettings(userId, normalized);
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
        writeCachedSettings(userId, fromDTO(ctx.previous));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
