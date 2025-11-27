export interface AnsiSegment {
  text: string;
  className?: string;
}

const ANSI_PATTERN = /\u001b\[(\d{1,3}(?:;\d{1,3})*)m/g;

const COLOR_MAP: Record<number, string> = {
  30: 'text-base-content',
  31: 'text-error',
  32: 'text-success',
  33: 'text-warning',
  34: 'text-info',
  35: 'text-secondary',
  36: 'text-info',
  37: 'text-base-content',
  90: 'text-neutral-content',
  91: 'text-error',
  92: 'text-success',
  93: 'text-warning',
  94: 'text-info',
  95: 'text-secondary',
  96: 'text-info',
  97: 'text-base-content'
};

const RESET_CODES = new Set([0, 39, 49]);

export function parseAnsi(input: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let currentClass: string | undefined;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ANSI_PATTERN.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), className: currentClass });
    }

    const codes = match[1].split(';').map((code) => Number.parseInt(code, 10));
    for (const code of codes) {
      if (RESET_CODES.has(code)) {
        currentClass = undefined;
        continue;
      }

      const mapped = COLOR_MAP[code];
      if (mapped) {
        currentClass = mapped;
      }
    }

    lastIndex = ANSI_PATTERN.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), className: currentClass });
  }

  return segments;
}
