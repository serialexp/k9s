import { batch, createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js';
import { streamPodLogs } from '../lib/api';
import { parseAnsi } from '../utils/ansi';

interface ContainerStatus {
  name: string;
  ready: boolean;
  restartCount: number;
  image: string;
  state?: Record<string, unknown>;
}

interface LogViewerProps {
  namespace?: string;
  pod?: string;
  containers: string[];
  containersStatus?: ContainerStatus[];
  active?: boolean;
}

interface LogEntry {
  raw: string;
  message: string;
  json?: Record<string, unknown>;
  timestamp?: string;
}

const MAX_LOG_ENTRIES = 1000;
const ISO_TIMESTAMP_PATTERN = /^(?:\[)?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)(?:\])?(?:\s|-)?/;
const JSON_MESSAGE_KEYS = ['message', 'msg', 'log'];
const JSON_TIMESTAMP_KEYS = ['time', 'timestamp', 'ts', '@timestamp'];
const KEY_VALUE_KEY_PATTERN = /(?:^|\s)([A-Za-z0-9_.-]+)=/g;
const ACCESS_LOG_TOKEN_PATTERN = /"[^"]*"|\[[^\]]*\]|\S+/g;
const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12'
};
const STRIP_ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

const extractStringField = (data: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
};

const stripAnsiCodes = (value: string) => value.replace(STRIP_ANSI_PATTERN, '');

const stripQuotes = (value: string) => {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('[') && value.endsWith(']'))) {
    return value.slice(1, -1);
  }
  return value;
};

const convertScalarValue = (value: string): unknown => {
  if (!value.length) return value;
  const lower = value.toLowerCase();
  if (lower === '<nil>' || lower === 'nil' || lower === 'null') {
    return null;
  }
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  const number = Number(value);
  if (!Number.isNaN(number) && value.trim() === String(number)) {
    return number;
  }
  return value;
};

const parseGoStructure = (input: string, start = 0): { value: unknown; index: number } => {
  let index = start;
  while (index < input.length && input[index] === ' ') {
    index += 1;
  }

  if (input.startsWith('map[', index)) {
    index += 4;
    const result: Record<string, unknown> = {};
    while (index < input.length && input[index] !== ']') {
      while (index < input.length && input[index] === ' ') {
        index += 1;
      }
      const keyStart = index;
      while (index < input.length && input[index] !== ':' && input[index] !== ']') {
        index += 1;
      }
      if (index >= input.length || input[index] !== ':') {
        break;
      }
      const key = input.slice(keyStart, index);
      index += 1;
      const valueResult = parseGoStructure(input, index);
      result[key] = valueResult.value;
      index = valueResult.index;
      while (index < input.length && (input[index] === ' ' || input[index] === ',')) {
        index += 1;
      }
    }
    if (index < input.length && input[index] === ']') {
      index += 1;
    }
    return { value: result, index };
  }

  if (input.startsWith('<nil>', index)) {
    return { value: null, index: index + 5 };
  }

  let end = index;
  let depth = 0;
  while (end < input.length) {
    const char = input[end];
    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      if (depth === 0) {
        break;
      }
      depth -= 1;
    } else if (char === ' ' && depth === 0) {
      const rest = input.slice(end + 1);
      const match = rest.match(/^([A-Za-z0-9_.-]+):/);
      if (match) {
        break;
      }
    }
    end += 1;
  }

  const rawValue = input.slice(index, end).trim().replace(/,$/, '');
  return { value: convertScalarValue(rawValue), index: end };
};

const tryParseGoStructure = (value: string): unknown => {
  if (!value.startsWith('map[')) {
    return convertScalarValue(value);
  }
  return parseGoStructure(value).value;
};

const parseJsonLog = (rawLine: string, originalLine: string): LogEntry | undefined => {
  const trimmed = rawLine.trim();
  const offset = trimmed.startsWith('{') || trimmed.startsWith('[') ? 0 : trimmed.search(/[\[{]/);
  if (offset === -1) {
    return undefined;
  }
  const candidate = trimmed.slice(offset);
  try {
    const data = JSON.parse(candidate);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return undefined;
    }
    const record = data as Record<string, unknown>;
    const message = extractStringField(record, JSON_MESSAGE_KEYS) ?? rawLine;
    const timestamp = extractStringField(record, JSON_TIMESTAMP_KEYS);
    return {
      raw: originalLine,
      json: record,
      message,
      timestamp
    };
  } catch {
    return undefined;
  }
};

const parseKeyValueLog = (rawLine: string, originalLine: string): LogEntry | undefined => {
  const matches = [...rawLine.matchAll(KEY_VALUE_KEY_PATTERN)];
  if (!matches.length) {
    return undefined;
  }

  const data: Record<string, unknown> = {};
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const key = match[1];
    if (!key) continue;
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = index + 1 < matches.length ? matches[index + 1].index ?? rawLine.length : rawLine.length;
    const value = rawLine.slice(valueStart, valueEnd).trim();
    const unwrapped = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
    data[key] = tryParseGoStructure(unwrapped);
  }

  if (!Object.keys(data).length) {
    return undefined;
  }

  const message = extractStringField(data, ['msg', 'message']) ?? rawLine;
  const timestamp = extractStringField(data, JSON_TIMESTAMP_KEYS);

  return {
    raw: originalLine,
    json: data,
    message,
    timestamp
  };
};

const parseAccessLogTimestamp = (value: string) => {
  const match = value.match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!match) {
    return undefined;
  }

  const [, day, monthName, year, hour, minute, second, offsetRaw] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) {
    return undefined;
  }

  const offset = `${offsetRaw.slice(0, 3)}:${offsetRaw.slice(3)}`;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
};

const parseAccessLog = (rawLine: string, originalLine: string): LogEntry | undefined => {
  const tokens = rawLine.match(ACCESS_LOG_TOKEN_PATTERN);
  if (!tokens || tokens.length < 7) {
    return undefined;
  }

  const [remoteHost, ident, user, timeToken, requestToken, statusToken, sizeToken, refererToken, userAgentToken, ...rest] = tokens;
  if (!timeToken?.startsWith('[') || !requestToken?.startsWith('"')) {
    return undefined;
  }

  const requestText = stripQuotes(requestToken);
  const [method, path, protocol] = requestText.split(' ');
  const statusValue = Number(statusToken);
  const status = statusToken === '-' || Number.isNaN(statusValue) ? undefined : statusValue;
  const sizeValue = Number(sizeToken);
  const size = sizeToken === '-' || Number.isNaN(sizeValue) ? undefined : sizeValue;
  const referer = refererToken ? stripQuotes(refererToken) : undefined;
  const userAgent = userAgentToken ? stripQuotes(userAgentToken) : undefined;
  const timestamp = parseAccessLogTimestamp(stripQuotes(timeToken));

  const data: Record<string, unknown> = {
    remoteHost,
    ident,
    user,
    request: requestText,
    method,
    path,
    protocol,
    status,
    size
  };

  if (referer && referer !== '-') {
    data.referer = referer;
  }
  if (userAgent && userAgent !== '-') {
    data.userAgent = userAgent;
  }
  if (rest.length) {
    data.extra = rest.map(stripQuotes).filter((item) => item.length);
  }

  const messageParts = [] as string[];
  if (method) {
    messageParts.push(method);
  }
  if (path) {
    messageParts.push(path);
  }
  if (status !== undefined) {
    messageParts.push(`(${status})`);
  }

  const message = messageParts.length ? messageParts.join(' ') : rawLine;

  return {
    raw: originalLine,
    json: data,
    message,
    timestamp
  };
};

const parseLogLine = (line: string): LogEntry => {
  const rawLine = line.replace(/\r?\n$/, '');
  if (!rawLine.length) {
    return { raw: line, message: '' };
  }

  const sanitizedLine = stripAnsiCodes(rawLine);
  let detectedTimestamp: string | undefined;
  let rawContent = rawLine;
  let sanitizedContent = sanitizedLine;

  const timestampMatch = sanitizedContent.match(ISO_TIMESTAMP_PATTERN);
  if (timestampMatch) {
    detectedTimestamp = timestampMatch[1];
    const prefixLength = timestampMatch[0].length;
    sanitizedContent = sanitizedContent.slice(prefixLength).trimStart();
    rawContent = rawContent.slice(prefixLength).replace(/^\s+/, '');
  }

  const jsonEntry = parseJsonLog(sanitizedContent, rawLine);
  if (jsonEntry) {
    return {
      ...jsonEntry,
      raw: rawLine,
      timestamp: detectedTimestamp ?? jsonEntry.timestamp
    };
  }

  const keyValueEntry = parseKeyValueLog(sanitizedContent, rawLine);
  if (keyValueEntry) {
    return {
      ...keyValueEntry,
      raw: rawLine,
      timestamp: detectedTimestamp ?? keyValueEntry.timestamp
    };
  }

  const accessLogEntry = parseAccessLog(sanitizedContent, rawLine);
  if (accessLogEntry) {
    return {
      ...accessLogEntry,
      raw: rawLine,
      timestamp: detectedTimestamp ?? accessLogEntry.timestamp
    };
  }

  return {
    raw: rawLine,
    message: rawContent,
    timestamp: detectedTimestamp
  };
};

const LogViewer = (props: LogViewerProps) => {
  const [entries, setEntries] = createSignal<LogEntry[]>([]);
  const [viewMode, setViewMode] = createSignal<'structured' | 'messages' | 'raw'>('structured');
  const [selectedContainer, setSelectedContainer] = createSignal<string>('');
  const [showPrevious, setShowPrevious] = createSignal(false);
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [autoScroll, setAutoScroll] = createSignal(true);

  const selectedContainerStatus = createMemo(() => {
    const container = selectedContainer();
    if (!container || !props.containersStatus) return undefined;
    return props.containersStatus.find((cs) => cs.name === container);
  });

  const hasRestarts = createMemo(() => (selectedContainerStatus()?.restartCount ?? 0) > 0);

  let scrollContainerRef: HTMLDivElement | undefined;
  let lastUserScrollTime = 0;
  let isProgrammaticScroll = false;

  const scrollToBottom = () => {
    if (scrollContainerRef && autoScroll()) {
      isProgrammaticScroll = true;
      scrollContainerRef.scrollTop = scrollContainerRef.scrollHeight;
      // Reset flag after a brief delay to allow the scroll event to fire
      setTimeout(() => {
        isProgrammaticScroll = false;
      }, 100);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef || isProgrammaticScroll) return;

    const now = Date.now();
    const timeSinceLastUserScroll = now - lastUserScrollTime;

    // Only check scroll position if there was a recent user interaction
    if (timeSinceLastUserScroll < 150) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setAutoScroll(isAtBottom);
    }
  };

  const handleUserScroll = () => {
    lastUserScrollTime = Date.now();
  };

  // Auto-scroll when new entries are added
  createEffect(() => {
    entries(); // Track entries changes
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
  });

  createEffect(() => {
    const containers = props.containers;
    if (containers.length && !selectedContainer()) {
      setSelectedContainer(containers[0]);
      setShowPrevious(false);
    } else if (selectedContainer() && !containers.includes(selectedContainer())) {
      setSelectedContainer(containers[0] ?? '');
      setShowPrevious(false);
    }
  });

  // Reset showPrevious when container changes to one without restarts
  createEffect(() => {
    if (!hasRestarts() && showPrevious()) {
      setShowPrevious(false);
    }
  });

  createEffect(() => {
    const namespace = props.namespace;
    const pod = props.pod;
    const container = selectedContainer();
    const previous = showPrevious();
    const isActive = props.active ?? true;

    if (!isActive || !namespace || !pod || !container) {
      setEntries([]);
      setIsStreaming(false);
      return;
    }

    setEntries([]);
    setIsStreaming(true);
    let buffer = '';

    const stop = streamPodLogs({
      namespace,
      pod,
      container,
      previous,
      follow: !previous,
      onChunk: (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        const newEntries = lines.filter((line) => line.length > 0).map(parseLogLine);
        if (newEntries.length) {
          batch(() =>
            setEntries((prev) => {
              const merged = [...prev, ...newEntries];
              if (merged.length > MAX_LOG_ENTRIES) {
                return merged.slice(merged.length - MAX_LOG_ENTRIES);
              }
              return merged;
            })
          );
        }
      },
      onComplete: () => {
        setIsStreaming(false);
      },
      onError: (error) => {
        console.error('Log streaming failed:', error);
        setIsStreaming(false);
      }
    });

    onCleanup(() => {
      stop();
      buffer = '';
      setIsStreaming(false);
    });
  });

  const structuredEntries = createMemo(() => entries().filter((entry) => entry.message.length));

  const renderAnsi = (message: string) => (
    <For each={parseAnsi(message)}>
      {(segment) => (
        <span class={segment.className ?? undefined}>{segment.text}</span>
      )}
    </For>
  );

  const formatTimestamp = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return {
      display: date.toLocaleTimeString([], { hour12: false }),
      full: date.toISOString()
    };
  };

  const content = () => {
    switch (viewMode()) {
      case 'messages':
        return (
          <div class="flex flex-col gap-1 text-xs font-mono">
            <For each={structuredEntries()}>
              {(entry) => (
                <pre class="whitespace-pre-wrap break-words overflow-x-hidden">{renderAnsi(entry.message)}</pre>
              )}
            </For>
          </div>
        );
      case 'raw':
        return (
          <pre class="rounded-lg bg-base-300/60 p-3 text-xs whitespace-pre-wrap break-words overflow-x-hidden">
            {entries().map((entry) => entry.raw).join('\n')}
          </pre>
        );
      case 'structured':
      default:
        return (
          <div class="space-y-2 rounded-lg bg-base-300/40 p-3 text-xs">
            <For each={entries()}>
              {(entry) => {
                const info = formatTimestamp(entry.timestamp);
                return (
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                    <div class="md:w-24 md:shrink-0">
                      {info ? (
                        <div
                          class="tooltip tooltip-bottom block text-[0.7rem] uppercase tracking-wide opacity-70"
                          data-tip={info.full}
                        >
                          {info.display}
                        </div>
                      ) : entry.timestamp ? (
                        <div class="block text-[0.7rem] uppercase tracking-wide opacity-70">
                          {entry.timestamp}
                        </div>
                      ) : (
                        <div class="block text-[0.7rem] uppercase tracking-wide opacity-40">—</div>
                      )}
                    </div>
                    <div class="flex-1 min-w-0">
                      <pre class="font-mono text-[0.75rem] whitespace-pre-wrap break-words overflow-x-hidden">
                        {renderAnsi(entry.message)}
                      </pre>
                      <Show when={entry.json}>
                        <pre class="mt-2 rounded bg-base-300/70 p-2 whitespace-pre-wrap break-words overflow-x-hidden">
                          {JSON.stringify(entry.json, null, 2)}
                        </pre>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        );
    }
  };

  return (
    <div class="flex flex-col h-full relative">
      <div class="flex items-center justify-between flex-shrink-0 mb-4">
        <h2 class="text-lg font-semibold">Logs</h2>
        <div class="flex items-center gap-2">
          <Show when={props.containers.length}>
            <select
              class="select select-xs select-bordered font-mono"
              value={selectedContainer()}
              onChange={(event) => setSelectedContainer((event.target as HTMLSelectElement).value)}
            >
              <For each={props.containers}>{(container) => <option value={container}>{container}</option>}</For>
            </select>
          </Show>
          <Show when={hasRestarts()}>
            <div class="join join-horizontal">
              <button
                type="button"
                class={`btn btn-xs join-item ${!showPrevious() ? 'btn-active' : ''}`}
                onClick={() => setShowPrevious(false)}
                title="Current container logs"
              >
                Live
              </button>
              <button
                type="button"
                class={`btn btn-xs join-item ${showPrevious() ? 'btn-active' : ''}`}
                onClick={() => setShowPrevious(true)}
                title={`Logs from previous container instance (${selectedContainerStatus()?.restartCount} restart${(selectedContainerStatus()?.restartCount ?? 0) > 1 ? 's' : ''})`}
              >
                Prev
              </button>
            </div>
          </Show>
          <div class="join join-horizontal">
            <button
              type="button"
              class={`btn btn-xs join-item ${viewMode() === 'structured' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('structured')}
            >
              Structured
            </button>
            <button
              type="button"
              class={`btn btn-xs join-item ${viewMode() === 'messages' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('messages')}
            >
              Messages
            </button>
            <button
              type="button"
              class={`btn btn-xs join-item ${viewMode() === 'raw' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        class="flex-1 rounded-lg border border-base-200/50 bg-base-200/40 p-3 overflow-y-auto"
        onScroll={handleScroll}
        onWheel={handleUserScroll}
        onTouchStart={handleUserScroll}
      >
        <Show
          when={props.namespace && props.pod}
          fallback={<p class="text-sm opacity-60">Select a pod to view logs.</p>}
        >
          <Show when={entries().length} fallback={isStreaming() ? <span class="loading loading-dots" /> : <p class="text-sm opacity-60">No log entries yet.</p>}>
            {content()}
          </Show>
        </Show>
      </div>
      <Show when={!autoScroll() && entries().length > 0}>
        <button
          type="button"
          class="btn btn-xs btn-primary absolute bottom-6 right-6 z-20 shadow-lg"
          onClick={() => {
            setAutoScroll(true);
            scrollToBottom();
          }}
        >
          ↓ Bottom
        </button>
      </Show>
    </div>
  );
};

export default LogViewer;
