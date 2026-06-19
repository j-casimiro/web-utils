import { useState, useEffect } from 'react';
import { Calendar, Play, Settings, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

// Parser helpers
function parseCronField(field: string, min: number, max: number, aliases: Record<string, number> = {}): Set<number> {
  const result = new Set<number>();
  const parts = field.split(',');

  for (const part of parts) {
    const trimmed = part.trim().toLowerCase();
    if (!trimmed) continue;

    if (trimmed === '*') {
      for (let i = min; i <= max; i++) result.add(i);
      continue;
    }

    const stepParts = trimmed.split('/');
    const rangeStr = stepParts[0];
    const step = stepParts[1] ? parseInt(stepParts[1], 10) : 1;

    if (isNaN(step) || step <= 0) throw new Error('Invalid step value');

    let start = min;
    let end = max;

    if (rangeStr !== '*') {
      const rangeParts = rangeStr.split('-');
      
      const parseVal = (val: string) => {
        if (aliases[val] !== undefined) return aliases[val];
        const num = parseInt(val, 10);
        if (isNaN(num)) throw new Error(`Invalid value: ${val}`);
        return num;
      };

      start = parseVal(rangeParts[0]);
      if (rangeParts[1]) {
        end = parseVal(rangeParts[1]);
      } else {
        end = stepParts[1] ? max : start;
      }
    }

    // Adjust for Day of week Sunday=7 mapping to 0
    if (min === 0 && max === 6) {
      if (start === 7) start = 0;
      if (end === 7) end = 0;
    }

    if (start < min || start > max || end < min || end > max) {
      throw new Error(`Value out of range (${min}-${max}): ${rangeStr}`);
    }

    if (start <= end) {
      for (let i = start; i <= end; i += step) {
        result.add(i);
      }
    } else {
      // Handle wrapping ranges (e.g. FRI-SUN / 5-0)
      for (let i = start; i <= max; i += step) {
        result.add(i);
      }
      for (let i = min; i <= end; i += step) {
        result.add(i);
      }
    }
  }

  return result;
}

interface ParsedCron {
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
  isDomRestricted: boolean;
  isDowRestricted: boolean;
  isValid: boolean;
  error?: string;
}

function parseCron(cron: string): ParsedCron {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      minutes: new Set(),
      hours: new Set(),
      daysOfMonth: new Set(),
      months: new Set(),
      daysOfWeek: new Set(),
      isDomRestricted: false,
      isDowRestricted: false,
      isValid: false,
      error: 'Cron expression must have exactly 5 fields (minute hour dom month dow)'
    };
  }

  try {
    const minutes = parseCronField(parts[0], 0, 59);
    const hours = parseCronField(parts[1], 0, 23);
    const daysOfMonth = parseCronField(parts[2], 1, 31);
    const months = parseCronField(parts[3], 1, 12, MONTH_MAP);
    const daysOfWeek = parseCronField(parts[4], 0, 6, WEEKDAY_MAP);

    return {
      minutes,
      hours,
      daysOfMonth,
      months,
      daysOfWeek,
      isDomRestricted: parts[2] !== '*',
      isDowRestricted: parts[4] !== '*',
      isValid: true
    };
  } catch (err: unknown) {
    return {
      minutes: new Set(),
      hours: new Set(),
      daysOfMonth: new Set(),
      months: new Set(),
      daysOfWeek: new Set(),
      isDomRestricted: false,
      isDowRestricted: false,
      isValid: false,
      error: err instanceof Error ? err.message : 'Syntax error'
    };
  }
}

// Generate human-friendly explanation
function explainField(field: string, nameSingular: string, namePlural: string, itemsList: string[], aliases: Record<string, number> = {}): string {
  if (field === '*') return `every ${nameSingular}`;
  
  const stepParts = field.split('/');
  const rangeStr = stepParts[0];
  const step = stepParts[1] ? parseInt(stepParts[1], 10) : 1;

  if (rangeStr === '*') {
    return `every ${step === 1 ? '' : `${step} `}${namePlural}`;
  }

  const rangeParts = rangeStr.split('-');
  const parseVal = (val: string) => {
    const normalized = val.toLowerCase().trim();
    if (aliases[normalized] !== undefined) return aliases[normalized];
    return parseInt(val, 10);
  };

  const startVal = parseVal(rangeParts[0]);
  const endVal = rangeParts[1] ? parseVal(rangeParts[1]) : startVal;

  const formatItem = (val: number) => {
    if (itemsList[val] !== undefined) return itemsList[val];
    return val.toString();
  };

  if (rangeParts.length === 1 && !stepParts[1]) {
    // Single values or list comma separated
    const listVals = field.split(',').map(v => parseVal(v));
    if (listVals.length === 1) {
      return `at ${formatItem(listVals[0])}`;
    }
    const formattedList = listVals.map(v => formatItem(v));
    const last = formattedList.pop();
    return `at ${formattedList.join(', ')} and ${last}`;
  }

  const stepDesc = step > 1 ? `, every ${step} ${namePlural}` : '';
  return `from ${formatItem(startVal)} through ${formatItem(endVal)}${stepDesc}`;
}

function explainCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron length.';

  // Beautify minutes/hours descriptions
  let timeStr: string;
  if (parts[0] === '*' && parts[1] === '*') {
    timeStr = 'Every minute';
  } else if (parts[0] !== '*' && parts[1] === '*') {
    timeStr = `At minute ${explainField(parts[0], 'minute', 'minutes', []).replace('at ', '')} of every hour`;
  } else if (parts[0] === '*' && parts[1] !== '*') {
    timeStr = `Every minute of hour ${explainField(parts[1], 'hour', 'hours', []).replace('at ', '')}`;
  } else {
    // Both are specific
    const mins = parts[0].split(',').map(m => parseInt(m, 10));
    const hrs = parts[1].split(',').map(h => parseInt(h, 10));
    
    if (mins.length === 1 && hrs.length === 1 && !isNaN(mins[0]) && !isNaN(hrs[0])) {
      const pad = (n: number) => String(n).padStart(2, '0');
      timeStr = `At ${pad(hrs[0])}:${pad(mins[0])}`;
    } else {
      timeStr = `At minutes ${explainField(parts[0], 'minute', 'minutes', []).replace('at ', '')} of hours ${explainField(parts[1], 'hour', 'hours', []).replace('at ', '')}`;
    }
  }

  // Combine dates
  let dateStr: string;
  if (parts[2] === '*' && parts[4] === '*') {
    dateStr = 'every day';
  } else if (parts[2] !== '*' && parts[4] === '*') {
    dateStr = `on ${explainField(parts[2], 'day', 'days', []).replace('at ', 'day ')}`;
  } else if (parts[2] === '*' && parts[4] !== '*') {
    dateStr = `on ${explainField(parts[4], 'day', 'days', WEEKDAY_NAMES, WEEKDAY_MAP).replace('at ', '')}`;
  } else {
    dateStr = `on ${explainField(parts[2], 'day', 'days', []).replace('at ', 'day ')} or ${explainField(parts[4], 'day', 'days', WEEKDAY_NAMES, WEEKDAY_MAP).replace('at ', '')}`;
  }

  // Add month
  let monthStr = '';
  if (parts[3] !== '*') {
    monthStr = ` in ${explainField(parts[3], 'month', 'months', ['', ...MONTH_NAMES], MONTH_MAP).replace('at ', '')}`;
  }

  return `${timeStr}, ${dateStr}${monthStr}.`;
}

// Calculate next occurrences
function getNextRuns(parsed: ParsedCron, limit = 5): Date[] {
  const result: Date[] = [];
  if (!parsed.isValid) return result;

  const current = new Date();
  current.setSeconds(0, 0);
  current.setMinutes(current.getMinutes() + 1); // Start at next minute

  const maxSearch = new Date();
  maxSearch.setFullYear(maxSearch.getFullYear() + 5); // Safety limit 5 years

  while (result.length < limit && current < maxSearch) {
    const month = current.getMonth() + 1; // 1-12
    if (!parsed.months.has(month)) {
      current.setDate(1);
      current.setHours(0, 0, 0);
      current.setMonth(current.getMonth() + 1);
      continue;
    }

    const dom = current.getDate();
    const dow = current.getDay();
    
    let dayMatches = false;
    if (parsed.isDomRestricted && parsed.isDowRestricted) {
      dayMatches = parsed.daysOfMonth.has(dom) || parsed.daysOfWeek.has(dow);
    } else {
      dayMatches = parsed.daysOfMonth.has(dom) && parsed.daysOfWeek.has(dow);
    }

    if (!dayMatches) {
      current.setHours(0, 0, 0);
      current.setDate(current.getDate() + 1);
      continue;
    }

    const hour = current.getHours();
    if (!parsed.hours.has(hour)) {
      current.setMinutes(0, 0);
      current.setHours(current.getHours() + 1);
      continue;
    }

    const minute = current.getMinutes();
    if (!parsed.minutes.has(minute)) {
      current.setMinutes(current.getMinutes() + 1);
      continue;
    }

    result.push(new Date(current));
    current.setMinutes(current.getMinutes() + 1);
  }

  return result;
}

export function CronBuilder() {
  const [cronInput, setCronInput] = useState('* * * * *');
  const parsed = parseCron(cronInput);
  const explanation = parsed.isValid ? explainCron(cronInput) : '';
  const nextRuns = parsed.isValid ? getNextRuns(parsed) : [];

  const [builderMode, setBuilderMode] = useState<'preset' | 'advanced'>('preset');
  const [presetFrequency, setPresetFrequency] = useState<'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly'>('minute');
  const [presetMinute, setPresetMinute] = useState(0);
  const [presetHour, setPresetHour] = useState(12);
  const [presetDays, setPresetDays] = useState<number[]>([]); // For weekly
  const [presetDom, setPresetDom] = useState(1); // For monthly

  const [activeTab, setActiveTab] = useState<'minutes' | 'hours' | 'days' | 'months' | 'weekdays'>('minutes');
  const [copied, setCopied] = useState(false);

  // Field selector states (used to generate parts)
  const [minMode, setMinMode] = useState<'every' | 'specific'>('every');
  const [minInterval, setMinInterval] = useState(1);
  const [selectedMins, setSelectedMins] = useState<number[]>([]);

  const [hourMode, setHourMode] = useState<'every' | 'specific'>('every');
  const [selectedHours, setSelectedHours] = useState<number[]>([]);

  const [domMode, setDomMode] = useState<'every' | 'specific'>('every');
  const [selectedDoms, setSelectedDoms] = useState<number[]>([]);

  const [monthMode, setMonthMode] = useState<'every' | 'specific'>('every');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const [dowMode, setDowMode] = useState<'every' | 'specific'>('every');
  const [selectedDows, setSelectedDows] = useState<number[]>([]);

  // Synchronize preset states to formatted string
  useEffect(() => {
    if (builderMode !== 'preset') return;

    if (presetFrequency === 'minute') {
      setCronInput('* * * * *');
    } else if (presetFrequency === 'hourly') {
      setCronInput(`${presetMinute} * * * *`);
    } else if (presetFrequency === 'daily') {
      setCronInput(`${presetMinute} ${presetHour} * * *`);
    } else if (presetFrequency === 'weekly') {
      const days = presetDays.length > 0 ? [...presetDays].sort((a, b) => a - b).join(',') : '*';
      setCronInput(`${presetMinute} ${presetHour} * * ${days}`);
    } else if (presetFrequency === 'monthly') {
      setCronInput(`${presetMinute} ${presetHour} ${presetDom} * *`);
    }
  }, [builderMode, presetFrequency, presetMinute, presetHour, presetDays, presetDom]);

  // Synchronize generator states to formatted string
  const applyGenerator = () => {
    let minPart = '*';
    if (minMode === 'every' && minInterval > 1) {
      minPart = `*/${minInterval}`;
    } else if (minMode === 'specific' && selectedMins.length > 0) {
      minPart = [...selectedMins].sort((a, b) => a - b).join(',');
    }

    let hourPart = '*';
    if (hourMode === 'specific' && selectedHours.length > 0) {
      hourPart = [...selectedHours].sort((a, b) => a - b).join(',');
    }

    let domPart = '*';
    if (domMode === 'specific' && selectedDoms.length > 0) {
      domPart = [...selectedDoms].sort((a, b) => a - b).join(',');
    }

    let monthPart = '*';
    if (monthMode === 'specific' && selectedMonths.length > 0) {
      monthPart = [...selectedMonths].sort((a, b) => a - b).join(',');
    }

    let dowPart = '*';
    if (dowMode === 'specific' && selectedDows.length > 0) {
      dowPart = [...selectedDows].sort((a, b) => a - b).join(',');
    }

    setCronInput(`${minPart} ${hourPart} ${domPart} ${monthPart} ${dowPart}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cronInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSelection = (list: number[], setter: (val: number[]) => void, item: number) => {
    if (list.includes(item)) {
      setter(list.filter(x => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Cron Expression Display & Input */}
      <div className="border border-border bg-muted/20 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block font-mono">
              Cron Expression (5-Field Syntax)
            </span>
            <div className="relative">
              <Input
                value={cronInput}
                onChange={(e) => setCronInput(e.target.value)}
                placeholder="* * * * *"
                className="font-mono text-base tracking-widest border-border bg-background text-foreground h-11 focus-visible:ring-ring focus-visible:border-border pr-20"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[84px] border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground h-8 text-xs font-mono flex items-center justify-center"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Validation / Explainer Output */}
        {parsed.isValid ? (
          <div className="flex items-start bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Play className="h-4 w-4 mr-2.5 mt-0.5 shrink-0" />
            <div className="text-xs font-medium">
              <span className="font-mono font-bold text-[10px] uppercase tracking-wider block text-emerald-500/80 mb-0.5">
                Human Explanation
              </span>
              <p className="text-[13px] leading-relaxed select-text">{explanation}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start bg-destructive/5 border border-destructive/20 p-3.5 rounded-lg text-destructive">
            <AlertCircle className="h-4 w-4 mr-2.5 mt-0.5 shrink-0" />
            <div className="text-xs font-medium">
              <span className="font-mono font-bold text-[10px] uppercase tracking-wider block text-destructive/80 mb-0.5">
                Parsing Error
              </span>
              <p className="text-[13px] leading-relaxed font-mono">{parsed.error}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Interactive Generator Panels */}
      <div className="border border-border bg-muted/10 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-1.5">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Interactive Scheduler</h3>
          </div>
          <div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5">
            <button
              onClick={() => setBuilderMode('preset')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                builderMode === 'preset'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Quick Presets
            </button>
            <button
              onClick={() => setBuilderMode('advanced')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                builderMode === 'advanced'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Advanced (5-Field)
            </button>
          </div>
        </div>

        {builderMode === 'preset' ? (
          <div className="space-y-6 min-h-[160px] flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'minute', label: 'Every Minute' },
                { id: 'hourly', label: 'Hourly' },
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ] as const).map((freq) => (
                <button
                  key={freq.id}
                  onClick={() => setPresetFrequency(freq.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    presetFrequency === freq.id
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {freq.label}
                </button>
              ))}
            </div>

            <div className="bg-background border border-border p-5 rounded-lg flex-1 flex flex-col justify-center shadow-sm">
              {presetFrequency === 'minute' && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Play className="h-4 w-4" />
                  <span className="text-sm">Runs continuously every minute of every day.</span>
                </div>
              )}
              {presetFrequency === 'hourly' && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted-foreground font-medium">Runs every hour at minute</span>
                  <select 
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={presetMinute}
                    onChange={(e) => setPresetMinute(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 60 }).map((_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              )}
              {presetFrequency === 'daily' && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted-foreground font-medium">Runs every day at</span>
                  <div className="flex items-center gap-2">
                    <select 
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={presetHour}
                      onChange={(e) => setPresetHour(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="font-bold text-muted-foreground">:</span>
                    <select 
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={presetMinute}
                      onChange={(e) => setPresetMinute(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 60 }).map((_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {presetFrequency === 'weekly' && (
                <div className="space-y-5 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground font-medium w-20 text-right">Runs on</span>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_NAMES.map((day, i) => (
                        <button
                          key={i}
                          onClick={() => toggleSelection(presetDays, setPresetDays, i)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors shadow-sm ${
                            presetDays.includes(i)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground font-medium w-20 text-right">At time</span>
                    <div className="flex items-center gap-2">
                      <select 
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={presetHour}
                        onChange={(e) => setPresetHour(parseInt(e.target.value))}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                        ))}
                      </select>
                      <span className="font-bold text-muted-foreground">:</span>
                      <select 
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={presetMinute}
                        onChange={(e) => setPresetMinute(parseInt(e.target.value))}
                      >
                        {Array.from({ length: 60 }).map((_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {presetFrequency === 'monthly' && (
                <div className="space-y-5 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground font-medium w-28 text-right">Runs on the</span>
                    <div className="flex items-center gap-2">
                      <select 
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={presetDom}
                        onChange={(e) => setPresetDom(parseInt(e.target.value))}
                      >
                        {Array.from({ length: 31 }).map((_, i) => {
                          const val = i + 1;
                          let suffix = 'th';
                          if (val % 10 === 1 && val !== 11) suffix = 'st';
                          else if (val % 10 === 2 && val !== 12) suffix = 'nd';
                          else if (val % 10 === 3 && val !== 13) suffix = 'rd';
                          return <option key={val} value={val}>{val}{suffix}</option>;
                        })}
                      </select>
                      <span className="text-muted-foreground font-medium">of the month</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground font-medium w-28 text-right">At time</span>
                    <div className="flex items-center gap-2">
                      <select 
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={presetHour}
                        onChange={(e) => setPresetHour(parseInt(e.target.value))}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                        ))}
                      </select>
                      <span className="font-bold text-muted-foreground">:</span>
                      <select 
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={presetMinute}
                        onChange={(e) => setPresetMinute(parseInt(e.target.value))}
                      >
                        {Array.from({ length: 60 }).map((_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selector Tabs */}
            <div className="flex flex-wrap gap-1 bg-muted/50 border border-border p-1 rounded">
              {([
            { id: 'minutes', label: 'Minutes' },
            { id: 'hours', label: 'Hours' },
            { id: 'days', label: 'Day of Month' },
            { id: 'months', label: 'Months' },
            { id: 'weekdays', label: 'Day of Week' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] py-1 text-center text-xs font-semibold rounded select-none ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="bg-background border border-border p-4 rounded-lg min-h-[160px] flex flex-col justify-between">
          <div className="space-y-4 flex-1">
            {/* MINUTES TAB */}
            {activeTab === 'minutes' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-6 text-xs">
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={minMode === 'every'}
                      onChange={() => setMinMode('every')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Every interval</span>
                  </label>
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={minMode === 'specific'}
                      onChange={() => setMinMode('specific')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Specific minutes</span>
                  </label>
                </div>

                {minMode === 'every' ? (
                  <div className="space-y-2 max-w-sm">
                    <label className="text-[11px] font-mono text-muted-foreground">
                      Interval (Minutes): {minInterval}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="59"
                      value={minInterval}
                      onChange={(e) => setMinInterval(parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                    {Array.from({ length: 60 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => toggleSelection(selectedMins, setSelectedMins, i)}
                        className={`py-1 text-[11px] font-mono font-semibold border rounded transition-colors ${
                          selectedMins.includes(i)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                        }`}
                      >
                        {String(i).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HOURS TAB */}
            {activeTab === 'hours' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-6 text-xs">
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={hourMode === 'every'}
                      onChange={() => setHourMode('every')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Every hour</span>
                  </label>
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={hourMode === 'specific'}
                      onChange={() => setHourMode('specific')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Specific hours</span>
                  </label>
                </div>

                {hourMode === 'every' ? (
                  <p className="text-xs text-muted-foreground italic">Runs on every single hour.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => toggleSelection(selectedHours, setSelectedHours, i)}
                        className={`py-1 text-[11px] font-mono font-semibold border rounded transition-colors ${
                          selectedHours.includes(i)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                        }`}
                      >
                        {String(i).padStart(2, '0')}:00
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DAY OF MONTH TAB */}
            {activeTab === 'days' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-6 text-xs">
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={domMode === 'every'}
                      onChange={() => setDomMode('every')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Every day of month</span>
                  </label>
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={domMode === 'specific'}
                      onChange={() => setDomMode('specific')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Specific days</span>
                  </label>
                </div>

                {domMode === 'every' ? (
                  <p className="text-xs text-muted-foreground italic">Runs on every day of the month.</p>
                ) : (
                  <div className="grid grid-cols-7 sm:grid-cols-11 gap-1.5">
                    {Array.from({ length: 31 }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => toggleSelection(selectedDoms, setSelectedDoms, i + 1)}
                        className={`py-1 text-[11px] font-mono font-semibold border rounded transition-colors ${
                          selectedDoms.includes(i + 1)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MONTHS TAB */}
            {activeTab === 'months' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-6 text-xs">
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={monthMode === 'every'}
                      onChange={() => setMonthMode('every')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Every month</span>
                  </label>
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={monthMode === 'specific'}
                      onChange={() => setMonthMode('specific')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Specific months</span>
                  </label>
                </div>

                {monthMode === 'every' ? (
                  <p className="text-xs text-muted-foreground italic">Runs on every month.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {MONTH_NAMES.map((name, i) => (
                      <button
                        key={i + 1}
                        onClick={() => toggleSelection(selectedMonths, setSelectedMonths, i + 1)}
                        className={`py-1 text-[11px] font-semibold border rounded transition-colors ${
                          selectedMonths.includes(i + 1)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DAY OF WEEK TAB */}
            {activeTab === 'weekdays' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-6 text-xs">
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={dowMode === 'every'}
                      onChange={() => setDowMode('every')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Every day of week</span>
                  </label>
                  <label className="flex items-center space-x-2 font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={dowMode === 'specific'}
                      onChange={() => setDowMode('specific')}
                      className="rounded border-border focus:ring-0 text-primary cursor-pointer"
                    />
                    <span>Specific weekdays</span>
                  </label>
                </div>

                {dowMode === 'every' ? (
                  <p className="text-xs text-muted-foreground italic">Runs on every day of the week.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {WEEKDAY_NAMES.map((name, i) => (
                      <button
                        key={i}
                        onClick={() => toggleSelection(selectedDows, setSelectedDows, i)}
                        className={`py-1 text-[11px] font-semibold border rounded transition-colors ${
                          selectedDows.includes(i)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sync Button */}
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              onClick={applyGenerator}
              size="sm"
              className="text-xs font-semibold h-8"
            >
              Apply to Cron Expression
            </Button>
          </div>
          </div>
          </div>
        )}
      </div>

      {/* 3. Run Forecast Schedule */}
      <div className="border border-border bg-muted/10 rounded-lg p-4 space-y-4">
        <div className="flex items-center space-x-1.5 border-b border-border pb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Forecast: Next 5 Execution times</h3>
        </div>

        {nextRuns.length > 0 ? (
          <div className="overflow-hidden border border-border rounded-lg bg-background">
            <div className="grid grid-cols-[auto_1fr] text-xs font-mono border-b border-border bg-muted/30 py-2.5 px-4 font-semibold text-muted-foreground">
              <span className="w-16">Index</span>
              <span>Execution Time</span>
            </div>
            <div className="divide-y divide-border">
              {nextRuns.map((run, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr] text-xs font-mono py-2.5 px-4 text-foreground hover:bg-muted/30 transition-colors"
                >
                  <span className="w-16 font-semibold text-muted-foreground">#{i + 1}</span>
                  <span>
                    {run.toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}{' '}
                    at{' '}
                    <span className="font-bold text-sky-500">
                      {run.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-muted-foreground text-xs italic">
              {parsed.isValid
                ? 'No matches found within the forecast scanning range.'
                : 'Enter a valid cron expression above to view execution forecasts.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
