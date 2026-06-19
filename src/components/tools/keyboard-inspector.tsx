import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Trash2, Keyboard, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface KeyItem {
  code: string;
  label: string;
  width: number | string; // px or 'flex-grow'
  height?: number; // px
  labelClass?: string;
}

interface ParsedEvent {
  key: string;
  code: string;
  which: number;
  keyCode: number;
  location: number;
  repeat: boolean;
  isComposing: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  timestamp: number;
}

// Exactly 658px total width per row to align perfectly
const ROW_1: KeyItem[] = [
  { code: 'Escape', label: 'esc', width: 65, height: 24, labelClass: 'text-[9px]' },
  { code: 'F1', label: 'F1', width: 44, height: 24 },
  { code: 'F2', label: 'F2', width: 44, height: 24 },
  { code: 'F3', label: 'F3', width: 44, height: 24 },
  { code: 'F4', label: 'F4', width: 44, height: 24 },
  { code: 'F5', label: 'F5', width: 44, height: 24 },
  { code: 'F6', label: 'F6', width: 44, height: 24 },
  { code: 'F7', label: 'F7', width: 44, height: 24 },
  { code: 'F8', label: 'F8', width: 44, height: 24 },
  { code: 'F9', label: 'F9', width: 44, height: 24 },
  { code: 'F10', label: 'F10', width: 44, height: 24 },
  { code: 'F11', label: 'F11', width: 44, height: 24 },
  { code: 'F12', label: 'F12', width: 44, height: 24 },
  { code: 'F13', label: '🔒', width: 65, height: 24, labelClass: 'text-[9px]' },
];

const ROW_2: KeyItem[] = [
  { code: 'Backquote', label: '~\n`', width: 44 },
  { code: 'Digit1', label: '!\n1', width: 44 },
  { code: 'Digit2', label: '@\n2', width: 44 },
  { code: 'Digit3', label: '#\n3', width: 44 },
  { code: 'Digit4', label: '$\n4', width: 44 },
  { code: 'Digit5', label: '%\n5', width: 44 },
  { code: 'Digit6', label: '^\n6', width: 44 },
  { code: 'Digit7', label: '&\n7', width: 44 },
  { code: 'Digit8', label: '*\n8', width: 44 },
  { code: 'Digit9', label: '(\n9', width: 44 },
  { code: 'Digit0', label: ')\n0', width: 44 },
  { code: 'Minus', label: '_\n-', width: 44 },
  { code: 'Equal', label: '+\n=', width: 44 },
  { code: 'Backspace', label: 'delete', width: 86, labelClass: 'text-[9px] items-end justify-end p-1.5' },
];

const ROW_3: KeyItem[] = [
  { code: 'Tab', label: 'tab', width: 66, labelClass: 'text-[9px] items-end justify-start p-1.5' },
  { code: 'KeyQ', label: 'Q', width: 44 },
  { code: 'KeyW', label: 'W', width: 44 },
  { code: 'KeyE', label: 'E', width: 44 },
  { code: 'KeyR', label: 'R', width: 44 },
  { code: 'KeyT', label: 'T', width: 44 },
  { code: 'KeyY', label: 'Y', width: 44 },
  { code: 'KeyU', label: 'U', width: 44 },
  { code: 'KeyI', label: 'I', width: 44 },
  { code: 'KeyO', label: 'O', width: 44 },
  { code: 'KeyP', label: 'P', width: 44 },
  { code: 'BracketLeft', label: '{\n[', width: 44 },
  { code: 'BracketRight', label: '}\n]', width: 44 },
  { code: 'Backslash', label: '|\n\\', width: 64 },
];

const ROW_4: KeyItem[] = [
  { code: 'CapsLock', label: 'caps lock', width: 80, labelClass: 'text-[9px] items-end justify-start p-1.5' },
  { code: 'KeyA', label: 'A', width: 44 },
  { code: 'KeyS', label: 'S', width: 44 },
  { code: 'KeyD', label: 'D', width: 44 },
  { code: 'KeyF', label: 'F', width: 44 },
  { code: 'KeyG', label: 'G', width: 44 },
  { code: 'KeyH', label: 'H', width: 44 },
  { code: 'KeyJ', label: 'J', width: 44 },
  { code: 'KeyK', label: 'K', width: 44 },
  { code: 'KeyL', label: 'L', width: 44 },
  { code: 'Semicolon', label: ':\n;', width: 44 },
  { code: 'Quote', label: '"\n\'', width: 44 },
  { code: 'Enter', label: 'return', width: 94, labelClass: 'text-[9px] items-end justify-end p-1.5' },
];

const ROW_5: KeyItem[] = [
  { code: 'ShiftLeft', label: 'shift', width: 104, labelClass: 'text-[9px] items-end justify-start p-1.5' },
  { code: 'KeyZ', label: 'Z', width: 44 },
  { code: 'KeyX', label: 'X', width: 44 },
  { code: 'KeyC', label: 'C', width: 44 },
  { code: 'KeyV', label: 'V', width: 44 },
  { code: 'KeyB', label: 'B', width: 44 },
  { code: 'KeyN', label: 'N', width: 44 },
  { code: 'KeyM', label: 'M', width: 44 },
  { code: 'Comma', label: '<\n,', width: 44 },
  { code: 'Period', label: '>\n.', width: 44 },
  { code: 'Slash', label: '?\n/', width: 44 },
  { code: 'ShiftRight', label: 'shift', width: 114, labelClass: 'text-[9px] items-end justify-end p-1.5' },
];

export function KeyboardInspector() {
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({});
  const [lastEvent, setLastEvent] = useState<ParsedEvent | null>(null);
  const [history, setHistory] = useState<ParsedEvent[]>([]);
  const [preventDefault, setPreventDefault] = useState(true);
  const [isListening, setIsListening] = useState(true);
  const [jsonCopied, setJsonCopied] = useState(false);
  const lastEventRef = useRef<ParsedEvent | null>(null);

  useEffect(() => {
    if (!isListening) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow general system developer shortcuts to bypass capture
      const isSystemShortcut =
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        ['F12', 'F11', 'F5'].includes(e.key);

      if (preventDefault && !isSystemShortcut) {
        // Prevent browser actions that disrupt inspection
        if (
          [
            'Tab',
            'Space',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Backspace',
            'Slash',
          ].includes(e.key) ||
          e.code === 'Space'
        ) {
          e.preventDefault();
        }
      }

      setPressedKeys((prev) => {
        if (prev[e.code]) return prev;
        return { ...prev, [e.code]: true };
      });

      const isIdentical =
        lastEventRef.current &&
        lastEventRef.current.code === e.code &&
        lastEventRef.current.repeat === e.repeat &&
        lastEventRef.current.shiftKey === e.shiftKey &&
        lastEventRef.current.altKey === e.altKey &&
        lastEventRef.current.ctrlKey === e.ctrlKey &&
        lastEventRef.current.metaKey === e.metaKey;

      if (!isIdentical) {
        const parsed: ParsedEvent = {
          key: e.key,
          code: e.code,
          which: e.which,
          keyCode: e.keyCode,
          location: e.location,
          repeat: e.repeat,
          isComposing: e.isComposing,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          timestamp: Date.now(),
        };

        lastEventRef.current = parsed;
        setLastEvent(parsed);

        if (!e.repeat) {
          setHistory((prev) => [parsed, ...prev].slice(0, 15));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        if (!prev[e.code]) return prev;
        const next = { ...prev };
        next[e.code] = false;
        return next;
      });
      lastEventRef.current = null;
    };

    const handleBlur = () => {
      // Clear pressed keys when focus is lost to prevent stuck active styles
      setPressedKeys({});
      lastEventRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // Focus the page so input is received immediately
    window.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [preventDefault, isListening]);

  const copyJson = () => {
    if (!lastEvent) return;
    navigator.clipboard.writeText(JSON.stringify(lastEvent, null, 2));
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const getLocationString = (loc: number) => {
    switch (loc) {
      case 0:
        return '0 (Standard)';
      case 1:
        return '1 (Left)';
      case 2:
        return '2 (Right)';
      case 3:
        return '3 (Numpad)';
      default:
        return `${loc} (Unknown)`;
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toTimeString().split(' ')[0]}.${String(ts % 1000).padStart(3, '0')}`;
  };

  const renderKey = (key: KeyItem) => {
    const isActive = pressedKeys[key.code];
    let widthStyle: string | undefined;
    let heightStyle: string | undefined;

    if (typeof key.width === 'number') {
      const ratio = key.width / 44;
      widthStyle = `calc(${ratio} * var(--key-unit, 44px))`;
    }

    if (key.height) {
      const ratio = key.height / 44;
      heightStyle = `calc(${ratio} * var(--key-unit, 44px))`;
    } else {
      heightStyle = `var(--key-unit, 44px)`;
    }

    const isFlexGrow = key.width === 'flex-grow';

    return (
      <div
        key={key.code}
        style={{
          width: widthStyle,
          height: heightStyle,
          flexGrow: isFlexGrow ? 1 : 0,
        }}
        className={`shrink-0 flex items-center justify-center border text-[11px] font-medium select-none rounded ${
          isActive
            ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-[0_0_12px_rgba(244,244,245,0.4)] font-semibold scale-[0.98]'
            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
        } ${key.labelClass || 'whitespace-pre-line text-center p-1'}`}
      >
        {key.label}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Keyboard Container Card */}
      <Card className="border-zinc-800 bg-zinc-950 overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <div className="flex items-center space-x-2">
              <span
                className={`relative flex h-2 w-2 ${isListening ? 'block' : 'hidden'}`}
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[13px] text-zinc-400 font-medium">
                {isListening
                  ? 'Ready. Press any key to inspect globally.'
                  : 'Listener paused. Click Resume to inspect.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center space-x-2 text-[12px] text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preventDefault}
                  onChange={(e) => setPreventDefault(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-900 text-zinc-100 focus:ring-0 cursor-pointer"
                />
                <span>Prevent default key behaviors</span>
              </label>

              <div className="h-4 w-px bg-zinc-800" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsListening(!isListening)}
                className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs py-1 h-8"
              >
                {isListening ? (
                  <>
                    <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1.5" /> Resume
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Interactive Keyboard */}
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <div
              style={{
                width: 'calc(14.954 * var(--key-unit, 44px) + 13 * 4px + 26px)',
                '--key-unit': 'clamp(42px, 5.5vw, 68px)',
              } as React.CSSProperties}
              className="mx-auto space-y-1.5 p-3 bg-zinc-900/40 rounded-lg border border-zinc-900"
            >
              {/* Row 1 */}
              <div className="flex gap-1 justify-between w-full">
                {ROW_1.map(renderKey)}
              </div>

              {/* Row 2 */}
              <div className="flex gap-1 justify-between w-full">
                {ROW_2.map(renderKey)}
              </div>

              {/* Row 3 */}
              <div className="flex gap-1 justify-between w-full">
                {ROW_3.map(renderKey)}
              </div>

              {/* Row 4 */}
              <div className="flex gap-1 justify-between w-full">
                {ROW_4.map(renderKey)}
              </div>

              {/* Row 5 */}
              <div className="flex gap-1 justify-between w-full">
                {ROW_5.map(renderKey)}
              </div>

              {/* Row 6 */}
              <div className="flex gap-1 justify-between w-full">
                <div
                  style={{ width: 'var(--key-unit, 44px)', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex items-center justify-center border text-[9px] font-medium select-none rounded p-1 whitespace-pre-line text-left ${
                    pressedKeys['Fn'] || pressedKeys['Function']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  fn
                </div>
                <div
                  style={{ width: 'var(--key-unit, 44px)', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex flex-col items-start justify-between border text-[9px] font-medium select-none rounded p-1.5 ${
                    pressedKeys['ControlLeft']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  <span>control</span>
                  <span className="self-end text-[8px] opacity-60">^</span>
                </div>
                <div
                  style={{ width: 'var(--key-unit, 44px)', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex flex-col items-start justify-between border text-[9px] font-medium transition-all select-none rounded p-1.5 ${
                    pressedKeys['AltLeft']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  <span>option</span>
                  <span className="self-end text-[8px] opacity-60">⌥</span>
                </div>
                <div
                  style={{ width: 'calc(1.227 * var(--key-unit, 44px))', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex flex-col items-start justify-between border text-[9px] font-medium select-none rounded p-1.5 ${
                    pressedKeys['MetaLeft']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  <span>command</span>
                  <span className="self-end text-[8px] opacity-60">⌘</span>
                </div>
                <div
                  style={{ flexGrow: 1, minWidth: 'calc(3.4 * var(--key-unit, 44px))', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex items-center justify-center border text-[11px] font-medium select-none rounded ${
                    pressedKeys['Space']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                />
                <div
                  style={{ width: 'calc(1.227 * var(--key-unit, 44px))', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex flex-col items-end justify-between border text-[9px] font-medium select-none rounded p-1.5 ${
                    pressedKeys['MetaRight']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  <span>command</span>
                  <span className="self-start text-[8px] opacity-60">⌘</span>
                </div>
                <div
                  style={{ width: 'var(--key-unit, 44px)', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex flex-col items-end justify-between border text-[9px] font-medium select-none rounded p-1.5 ${
                    pressedKeys['AltRight']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  <span>option</span>
                  <span className="self-start text-[8px] opacity-60">⌥</span>
                </div>

                {/* Arrow Left */}
                <div
                  style={{ width: 'var(--key-unit, 44px)', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex items-center justify-center border text-[11px] font-medium select-none rounded ${
                    pressedKeys['ArrowLeft']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  ◀
                </div>

                {/* Arrow Up / Down Stack */}
                <div
                  style={{ width: 'var(--key-unit, 44px)', height: 'var(--key-unit, 44px)' }}
                  className="shrink-0 flex flex-col justify-between"
                >
                  <div
                    style={{ height: 'calc(0.454 * var(--key-unit, 44px))' }}
                    className={`flex items-center justify-center border text-[8px] font-medium transition-all select-none rounded-t ${
                      pressedKeys['ArrowUp']
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                    }`}
                  >
                    ▲
                  </div>
                  <div
                    style={{ height: 'calc(0.454 * var(--key-unit, 44px))' }}
                    className={`flex items-center justify-center border text-[8px] font-medium transition-all select-none rounded-b ${
                      pressedKeys['ArrowDown']
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                    }`}
                  >
                    ▼
                  </div>
                </div>

                {/* Arrow Right */}
                <div
                  style={{ width: 'var(--key-unit, 44px)', height: 'var(--key-unit, 44px)' }}
                  className={`shrink-0 flex items-center justify-center border text-[11px] font-medium transition-all select-none rounded ${
                    pressedKeys['ArrowRight']
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold scale-[0.98]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 transition-colors duration-200'
                  }`}
                >
                  ▶
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details and Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Parameters & JSON */}
        <div className="space-y-8">
          {/* Key Metrics Card */}
          <Card className="border-zinc-800 bg-zinc-950">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center">
                <Keyboard className="h-4 w-4 mr-2 text-zinc-400" />
                KeyboardEvent Properties
              </h3>

              {lastEvent ? (
                <div className="space-y-6">
                  {/* Big Key Display */}
                  <div className="flex items-center gap-6 p-4 bg-zinc-900/30 border border-zinc-900 rounded-lg">
                    <div className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-md shadow min-w-22.5">
                      <span className="text-[10px] text-zinc-500 font-mono mb-1">
                        event.key
                      </span>
                      <span className="text-xl font-bold text-zinc-100 tracking-wide font-mono text-center">
                        {lastEvent.key === ' ' ? 'Space' : lastEvent.key}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">event.code</span>
                        <span className="font-mono text-zinc-300 font-semibold">
                          {lastEvent.code}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">event.which</span>
                        <span className="font-mono text-zinc-300 font-semibold">
                          {lastEvent.which}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">event.keyCode</span>
                        <span className="font-mono text-zinc-300 font-semibold">
                          {lastEvent.keyCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Properties Table */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2.5 p-3.5 bg-zinc-900/20 border border-zinc-900 rounded">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Location</span>
                        <span className="font-semibold text-zinc-300">
                          {getLocationString(lastEvent.location)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Is Repeat?</span>
                        <span
                          className={`font-semibold ${
                            lastEvent.repeat ? 'text-amber-400' : 'text-zinc-400'
                          }`}
                        >
                          {lastEvent.repeat ? 'True' : 'False'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 p-3.5 bg-zinc-900/20 border border-zinc-900 rounded">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Is Composing?</span>
                        <span className="font-semibold text-zinc-400">
                          {lastEvent.isComposing ? 'True' : 'False'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Timestamp</span>
                        <span className="font-mono text-zinc-400">
                          {formatTime(lastEvent.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Modifiers Grid */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                      Active Modifiers
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Shift', active: lastEvent.shiftKey, symbol: '⇧' },
                        { label: 'Control', active: lastEvent.ctrlKey, symbol: '^' },
                        { label: 'Option', active: lastEvent.altKey, symbol: '⌥' },
                        { label: 'Command', active: lastEvent.metaKey, symbol: '⌘' },
                      ].map((mod) => (
                        <div
                          key={mod.label}
                          className={`flex flex-col items-center py-2.5 border rounded transition-colors ${
                            mod.active
                              ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold'
                              : 'bg-zinc-900/10 border-zinc-900 text-zinc-600'
                          }`}
                        >
                          <span className="text-xs mb-0.5">{mod.label}</span>
                          <span className="text-sm font-mono">{mod.symbol}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-zinc-900 rounded-lg">
                  <p className="text-zinc-500 text-sm">
                    No keys pressed yet. Press any key.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* JSON Payload Code block */}
          {lastEvent && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Raw JSON Event Payload
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyJson}
                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 h-8"
                  >
                    {jsonCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </div>

                <pre className="text-[11px] font-mono p-4 bg-zinc-950 border border-zinc-900 rounded overflow-x-auto text-zinc-300 max-h-56">
                  {JSON.stringify(lastEvent, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Keystroke Log */}
        <Card className="border-zinc-800 bg-zinc-950 h-full">
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
              <h3 className="text-sm font-semibold text-zinc-200">
                Live Keystroke Log (Last 15)
              </h3>
              {history.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHistory([]);
                    setLastEvent(null);
                  }}
                  className="border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-red-400 hover:border-red-950 h-8 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Log
                </Button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-900">
                      <th className="py-2.5 font-medium">Time</th>
                      <th className="py-2.5 font-medium">Key</th>
                      <th className="py-2.5 font-medium">Code</th>
                      <th className="py-2.5 font-medium text-center">Code/Which</th>
                      <th className="py-2.5 font-medium text-right">Modifiers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((ev, index) => {
                      const modifiersStr = [
                        ev.shiftKey ? '⇧' : '',
                        ev.ctrlKey ? '^' : '',
                        ev.altKey ? '⌥' : '',
                        ev.metaKey ? '⌘' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <tr
                          key={ev.timestamp + index}
                          className="border-b border-zinc-900/60 hover:bg-zinc-900/10 text-zinc-300 font-mono transition-colors"
                        >
                          <td className="py-3 text-[11px] text-zinc-500">
                            {formatTime(ev.timestamp)}
                          </td>
                          <td className="py-3 font-semibold font-sans">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                              {ev.key === ' ' ? 'Space' : ev.key}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-400 text-[11px]">
                            {ev.code}
                          </td>
                          <td className="py-3 text-center text-zinc-400">
                            {ev.which}
                          </td>
                          <td className="py-3 text-right font-sans font-semibold text-zinc-400">
                            {modifiersStr ? (
                              <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded tracking-wider">
                                {modifiersStr}
                              </span>
                            ) : (
                              <span className="text-zinc-600 font-normal">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-24 border border-dashed border-zinc-900 rounded-lg">
                <p className="text-zinc-500 text-sm">
                  Keystroke log is empty. Press keys to populate.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
