import { create } from "zustand";

import type { LoggedSet, UUID } from "@/api/types";

interface ExerciseGroup {
  exerciseId: UUID;
  exerciseName: string;
  orderIdx: number;
  targetSets?: number;
  targetRepsLow?: number;
  targetRepsHigh?: number;
  targetRpe?: number | null;
  restSeconds?: number;
  sets: LoggedSet[];
  suggestedWeight?: number | null;
}

interface ActiveSessionState {
  sessionId: UUID | null;
  groups: ExerciseGroup[];
  restEndsAt: number | null;
  setSession: (sessionId: UUID | null) => void;
  setGroups: (groups: ExerciseGroup[]) => void;
  addSetLocal: (exerciseId: UUID, set: LoggedSet) => void;
  removeSetLocal: (exerciseId: UUID, setId: UUID) => void;
  startRest: (seconds: number) => void;
  clearRest: () => void;
}

export const useActiveSession = create<ActiveSessionState>((set) => ({
  sessionId: null,
  groups: [],
  restEndsAt: null,

  setSession: (sessionId) => set({ sessionId }),
  setGroups: (groups) => set({ groups }),

  addSetLocal: (exerciseId, logged) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.exerciseId === exerciseId ? { ...g, sets: [...g.sets, logged] } : g,
      ),
    })),

  removeSetLocal: (exerciseId, setId) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.exerciseId === exerciseId
          ? { ...g, sets: g.sets.filter((s) => s.id !== setId) }
          : g,
      ),
    })),

  startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000 }),
  clearRest: () => set({ restEndsAt: null }),
}));
