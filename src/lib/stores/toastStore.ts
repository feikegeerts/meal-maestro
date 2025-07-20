import { writable } from 'svelte/store';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number; // Auto-dismiss time in ms, 0 for persistent
  dismissible?: boolean;
}

// Create the store
function createToastStore() {
  const { subscribe, set, update } = writable<ToastNotification[]>([]);

  const store = {
    subscribe,
    
    // Add a new toast notification
    add: (toast: Omit<ToastNotification, 'id'>) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newToast: ToastNotification = {
        id,
        duration: 5000, // Default 5 seconds
        dismissible: true, // Default dismissible
        ...toast,
      };
      
      update(toasts => [...toasts, newToast]);
      return id;
    },
    
    // Remove a specific toast by id
    remove: (id: string) => {
      update(toasts => toasts.filter(toast => toast.id !== id));
    },
    
    // Clear all toasts
    clear: () => {
      set([]);
    },
    
    // Convenience methods for different toast types
    success: (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return store.add({
        type: 'success',
        title,
        message,
        ...options
      });
    },
    
    error: (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return store.add({
        type: 'error',
        title,
        message,
        duration: 8000, // Errors stay longer by default
        ...options
      });
    },
    
    warning: (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return store.add({
        type: 'warning',
        title,
        message,
        duration: 6000, // Warnings stay a bit longer
        ...options
      });
    },
    
    info: (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return store.add({
        type: 'info',
        title,
        message,
        ...options
      });
    }
  };

  return store;
}

export const toasts = createToastStore();