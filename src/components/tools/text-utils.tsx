import { useState } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function TextUtils() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClear = () => {
    setText('');
    setError('');
  };

  const handleUppercase = () => {
    setText(text.toUpperCase());
    setError('');
  };

  const handleLowercase = () => {
    setText(text.toLowerCase());
    setError('');
  };

  const handleURLEncode = () => {
    try {
      setText(encodeURIComponent(text));
      setError('');
    } catch {
      setError('Failed to URL Encode: Invalid text format.');
    }
  };

  const handleURLDecode = () => {
    try {
      setText(decodeURIComponent(text));
      setError('');
    } catch {
      setError('Failed to URL Decode: Invalid URI sequence.');
    }
  };

  const handleBase64Encode = () => {
    try {
      // Use btoa with utf-8 encoding workaround for arbitrary strings
      const bytes = new TextEncoder().encode(text);
      const binString = Array.from(bytes, (byte) =>
        String.fromCharCode(byte),
      ).join('');
      setText(btoa(binString));
      setError('');
    } catch {
      setError('Failed to Base64 Encode.');
    }
  };

  const handleBase64Decode = () => {
    try {
      const binString = atob(text);
      const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
      setText(new TextDecoder().decode(bytes));
      setError('');
    } catch {
      setError('Failed to Base64 Decode: Invalid Base64 input.');
    }
  };

  // Word and Character count calculations
  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  return (
    <div className="space-y-6">
      {/* Textarea Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="text-input" className="text-zinc-300">
            Input Text
          </Label>
          <div className="flex space-x-4 text-xs font-mono text-zinc-400">
            <span>
              Words: <strong>{wordCount}</strong>
            </span>
            <span>
              Chars: <strong>{charCount}</strong>
            </span>
          </div>
        </div>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
          placeholder="Paste or type text here..."
          className="flex min-h-40 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 border border-red-800/50 bg-red-950/20 text-red-400 text-xs rounded-md font-mono">
          {error}
        </div>
      )}

      {/* Control Buttons Grid */}
      <div className="flex flex-wrap gap-2 pt-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleUppercase}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-9"
          >
            UPPERCASE
          </Button>
          <Button
            variant="outline"
            onClick={handleLowercase}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-9"
          >
            lowercase
          </Button>
          <Button
            variant="outline"
            onClick={handleURLEncode}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-9"
          >
            URL Encode
          </Button>
          <Button
            variant="outline"
            onClick={handleURLDecode}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-9"
          >
            URL Decode
          </Button>
          <Button
            variant="outline"
            onClick={handleBase64Encode}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-9"
          >
            Base64 Encode
          </Button>
          <Button
            variant="outline"
            onClick={handleBase64Decode}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-9"
          >
            Base64 Decode
          </Button>
        </div>

        <div className="flex space-x-2 ml-auto">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-9"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!text}
            className="border-zinc-800 bg-zinc-900 text-red-400 hover:bg-zinc-800 hover:text-red-300 text-xs h-9"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
