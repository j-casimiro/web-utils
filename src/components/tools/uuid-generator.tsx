import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Fingerprint,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type UuidVersion = 'v4' | 'v7';

interface UuidItem {
  id: string;
  uuid: string;
}

const MAX_UUID_COUNT = 100;

const VERSION_LABELS: Record<string, string> = {
  '1': 'Version 1, timestamp and node',
  '2': 'Version 2, DCE security',
  '3': 'Version 3, name-based MD5',
  '4': 'Version 4, random',
  '5': 'Version 5, name-based SHA-1',
  '6': 'Version 6, reordered timestamp',
  '7': 'Version 7, Unix time ordered',
  '8': 'Version 8, custom',
};

function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

function canonicalizeUuid(hex: string) {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function generateUuidV4() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return canonicalizeUuid(bytesToHex(bytes));
}

function generateUuidV7() {
  const timestampHex = Date.now().toString(16).padStart(12, '0').slice(-12);
  const random = randomBytes(10);
  const randA = (((random[0] << 8) | random[1]) & 0x0fff)
    .toString(16)
    .padStart(3, '0');

  random[2] = (random[2] & 0x3f) | 0x80;
  const randB = bytesToHex(random.slice(2));

  return [
    timestampHex.slice(0, 8),
    timestampHex.slice(8),
    `7${randA}`,
    randB.slice(0, 4),
    randB.slice(4),
  ].join('-');
}

function generateUuid(version: UuidVersion) {
  return version === 'v4' ? generateUuidV4() : generateUuidV7();
}

function createUuidItems(version: UuidVersion, count: number): UuidItem[] {
  return Array.from({ length: count }, () => ({
    id: Math.random().toString(36).slice(2, 10),
    uuid: generateUuid(version),
  }));
}

function formatUuid(uuid: string, uppercase: boolean, includeHyphens: boolean) {
  const formatted = includeHyphens ? uuid : uuid.replace(/-/g, '');
  return uppercase ? formatted.toUpperCase() : formatted;
}

function clampCount(value: number) {
  if (Number.isNaN(value)) return 1;
  return Math.min(MAX_UUID_COUNT, Math.max(1, Math.round(value)));
}

function parseUuid(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(/-/g, '').toLowerCase();
  const canonical =
    compact.length === 32 && /^[0-9a-f]{32}$/.test(compact)
      ? canonicalizeUuid(compact)
      : '';

  if (!canonical) {
    return {
      isValid: false,
      title: 'Invalid UUID',
      description: 'UUIDs need 32 hexadecimal characters, with optional hyphens.',
      canonical: '',
    };
  }

  if (/^0{32}$/.test(compact)) {
    return {
      isValid: true,
      title: 'Valid Nil UUID',
      description: 'All bits are zero.',
      canonical,
    };
  }

  if (/^f{32}$/.test(compact)) {
    return {
      isValid: true,
      title: 'Valid Max UUID',
      description: 'All bits are set.',
      canonical,
    };
  }

  const version = compact[12];
  const variant = compact[16];
  const hasKnownVersion = /^[1-8]$/.test(version);
  const hasRfcVariant = /^[89ab]$/.test(variant);

  if (!hasKnownVersion || !hasRfcVariant) {
    return {
      isValid: false,
      title: 'Malformed UUID',
      description: 'The version or RFC 4122/9562 variant bits are not valid.',
      canonical,
    };
  }

  return {
    isValid: true,
    title: 'Valid UUID',
    description: VERSION_LABELS[version],
    canonical,
  };
}

export function UUIDGenerator() {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [includeHyphens, setIncludeHyphens] = useState(true);
  const [items, setItems] = useState(() => createUuidItems('v4', 5));
  const [validatorValue, setValidatorValue] = useState('');
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  const displayedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        display: formatUuid(item.uuid, uppercase, includeHyphens),
      })),
    [items, uppercase, includeHyphens],
  );

  const validation = useMemo(
    () => parseUuid(validatorValue),
    [validatorValue],
  );

  const bulkOutput = displayedItems.map((item) => item.display).join('\n');

  const regenerate = (nextVersion = version, nextCount = count) => {
    setItems(createUuidItems(nextVersion, nextCount));
    setCopiedTarget(null);
  };

  const handleVersionChange = (value: string) => {
    const nextVersion = value as UuidVersion;
    setVersion(nextVersion);
    regenerate(nextVersion);
  };

  const handleCountChange = (value: number) => {
    const nextCount = clampCount(value);
    setCount(nextCount);
  };

  const handleCopy = async (value: string, target: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClearValidator = () => {
    setValidatorValue('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Fingerprint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={displayedItems[0]?.display ?? ''}
            readOnly
            className="h-12 border-zinc-800 bg-zinc-900 pl-10 pr-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Generated UUID..."
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => regenerate()}
            className="h-12 bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCopy(displayedItems[0]?.display ?? '', 'first')}
            disabled={!displayedItems.length}
            className="h-12 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {copiedTarget === 'first' ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copiedTarget === 'first' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/30 p-4">
          <Label className="text-zinc-300">UUID Version</Label>
          <Select value={version} onValueChange={handleVersionChange}>
            <SelectTrigger className="h-9 w-full border-zinc-800 bg-zinc-900 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="v4">v4 Random</SelectItem>
              <SelectItem value="v7">v7 Time-Ordered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="uuid-count" className="text-zinc-300">
              Quantity
            </Label>
            <Input
              id="uuid-count"
              type="number"
              min={1}
              max={MAX_UUID_COUNT}
              value={count}
              onChange={(event) => handleCountChange(Number(event.target.value))}
              className="h-8 w-20 border-zinc-800 bg-zinc-900 text-right font-mono text-zinc-100"
            />
          </div>
          <Slider
            value={[count]}
            min={1}
            max={MAX_UUID_COUNT}
            step={1}
            onValueChange={(value) => handleCountChange(value[0])}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="space-y-2">
            <Label htmlFor="uuid-hyphens" className="text-zinc-300">
              Hyphens
            </Label>
            <div className="flex h-9 items-center">
              <Switch
                id="uuid-hyphens"
                checked={includeHyphens}
                onCheckedChange={(checked) => {
                  setIncludeHyphens(checked);
                  setCopiedTarget(null);
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uuid-uppercase" className="text-zinc-300">
              Uppercase
            </Label>
            <div className="flex h-9 items-center">
              <Switch
                id="uuid-uppercase"
                checked={uppercase}
                onCheckedChange={(checked) => {
                  setUppercase(checked);
                  setCopiedTarget(null);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-zinc-300">Generated UUIDs</Label>
              <p className="text-xs text-zinc-500">
                {displayedItems.length} value
                {displayedItems.length === 1 ? '' : 's'} ready to copy.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => handleCopy(bulkOutput, 'all')}
              disabled={!bulkOutput}
              className="h-9 border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              {copiedTarget === 'all' ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copiedTarget === 'all' ? 'Copied' : 'Copy All'}
            </Button>
          </div>

          <div className="custom-scrollbar max-h-80 overflow-auto rounded-md border border-zinc-800 bg-zinc-950">
            {displayedItems.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.25rem] items-center gap-2 border-b border-zinc-800 px-3 py-2 last:border-b-0"
              >
                <span className="font-mono text-xs text-zinc-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <code className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm text-zinc-100">
                  {item.display}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(item.display, item.id)}
                  className="h-8 w-8 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                  title="Copy UUID"
                >
                  {copiedTarget === item.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">Copy UUID</span>
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="uuid-validator" className="text-zinc-300">
              UUID Validator
            </Label>
            <p className="text-xs text-zinc-500">
              Paste any UUID to inspect format, version, and variant.
            </p>
          </div>
          <textarea
            id="uuid-validator"
            value={validatorValue}
            onChange={(event) => setValidatorValue(event.target.value)}
            placeholder="Paste UUID here..."
            className="flex min-h-28 w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
          />

          <div
            className={`rounded-md border p-4 ${
              validation?.isValid
                ? 'border-cyan-800 bg-cyan-950/20'
                : validation
                  ? 'border-red-800/50 bg-red-950/20'
                  : 'border-zinc-800 bg-zinc-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                className={`mt-0.5 h-4 w-4 ${
                  validation?.isValid
                    ? 'text-cyan-400'
                    : validation
                      ? 'text-red-400'
                      : 'text-zinc-500'
                }`}
              />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-zinc-100">
                  {validation?.title ?? 'Waiting for input'}
                </p>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {validation?.description ??
                    'Validation runs locally as soon as text is entered.'}
                </p>
                {validation?.canonical && (
                  <code className="block overflow-hidden text-ellipsis whitespace-nowrap pt-2 font-mono text-xs text-zinc-300">
                    {validation.canonical}
                  </code>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleClearValidator}
            disabled={!validatorValue}
            className="h-9 w-full border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Validator
          </Button>
        </div>
      </div>
    </div>
  );
}
