import { create } from 'zustand';

export const useAppStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  items: [],
  activeTab: 'feed', // 'feed' | 'my-reports' | 'claims' | 'chats' | 'profile'
  selectedItem: null,
  selectedChatId: null,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  updateUser: (updates) => set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
  logout: () => set({ user: null, isAuthenticated: false, activeTab: 'feed', selectedItem: null, selectedChatId: null }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  setItems: (items) => set({ items }),
  setActiveTab: (activeTab) => set({ activeTab, selectedItem: null }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setSelectedChatId: (selectedChatId) => set({ selectedChatId })
}));
