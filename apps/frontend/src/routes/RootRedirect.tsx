import { Component, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { contextStore } from '../stores/contextStore';

const RootRedirect: Component = () => {
  const navigate = useNavigate();

  onMount(() => {
    const context = contextStore.selectedContext();
    const namespace = contextStore.selectedNamespace() || contextStore.namespaces()[0] || 'default';

    if (context) {
      navigate(`/${encodeURIComponent(context)}/${encodeURIComponent(namespace)}/nodes`, { replace: true });
    }
  });

  return (
    <div class="flex items-center justify-center min-h-[50vh]">
      <span class="loading loading-lg loading-spinner text-primary" />
    </div>
  );
};

export default RootRedirect;
