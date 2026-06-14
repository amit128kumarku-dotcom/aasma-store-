import { create } from 'zustand';
import { Settings, Announcement } from '../types';

interface AppState {
  settings: Settings | null;
  announcement: Announcement | null;
  isAdmin: boolean;
  isSearchOpen: boolean;
  isVerified: boolean;
  showVerification: boolean;
  verificationClosable: boolean;
  verificationTarget: string;
  showSuccessIfVerified: boolean;
  setSettings: (settings: Settings) => void;
  setAnnouncement: (announcement: Announcement | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setIsVerified: (status: boolean) => void;
  triggerVerification: (target: string, closable: boolean, showSuccessIfVerified?: boolean) => void;
  closeVerification: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: null,
  announcement: null,
  isAdmin: false,
  isSearchOpen: false,
  isVerified: false,
  showVerification: false,
  verificationClosable: true,
  verificationTarget: 'website',
  showSuccessIfVerified: false,
  setSettings: (settings) => set({ settings }),
  setAnnouncement: (announcement) => set({ announcement }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
  setIsVerified: (isVerified) => set({ isVerified }),
  triggerVerification: (target, closable, showSuccessIfVerified = false) => set({ showVerification: true, verificationTarget: target, verificationClosable: closable, showSuccessIfVerified }),
  closeVerification: () => set({ showVerification: false }),
}));
