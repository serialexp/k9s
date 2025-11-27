import { createSignal, createEffect, onMount } from 'solid-js';
import { fetchContexts, fetchNamespaces, selectContext, subscribeToNamespaceEvents, type ContextInfo, type NamespaceWatchEvent } from '../lib/api';

// Context state
const [contexts, setContexts] = createSignal<ContextInfo[]>([]);
const [contextsLoading, setContextsLoading] = createSignal(false);
const [selectedContext, setSelectedContext] = createSignal<string>('');
const [activeContext, setActiveContext] = createSignal<string>('');

// Namespace state
const [namespaces, setNamespaces] = createSignal<string[]>([]);
const [namespacesLoading, setNamespacesLoading] = createSignal(false);
const [selectedNamespace, setSelectedNamespace] = createSignal<string>('');

// App initialization state
const [appInitialized, setAppInitialized] = createSignal(false);
const [initializationError, setInitializationError] = createSignal<string>('');

// Namespace stream cleanup
let namespaceStreamCleanup: (() => void) | null = null;

// Actions
const loadContexts = async () => {
  setContextsLoading(true);
  try {
    const data = await fetchContexts();
    console.log('Loaded contexts:', data);
    setContexts(data);
    const current = data.find((ctx) => ctx.isCurrent)?.name ?? data[0]?.name ?? '';
    console.log('Current context found:', current);
    console.log('Selected context before:', selectedContext());
    if (current) {
      setSelectedContext(current);
      setActiveContext(current);
      console.log('Selected context after:', selectedContext());
    }
  } catch (error) {
    console.error('Failed to load contexts', error);
  } finally {
    setContextsLoading(false);
  }
};

const changeContext = async (name: string, preferredNamespace?: string) => {
  if (!name || name === activeContext()) {
    if (preferredNamespace) {
      setSelectedNamespace(preferredNamespace);
    }
    return;
  }
  try {
    await selectContext(name);
    setSelectedContext(name);
    setActiveContext(name);
    setNamespaces([]);
    setSelectedNamespace('');
    await loadNamespaces(preferredNamespace);
  } catch (error) {
    console.error('Failed to select context', error);
  }
};

const loadNamespaces = async (preferredNamespace?: string) => {
  setNamespacesLoading(true);

  // Clean up existing stream if any
  if (namespaceStreamCleanup) {
    namespaceStreamCleanup();
    namespaceStreamCleanup = null;
  }

  try {
    const { items } = await fetchNamespaces();
    setNamespaces(items);
    if (!items.length) {
      setSelectedNamespace('');
      return;
    }

    if (preferredNamespace && items.includes(preferredNamespace)) {
      setSelectedNamespace(preferredNamespace);
    } else if (!items.includes(selectedNamespace())) {
      setSelectedNamespace(items[0]);
    }

    // Set up streaming for real-time namespace updates
    namespaceStreamCleanup = subscribeToNamespaceEvents(
      (event: NamespaceWatchEvent) => {
        const currentNamespaces = namespaces();
        const namespaceName = event.object;

        if (event.type === 'ADDED') {
          if (!currentNamespaces.includes(namespaceName)) {
            setNamespaces([...currentNamespaces, namespaceName]);
          }
        } else if (event.type === 'DELETED') {
          const newNamespaces = currentNamespaces.filter(ns => ns !== namespaceName);
          setNamespaces(newNamespaces);

          // If the deleted namespace was selected, switch to another one
          if (selectedNamespace() === namespaceName) {
            setSelectedNamespace(newNamespaces.length > 0 ? newNamespaces[0] : '');
          }
        }
      },
      (error) => {
        console.error('Namespace stream error:', error);
      }
    );
  } catch (error) {
    console.error('Failed to load namespaces', error);
    setNamespaces([]);
    setSelectedNamespace('');
  } finally {
    setNamespacesLoading(false);
  }
};

// Initialize store
const initializeStore = async () => {
  try {
    setInitializationError('');
    await loadContexts();
    await loadNamespaces();
    setAppInitialized(true);
  } catch (error) {
    console.error('Failed to initialize app:', error);
    setInitializationError('Failed to connect to Kubernetes cluster. Please check your connection and try again.');
  }
};

const refreshAfterImport = async () => {
  await loadContexts();
  await loadNamespaces();
};

// Export the store
export const contextStore = {
  // State
  contexts,
  contextsLoading,
  selectedContext,
  activeContext,
  namespaces,
  namespacesLoading,
  selectedNamespace,
  appInitialized,
  initializationError,

  // Actions
  loadContexts,
  changeContext,
  loadNamespaces,
  setSelectedContext,
  setSelectedNamespace,
  initializeStore,
  refreshAfterImport
};
