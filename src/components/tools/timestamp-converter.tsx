import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Clock3,
  Copy,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CopiedKey =
  | 'local'
  | 'utc'
  | 'iso'
  | 'seconds'
  | 'milliseconds'
  | 'relative'
  | null;

interface ParsedTimestamp {
  date: Date;
  sourceLabel: string;
}

function parseTimestampInput(rawValue: string): ParsedTimestamp | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (/^-?\d+$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    const digits = value.replace('-', '').length;
    const isSeconds = digits <= 10;
    const date = new Date(isSeconds ? numeric * 1000 : numeric);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return {
      date,
      sourceLabel: isSeconds ? 'Unix seconds' : 'Unix milliseconds',
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    date: parsed,
    sourceLabel: 'Date string',
  };
}

function formatLocalDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(date);
}

function formatUtcDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
}

function formatLocalInputValue(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatRelativeTime(date: Date, nowMs: number) {
  const diffMs = date.getTime() - nowMs;
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['week', 1000 * 60 * 60 * 24 * 7],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
    ['second', 1000],
  ];

  for (const [unit, unitMs] of units) {
    if (absMs >= unitMs || unit === 'second') {
      return rtf.format(Math.round(diffMs / unitMs), unit);
    }
  }

  return 'now';
}

function timezoneOffsetLabel(date: Date) {
  const totalMinutes = -date.getTimezoneOffset();
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(totalMinutes);
  const hours = Math.floor(absolute / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (absolute % 60).toString().padStart(2, '0');

  return `UTC${sign}${hours}:${minutes}`;
}

export function TimestampConverter() {
  const [input, setInput] = useState(() => new Date().toISOString());
  const [copiedKey, setCopiedKey] = useState<CopiedKey>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const parsed = useMemo(() => parseTimestampInput(input), [input]);

  const outputs = useMemo(() => {
    if (!parsed) {
      return null;
    }

    const { date, sourceLabel } = parsed;

    return {
      sourceLabel,
      local: formatLocalDate(date),
      utc: `${formatUtcDate(date)} UTC`,
      iso: date.toISOString(),
      seconds: Math.floor(date.getTime() / 1000).toString(),
      milliseconds: date.getTime().toString(),
      relative: formatRelativeTime(date, now),
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local timezone',
      offset: timezoneOffsetLabel(date),
    };
  }, [now, parsed]);

  const handleCopy = async (key: Exclude<CopiedKey, null>, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy timestamp value:', error);
    }
  };

  const applyDate = (
    date: Date,
    format: 'iso' | 'seconds' | 'milliseconds' | 'local' = 'iso',
  ) => {
    if (format === 'seconds') {
      setInput(Math.floor(date.getTime() / 1000).toString());
      return;
    }

    if (format === 'milliseconds') {
      setInput(date.getTime().toString());
      return;
    }

    if (format === 'local') {
      setInput(formatLocalInputValue(date));
      return;
    }

    setInput(date.toISOString());
  };

  const baseDate = parsed?.date ?? new Date();

  const presetButtons = [
    { label: 'Now', onClick: () => applyDate(new Date()) },
    { label: 'Unix s', onClick: () => applyDate(new Date(), 'seconds') },
    {
      label: 'Unix ms',
      onClick: () => applyDate(new Date(), 'milliseconds'),
    },
    { label: 'Local', onClick: () => applyDate(new Date(), 'local') },
    {
      label: '+1 hour',
      onClick: () =>
        applyDate(new Date(baseDate.getTime() + 60 * 60 * 1000)),
    },
    {
      label: '+1 day',
      onClick: () =>
        applyDate(new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)),
    },
    {
      label: 'Start of day',
      onClick: () =>
        applyDate(
          new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            0,
            0,
            0,
            0,
          ),
        ),
    },
    {
      label: 'End of day',
      onClick: () =>
        applyDate(
          new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            23,
            59,
            59,
            999,
          ),
        ),
    },
  ];

  const outputCards = [
    {
      key: 'local' as const,
      label: 'Local Time',
      value: outputs?.local ?? 'Waiting for valid input',
    },
    {
      key: 'utc' as const,
      label: 'UTC Time',
      value: outputs?.utc ?? 'Waiting for valid input',
    },
    {
      key: 'iso' as const,
      label: 'ISO 8601',
      value: outputs?.iso ?? 'Waiting for valid input',
    },
    {
      key: 'seconds' as const,
      label: 'Unix Seconds',
      value: outputs?.seconds ?? 'Waiting for valid input',
    },
    {
      key: 'milliseconds' as const,
      label: 'Unix Milliseconds',
      value: outputs?.milliseconds ?? 'Waiting for valid input',
    },
    {
      key: 'relative' as const,
      label: 'Relative Time',
      value: outputs?.relative ?? 'Waiting for valid input',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="border border-border bg-card text-card-foreground shadow-none">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px] font-bold">Input</CardTitle>
            <CardDescription className="text-[13px] leading-normal">
              Paste a Unix timestamp, ISO string, or browser-parseable date and
              convert it instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="timestamp-input" className="text-foreground">
                  Date / Timestamp
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Supports Unix s, Unix ms, ISO-8601
                </span>
              </div>
              <Input
                id="timestamp-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="1719830400 or 2026-06-28T09:15:00Z"
                className="border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {presetButtons.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={preset.onClick}
                  className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="default"
                onClick={() => applyDate(new Date())}
                className="h-8"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Now
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInput('')}
                disabled={!input}
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-none">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px] font-bold">Status</CardTitle>
            <CardDescription className="text-[13px] leading-normal">
              Quick parse feedback and timezone context based on your current
              browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-[13px]">
            <div className="rounded-md border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Parse Result
              </p>
              <p className="mt-2 text-sm text-foreground">
                {outputs ? outputs.sourceLabel : 'Invalid or empty input'}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Local Timezone
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                <CalendarClock className="h-4 w-4 text-primary" />
                {outputs
                  ? `${outputs.timezone} (${outputs.offset})`
                  : 'Waiting for valid input'}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Relative
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                {outputs ? outputs.relative : 'No relative time available'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {outputCards.map((item) => {
          const canCopy = Boolean(outputs);
          const copied = copiedKey === item.key;

          return (
            <Card
              key={item.key}
              className="border border-border bg-card text-card-foreground shadow-none"
            >
              <CardHeader className="border-b border-border">
                <CardTitle className="text-[15px] font-bold">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="min-h-20 rounded-md border border-border bg-background/60 p-3">
                  <p className="break-words font-mono text-xs leading-6 text-foreground">
                    {item.value}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => canCopy && handleCopy(item.key, item.value)}
                  disabled={!canCopy}
                  className="w-full border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy value'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
