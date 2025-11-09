import { writable } from "svelte/store";

interface LoginModalState {
  isOpen: boolean;
  onLoginSuccess: (() => void) | null;
}

function createLoginModalStore() {
  const { subscribe, set, update } = writable<LoginModalState>({
    isOpen: false,
    onLoginSuccess: null,
  });

  return {
    subscribe,
    open: (onLoginSuccess?: () => void) => {
      set({
        isOpen: true,
        onLoginSuccess: onLoginSuccess || null,
      });
    },
    close: () => {
      set({
        isOpen: false,
        onLoginSuccess: null,
      });
    },
  };
}

export const loginModal = createLoginModalStore();

