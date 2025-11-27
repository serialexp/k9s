const trimTrailingZeros = (input: string) => input.replace(/\.?0+$/, '');

export const formatCpuQuantity = (value?: string) => {
  if (!value) return undefined;
  if (value.endsWith('m')) {
    const milli = Number.parseFloat(value.slice(0, -1));
    if (!Number.isFinite(milli)) return `${value}c`;
    const cores = milli / 1000;
    const precision = cores >= 0.1 ? 2 : 3;
    const formatted = trimTrailingZeros(cores.toFixed(precision));
    return `${formatted}c`;
  }
  return `${trimTrailingZeros(value)}c`;
};

export const formatMemoryQuantity = (value?: string) => {
  if (!value) return undefined;
  const match = value.match(/^([0-9.]+)([A-Za-z]+)?$/);
  if (!match) return value;
  const [, amount, unit] = match;
  if (!unit) {
    return `${amount}b`;
  }
  const shorthand = unit
    .replace(/Ki/i, 'k')
    .replace(/Mi/i, 'm')
    .replace(/Gi/i, 'g')
    .replace(/Ti/i, 't')
    .replace(/Pi/i, 'p')
    .replace(/Ei/i, 'e')
    .replace(/K/, 'k')
    .replace(/M/, 'm')
    .replace(/G/, 'g')
    .replace(/T/, 't')
    .replace(/P/, 'p')
    .replace(/E/, 'e')
    .replace(/B/i, 'b');
  return `${amount}${shorthand}`;
};

export const formatResourceLine = (cpu?: string, memory?: string) => {
  const formattedCpu = formatCpuQuantity(cpu);
  const formattedMemory = formatMemoryQuantity(memory);
  if (formattedCpu && formattedMemory) return `${formattedCpu}/${formattedMemory}`;
  return formattedCpu ?? formattedMemory ?? '-';
};

export const formatPercent = (ratio?: number, fractionDigits = 0) => {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) return '—';
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
};

const parseCpuToCores = (value?: string): number | undefined => {
  if (!value) return undefined;
  if (value.endsWith('m')) {
    const milli = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(milli) ? milli / 1000 : undefined;
  }
  const cores = Number.parseFloat(value);
  return Number.isFinite(cores) ? cores : undefined;
};

export const formatCpuComparison = (used?: string, reserved?: string): string => {
  const usedCores = parseCpuToCores(used);
  const reservedCores = parseCpuToCores(reserved);

  if (usedCores === undefined || reservedCores === undefined) {
    return `${used ?? '—'} / ${reserved ?? '—'}`;
  }

  const formatCore = (cores: number) => {
    if (cores >= 1) {
      return trimTrailingZeros(cores.toFixed(2));
    }
    return trimTrailingZeros(cores.toFixed(3));
  };

  return `${formatCore(usedCores)} / ${formatCore(reservedCores)}`;
};

const parseMemoryToGiB = (value?: string): number | undefined => {
  if (!value) return undefined;
  const match = value.match(/^([0-9.]+)([A-Za-z]+)?$/);
  if (!match) return undefined;

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return undefined;

  const unit = match[2]?.toUpperCase() || 'B';

  const multipliers: Record<string, number> = {
    'B': 1 / (1024 ** 3),
    'KI': 1 / (1024 ** 2),
    'MI': 1 / 1024,
    'GI': 1,
    'TI': 1024,
    'PI': 1024 ** 2,
    'EI': 1024 ** 3,
  };

  const multiplier = multipliers[unit];
  return multiplier !== undefined ? amount * multiplier : undefined;
};

export const formatMemoryComparison = (used?: string, reserved?: string): string => {
  const usedGiB = parseMemoryToGiB(used);
  const reservedGiB = parseMemoryToGiB(reserved);

  if (usedGiB === undefined || reservedGiB === undefined) {
    return `${used ?? '—'} / ${reserved ?? '—'}`;
  }

  const formatGiB = (gib: number) => {
    if (gib >= 1) {
      return `${trimTrailingZeros(gib.toFixed(2))} Gi`;
    }
    const mib = gib * 1024;
    return `${trimTrailingZeros(mib.toFixed(0))} Mi`;
  };

  return `${formatGiB(usedGiB)} / ${formatGiB(reservedGiB)}`;
};
