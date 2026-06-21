import { create } from 'zustand';

export const useAppStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  items: [],
  activeTab: 'feed', // 'feed' | 'my-reports' | 'claims' | 'chats' | 'profile'
  selectedItem: null,
  selectedChatId: null,
  viewMode: 'grid', // 'grid' | 'list'
  
  // Custom feedback system states
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  toast: null, // { message: '', type: 'success' | 'error' | 'warning' }
  confirmModal: { show: false, title: '', message: '', onConfirm: null, onCancel: null },
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  updateUser: (updates) => set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
  logout: () => set({ user: null, isAuthenticated: false, activeTab: 'feed', selectedItem: null, selectedChatId: null, viewMode: 'grid' }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  setItems: (items) => set({ items }),
  setActiveTab: (activeTab) => set({ activeTab, selectedItem: null }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setSelectedChatId: (selectedChatId) => set({ selectedChatId }),
  setViewMode: (viewMode) => set({ viewMode }),
  
  setOffline: (isOffline) => set({ isOffline }),
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      set({ toast: null });
    }, 4000);
  },
  hideToast: () => set({ toast: null }),
  showConfirm: (title, message, onConfirm, onCancel = null) => set({ 
    confirmModal: { show: true, title, message, onConfirm, onCancel } 
  }),
  hideConfirm: () => set({ 
    confirmModal: { show: false, title: '', message: '', onConfirm: null, onCancel: null } 
  })
}));


