import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_WORKING_HOURS,
  loadWorkingHours,
  saveWorkingHours,
  subscribeToWorkingHours,
  type WorkingHoursSettings,
} from "@/lib/working-hours";

export function useWorkingHours() {
  const [settings, setSettingsState] = useState<WorkingHoursSettings>(() =>
    typeof window === "undefined" ? DEFAULT_WORKING_HOURS : loadWorkingHours()
  );

  useEffect(() => {
    const unsubscribe = subscribeToWorkingHours(() => {
      setSettingsState(loadWorkingHours());
    });
    return unsubscribe;
  }, []);

  const setSettings = useCallback((next: WorkingHoursSettings) => {
    const normalized = saveWorkingHours(next);
    setSettingsState(normalized);
  }, []);

  return [settings, setSettings] as const;
}
