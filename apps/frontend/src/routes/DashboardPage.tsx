import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import ManifestViewer from '../components/ManifestViewer';
import PodTable from '../components/PodTable';
import PodInfoPanel from '../components/PodInfoPanel';
import PodEventsPanel from '../components/PodEventsPanel';
import PodStatusPanel from '../components/PodStatusPanel';
import LogViewer from '../components/LogViewer';
import PortForwardDialog from '../components/PortForwardDialog';
import { contextStore } from '../stores/contextStore';
import { portForwardStore } from '../stores/portForwardStore';
import { uiStore } from '../stores/uiStore';
import {
  fetchPod,
  fetchPodEvents,
  fetchPodManifest,
  fetchPods,
  fetchPodStatus,
  startPortForward,
  subscribeToPodEvents,
  type PodDetail,
  type PodEvent,
  type PodListItem,
  type PodStatus,
  type PodWatchEvent
} from '../lib/api';

const applyPodWatchEvent = (pods: PodListItem[], event: PodWatchEvent): PodListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...pods.filter((pod) => pod.name !== object.name), object];
    case 'MODIFIED':
      return pods.map((pod) =>
        pod.name === object.name
          ? {
              ...pod,
              ...object,
              cpuUsage: object.cpuUsage ?? pod.cpuUsage,
              memoryUsage: object.memoryUsage ?? pod.memoryUsage
            }
          : pod
      );
    case 'DELETED':
      return pods.filter((pod) => pod.name !== object.name);
    default:
      return pods;
  }
};

const sortPods = (pods: PodListItem[]) =>
  [...pods].sort((a, b) => a.name.localeCompare(b.name));

const DashboardPage = () => {

  const [pods, setPods] = createSignal<PodListItem[]>([]);
  const [podsLoading, setPodsLoading] = createSignal(false);
  const [selectedPod, setSelectedPod] = createSignal<PodListItem | undefined>();

  const [podDetail, setPodDetail] = createSignal<PodDetail | undefined>();
  const [podDetailLoading, setPodDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [podEvents, setPodEvents] = createSignal<PodEvent[]>([]);
  const [podEventsLoading, setPodEventsLoading] = createSignal(false);

  const [podStatus, setPodStatus] = createSignal<PodStatus | undefined>();
  const [podStatusLoading, setPodStatusLoading] = createSignal(false);

  const [portForwardDialogOpen, setPortForwardDialogOpen] = createSignal(false);

  let unsubscribePodStream: (() => void) | undefined;

  const loadPods = async (namespace: string) => {
    setPodsLoading(true);
    try {
      const items = await fetchPods(namespace);
      const sorted = sortPods(items);
      setPods(sorted);
      if (sorted.length && (!selectedPod() || selectedPod()?.namespace !== namespace)) {
        setSelectedPod(sorted[0]);
      }
    } catch (error) {
      console.error('Failed to load pods', error);
      setPods([]);
    } finally {
      setPodsLoading(false);
    }
  };

  const loadPodDetail = async (namespace: string, podName: string) => {
    setPodDetailLoading(true);
    setPodEventsLoading(true);
    setPodStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchPod(namespace, podName),
        fetchPodManifest(namespace, podName),
        fetchPodEvents(namespace, podName),
        fetchPodStatus(namespace, podName)
      ]);
      batch(() => {
        setPodDetail(detail);
        setManifest(manifestYaml);
        setPodEvents(events);
        setPodStatus(status);
      });
    } catch (error) {
      console.error('Failed to load pod detail', error);
      setPodDetail(undefined);
      setManifest('');
      setPodEvents([]);
      setPodStatus(undefined);
    } finally {
      setPodDetailLoading(false);
      setPodEventsLoading(false);
      setPodStatusLoading(false);
    }
  };

  const handleStartPortForward = async (localPort: number, targetPort: number) => {
    const pod = selectedPod();
    if (!pod) throw new Error('No pod selected');
    await startPortForward(pod.namespace, pod.name, localPort, targetPort);
    await portForwardStore.loadForwards();
  };

  createEffect(() => {
    const namespace = contextStore.selectedNamespace();
    if (!namespace) return;

    setSelectedPod(undefined);
    setPodDetail(undefined);
    setManifest('');
    setPodEvents([]);
    setPodStatus(undefined);

    void loadPods(namespace);

    if (unsubscribePodStream) {
      unsubscribePodStream();
    }

    unsubscribePodStream = subscribeToPodEvents(namespace, (event) => {
      let nextPods: PodListItem[] = [];
      setPods((prev) => {
        nextPods = sortPods(applyPodWatchEvent(prev, event));
        return nextPods;
      });

      const currentSelection = selectedPod();
      if (currentSelection) {
        const updatedSelection = nextPods.find((pod) => pod.name === currentSelection.name);
        if (updatedSelection && updatedSelection !== currentSelection) {
          setSelectedPod(updatedSelection);
        } else if (!updatedSelection) {
          setSelectedPod(nextPods[0]);
        }
      }
    });
  });

  createEffect(() => {
    const pod = selectedPod();
    if (!pod) return;
    void loadPodDetail(pod.namespace, pod.name);
  });

  onCleanup(() => {
    unsubscribePodStream?.();
  });

  return (
    <div class="flex flex-col gap-6">
      <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
        <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
          <div class="card-body flex-1 overflow-hidden">
            <div class="overflow-y-auto h-full">
              <PodTable
                pods={pods()}
                selectedPod={selectedPod()?.name}
                loading={podsLoading()}
                onSelect={(pod) => setSelectedPod(pod)}
              />
            </div>
          </div>
        </div>

        <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
          <div class="card-body gap-0 p-0 flex-1 overflow-hidden flex flex-col">
            <div class="tabs tabs-boxed px-4 pt-4 flex-shrink-0 w-full flex items-center">
              <button
                type="button"
                class={`tab ${uiStore.selectedPodTab() === 'info' ? 'tab-active' : ''}`}
                onClick={() => uiStore.setSelectedPodTab('info')}
              >
                Info
              </button>
              <button
                type="button"
                class={`tab ${uiStore.selectedPodTab() === 'manifest' ? 'tab-active' : ''}`}
                onClick={() => uiStore.setSelectedPodTab('manifest')}
              >
                Definition
              </button>
              <button
                type="button"
                class={`tab ${uiStore.selectedPodTab() === 'events' ? 'tab-active' : ''}`}
                onClick={() => uiStore.setSelectedPodTab('events')}
              >
                Events
              </button>
              <button
                type="button"
                class={`tab ${uiStore.selectedPodTab() === 'status' ? 'tab-active' : ''}`}
                onClick={() => uiStore.setSelectedPodTab('status')}
              >
                Status
              </button>
              <button
                type="button"
                class={`tab ${uiStore.selectedPodTab() === 'logs' ? 'tab-active' : ''}`}
                onClick={() => uiStore.setSelectedPodTab('logs')}
              >
                Logs
              </button>
              <div class="flex-1" />
              <Show when={selectedPod()}>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  onClick={() => setPortForwardDialogOpen(true)}
                >
                  Port Forward
                </button>
              </Show>
            </div>
            <div class="divider my-0 flex-shrink-0" />
            <div class="p-6 flex-1 overflow-y-auto">
              <Switch>
                <Match when={uiStore.selectedPodTab() === 'info'}>
                  <PodInfoPanel pod={podDetail()} events={podEvents()} loading={podDetailLoading()} />
                </Match>
                <Match when={uiStore.selectedPodTab() === 'manifest'}>
                  <ManifestViewer manifest={manifest()} loading={podDetailLoading()} />
                </Match>
                <Match when={uiStore.selectedPodTab() === 'events'}>
                  <PodEventsPanel events={podEvents()} loading={podEventsLoading()} />
                </Match>
                <Match when={uiStore.selectedPodTab() === 'status'}>
                  <PodStatusPanel status={podStatus()} loading={podStatusLoading()} />
                </Match>
                <Match when={uiStore.selectedPodTab() === 'logs'}>
                  <LogViewer
                    namespace={selectedPod()?.namespace}
                    pod={selectedPod()?.name}
                    containers={selectedPod()?.containers ?? []}
                    containersStatus={podDetail()?.containersStatus}
                    active={uiStore.selectedPodTab() === 'logs'}
                  />
                </Match>
              </Switch>
            </div>
          </div>
        </div>
      </section>

      <Show when={selectedPod()}>
        {(pod) => (
          <PortForwardDialog
            open={portForwardDialogOpen()}
            namespace={pod().namespace}
            pod={pod().name}
            containerPorts={podDetail()?.containerPorts}
            onClose={() => setPortForwardDialogOpen(false)}
            onStart={handleStartPortForward}
          />
        )}
      </Show>
    </div>
  );
};

export default DashboardPage;
