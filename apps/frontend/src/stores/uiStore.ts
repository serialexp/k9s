import { createSignal } from 'solid-js';

// UI state for persistent preferences
const [selectedPodTab, setSelectedPodTab] = createSignal<'info' | 'manifest' | 'events' | 'status' | 'logs'>('info');

// Export the UI store
export const uiStore = {
  // Pod detail tab state
  selectedPodTab,
  setSelectedPodTab
};