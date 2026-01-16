// ABOUTME: Global state store for port forward management
// ABOUTME: Provides reactive access to active port forwards across the app

import { createSignal, onCleanup } from 'solid-js';
import { fetchPortForwards, stopPortForward as apiStopPortForward, type PortForward } from '../lib/api';

const [forwards, setForwards] = createSignal<PortForward[]>([]);
const [loading, setLoading] = createSignal(false);
const [modalOpen, setModalOpen] = createSignal(false);

let pollInterval: ReturnType<typeof setInterval> | null = null;

const loadForwards = async () => {
  setLoading(true);
  try {
    const items = await fetchPortForwards();
    setForwards(items);
  } catch (error) {
    console.error('Failed to load port forwards', error);
  } finally {
    setLoading(false);
  }
};

const stopForward = async (id: string) => {
  try {
    await apiStopPortForward(id);
    await loadForwards();
  } catch (error) {
    console.error('Failed to stop port forward', error);
  }
};

const startPolling = () => {
  if (pollInterval) return;
  void loadForwards();
  pollInterval = setInterval(() => {
    void loadForwards();
  }, 5000);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

const openModal = () => setModalOpen(true);
const closeModal = () => setModalOpen(false);

const hasForwardForPod = (namespace: string, pod: string) => {
  return forwards().some(f => f.namespace === namespace && f.pod === pod);
};

export const portForwardStore = {
  forwards,
  loading,
  modalOpen,
  loadForwards,
  stopForward,
  startPolling,
  stopPolling,
  openModal,
  closeModal,
  hasForwardForPod,
  count: () => forwards().length,
};
