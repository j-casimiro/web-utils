import { useState } from 'react';
import {
  Copy,
  Check,
  Trash2,
  ArrowRight,
  Play,
  Eye,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Define complex sample JSON for testing
const SAMPLE_JSON = `{
  "appName": "Web Utilities",
  "version": "1.2.0",
  "active": true,
  "theme": "dark-zinc",
  "features": [
    {
      "id": "qr-generator",
      "name": "QR Code Generator",
      "status": "ready",
      "downloads": 1024
    },
    {
      "id": "json-formatter",
      "name": "JSON Formatter",
      "status": "new",
      "rating": 5.0
    }
  ],
  "creator": {
    "name": "j-casimiro",
    "role": "Fullstack Developer",
    "skills": ["React", "TypeScript", "TailwindCSS"]
  },
  "metadata": null
}`;

// Recursive JSON Tree Node Component
interface TreeNodeProps {
  name?: string;
  value: unknown;
  isLast?: boolean;
}

function TreeNode({ name, value, isLast = true }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  // Render Primitive values
  if (!isObject) {
    let valueElement;
    if (value === null) {
      valueElement = <span className="text-zinc-500 font-mono">null</span>;
    } else if (typeof value === 'string') {
      valueElement = (
        <span className="text-emerald-400 font-mono">"{value}"</span>
      );
    } else if (typeof value === 'number') {
      valueElement = <span className="text-amber-400 font-mono">{value}</span>;
    } else if (typeof value === 'boolean') {
      valueElement = (
        <span className="text-purple-400 font-mono">{String(value)}</span>
      );
    } else {
      valueElement = (
        <span className="text-zinc-300 font-mono">{String(value)}</span>
      );
    }

    return (
      <div className="pl-4 py-0.5 leading-relaxed text-xs">
        {name && (
          <span className="text-indigo-300 font-mono font-medium">
            "{name}":{' '}
          </span>
        )}
        {valueElement}
        {!isLast && <span className="text-zinc-500">,</span>}
      </div>
    );
  }

  // Render Object / Array collapsible node
  const keys = isArray ? [] : Object.keys(value as Record<string, unknown>);
  const length = isArray ? (value as unknown[]).length : keys.length;

  return (
    <div className="pl-4 py-0.5 text-xs">
      <div
        onClick={toggleOpen}
        className="flex items-center cursor-pointer select-none hover:bg-zinc-800/40 py-0.5 rounded px-1 -ml-1 transition-colors"
      >
        <span className="text-zinc-500 mr-0.5">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
        {name && (
          <span className="text-indigo-300 font-mono font-medium">
            "{name}":{' '}
          </span>
        )}
        <span className="text-zinc-400 font-mono">
          {isArray ? '[' : '{'}
          {!isOpen && (
            <span className="text-zinc-500 text-[10px] bg-zinc-800/80 px-1 py-0.2 mx-1 rounded font-sans">
              {length} {length === 1 ? 'item' : 'items'}
            </span>
          )}
        </span>
        {!isOpen && (
          <span className="text-zinc-400 font-mono">
            {isArray ? ']' : '}'}
            {!isLast && <span className="text-zinc-500">,</span>}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="border-l border-zinc-800 ml-1.5 pl-1.5 my-0.5">
          {isArray
            ? (value as unknown[]).map((item: unknown, index: number) => (
                <TreeNode
                  key={index}
                  value={item}
                  isLast={index === length - 1}
                />
              ))
            : keys.map((key: string, index: number) => (
                <TreeNode
                  key={key}
                  name={key}
                  value={(value as Record<string, unknown>)[key]}
                  isLast={index === length - 1}
                />
              ))}
        </div>
      )}

      {isOpen && (
        <div className="font-mono text-zinc-400 pl-4 py-0.5">
          {isArray ? ']' : '}'}
          {!isLast && <span className="text-zinc-500">,</span>}
        </div>
      )}
    </div>
  );
}

export function JSONFormatter() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [indentSize, setIndentSize] = useState('2');
  const [viewMode, setViewMode] = useState<'text' | 'tree'>('text');
  const [copied, setCopied] = useState(false);

  // Derive parsed data and validation error synchronously during render
  let error = '';
  let parsedData: unknown = null;
  if (inputText.trim()) {
    try {
      parsedData = JSON.parse(inputText);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Invalid JSON syntax';
    }
  }

  const handleBeautify = () => {
    if (!inputText.trim() || error) return;
    try {
      const parsed = JSON.parse(inputText);
      const space = indentSize === 'tab' ? '\t' : parseInt(indentSize, 10);
      const formatted = JSON.stringify(parsed, null, space);
      setOutputText(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMinify = () => {
    if (!inputText.trim() || error) return;
    try {
      const parsed = JSON.parse(inputText);
      const minified = JSON.stringify(parsed);
      setOutputText(minified);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = async () => {
    if (!outputText && !inputText) return;
    const textToCopy = outputText || inputText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_JSON);
    try {
      const parsed = JSON.parse(SAMPLE_JSON);
      const space = indentSize === 'tab' ? '\t' : parseInt(indentSize, 10);
      setOutputText(JSON.stringify(parsed, null, space));
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const pairs: Record<string, string> = {
      '{': '}',
      '[': ']',
      '"': '"',
    };

    // Tab key inserts indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent =
        indentSize === 'tab' ? '\t' : ' '.repeat(parseInt(indentSize, 10));
      const before = value.substring(0, start);
      const after = value.substring(end);
      setInputText(before + indent + after);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + indent.length,
          start + indent.length,
        );
      }, 0);
      return;
    }

    // Enter key auto-indents
    if (e.key === 'Enter') {
      e.preventDefault();
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];
      const match = currentLine.match(/^(\s*)/);
      const currentIndent = match ? match[1] : '';

      const indentUnit =
        indentSize === 'tab' ? '\t' : ' '.repeat(parseInt(indentSize, 10));
      const charBefore = start > 0 ? value[start - 1] : '';
      const charAfter = start < value.length ? value[start] : '';

      let insertion = '\n' + currentIndent;
      let cursorOffset = 1 + currentIndent.length;

      const isBracketOpen = charBefore === '{' || charBefore === '[';
      const isBracketClose = charAfter === '}' || charAfter === ']';

      if (isBracketOpen) {
        if (
          isBracketClose &&
          ((charBefore === '{' && charAfter === '}') ||
            (charBefore === '[' && charAfter === ']'))
        ) {
          insertion = '\n' + currentIndent + indentUnit + '\n' + currentIndent;
          cursorOffset = 1 + currentIndent.length + indentUnit.length;
        } else {
          insertion = '\n' + currentIndent + indentUnit;
          cursorOffset = 1 + currentIndent.length + indentUnit.length;
        }
      }

      const before = value.substring(0, start);
      const after = value.substring(end);
      setInputText(before + insertion + after);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }, 0);
      return;
    }

    // Auto-close open characters
    if (e.key in pairs) {
      e.preventDefault();
      const openChar = e.key;
      const closeChar = pairs[openChar];

      const before = value.substring(0, start);
      const selected = value.substring(start, end);
      const after = value.substring(end);

      const newValue = before + openChar + selected + closeChar + after;
      setInputText(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1 + selected.length);
      }, 0);
      return;
    }

    // Auto-skip closing characters
    if (['}', ']', '"'].includes(e.key)) {
      if (start === end && value[start] === e.key) {
        e.preventDefault();
        textarea.setSelectionRange(start + 1, start + 1);
        return;
      }
    }

    // Backspace deletes matching pair
    if (e.key === 'Backspace' && start === end && start > 0) {
      const charBefore = value[start - 1];
      const charAfter = value[start];
      if (
        (charBefore === '{' && charAfter === '}') ||
        (charBefore === '[' && charAfter === ']') ||
        (charBefore === '"' && charAfter === '"')
      ) {
        e.preventDefault();
        const before = value.substring(0, start - 1);
        const after = value.substring(start + 1);
        setInputText(before + after);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - 1, start - 1);
        }, 0);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap gap-4 justify-between items-center bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Indent Selector */}
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="indent-select"
              className="text-zinc-400 text-xs font-medium"
            >
              Indentation:
            </Label>
            <select
              id="indent-select"
              value={indentSize}
              onChange={(e) => setIndentSize(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-700"
            >
              <option value="2">2 Spaces</option>
              <option value="4">4 Spaces</option>
              <option value="tab">Tabs</option>
            </select>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Quick actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleBeautify}
              disabled={!!error || !inputText}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-8 px-3"
            >
              <Play className="h-3 w-3 mr-1.5 text-zinc-400" />
              Beautify
            </Button>
            <Button
              variant="outline"
              onClick={handleMinify}
              disabled={!!error || !inputText}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-8 px-3"
            >
              <ArrowRight className="h-3 w-3 mr-1.5 text-zinc-400" />
              Minify
            </Button>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleLoadSample}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-8 px-3"
          >
            Sample JSON
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!inputText && !outputText}
            className="border-zinc-800 bg-zinc-900 text-red-400 hover:bg-zinc-800 hover:text-red-300 text-xs h-8 px-3"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Editor & View panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Input Textarea */}
        <div className="space-y-2 flex flex-col h-125">
          <div className="flex justify-between items-center">
            <Label
              htmlFor="json-input"
              className="text-zinc-300 text-sm font-semibold"
            >
              Input JSON
            </Label>
            {inputText && (
              <span className="text-[10px] font-mono bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/30">
                {!error ? '✓ Valid JSON' : '✗ Invalid JSON'}
              </span>
            )}
          </div>
          <textarea
            id="json-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Paste your raw JSON here... e.g. {"key": "value"}'
            className="flex-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 font-mono resize-none"
          />
        </div>

        {/* Right Column: Output / Tree View */}
        <div className="space-y-2 flex flex-col h-125">
          <div className="flex justify-between items-center">
            {/* View Tabs */}
            <div className="flex space-x-1 bg-zinc-950 border border-zinc-800 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setViewMode('text')}
                className={`flex items-center px-3 py-1 rounded text-xs transition-all ${
                  viewMode === 'text'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                Formatted
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                disabled={!!error || !parsedData}
                className={`flex items-center px-3 py-1 rounded text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  viewMode === 'tree'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="h-3 w-3 mr-1.5" />
                Tree Viewer
              </button>
            </div>

            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!outputText && !inputText}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-7 px-2.5"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="flex-1 w-full rounded-md border border-zinc-800 bg-zinc-950 overflow-auto relative">
            {error ? (
              <div className="absolute inset-0 p-4 bg-red-950/10 text-red-400 font-mono text-xs flex flex-col space-y-2">
                <span className="font-semibold text-red-500">
                  Syntax Error:
                </span>
                <span className="whitespace-pre-wrap leading-relaxed">
                  {error}
                </span>
              </div>
            ) : !inputText ? (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs italic">
                Output will be displayed here
              </div>
            ) : viewMode === 'text' ? (
              <pre className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed select-text">
                {outputText || inputText}
              </pre>
            ) : (
              <div className="p-3 select-none">
                <TreeNode value={parsedData} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
