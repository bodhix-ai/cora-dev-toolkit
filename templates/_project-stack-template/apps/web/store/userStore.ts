import { create } from "zustand";
import { Profile } from "@/lib/api";

interface UserState {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));
