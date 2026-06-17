import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, Key, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Helper for converting buffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper for converting buffer to base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Self-contained byte-level MD5 algorithm
function md5Bytes(bytes: number[] | Uint8Array): string {
  const k = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ];

  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  const byteLength = bytes.length;
  words[byteLength >> 2] |= 0x80 << ((byteLength % 4) * 8);
  const wordsLength = ((byteLength + 8) >> 6) * 16 + 14;
  while (words.length < wordsLength) {
    words.push(0);
  }
  words.push(byteLength * 8);
  words.push(0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  for (let i = 0; i < words.length; i += 16) {
    let a = h0,
      b = h1,
      c = h2,
      d = h3;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      b = (b + rotateLeft((a + f + k[j] + words[i + g]) | 0, s[j])) | 0;
      a = temp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
  }

  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function hex(n: number) {
    let s = '',
      v;
    for (let i = 0; i < 4; i++) {
      v = (n >>> (i * 8)) & 0xff;
      s += v.toString(16).padStart(2, '0');
    }
    return s;
  }

  return hex(h0) + hex(h1) + hex(h2) + hex(h3);
}

// Pure JS HMAC-MD5 helper
function hmacMd5(
  key: string,
  message: string,
  outputFormat: 'hex' | 'base64',
): string {
  const encoder = new TextEncoder();
  const keyBytes = Array.from(encoder.encode(key));
  const msgBytes = Array.from(encoder.encode(message));

  let k: number[];
  if (keyBytes.length > 64) {
    const hashedKeyHex = md5Bytes(keyBytes);
    k = hashedKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16));
  } else {
    k = [...keyBytes];
  }

  while (k.length < 64) {
    k.push(0);
  }

  const ipad = k.map((byte) => byte ^ 0x36);
  const opad = k.map((byte) => byte ^ 0x5c);

  const innerBytes = [...ipad, ...msgBytes];
  const innerHex = md5Bytes(innerBytes);
  const innerHashBytes = innerHex
    .match(/.{1,2}/g)!
    .map((byte) => parseInt(byte, 16));

  const outerBytes = [...opad, ...innerHashBytes];
  const outerHex = md5Bytes(outerBytes);

  if (outputFormat === 'hex') {
    return outerHex;
  } else {
    const outerHashBytes = outerHex
      .match(/.{1,2}/g)!
      .map((byte) => parseInt(byte, 16));
    const binary = outerHashBytes.map((b) => String.fromCharCode(b)).join('');
    return btoa(binary);
  }
}

export function HashGenerator() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<'hash' | 'hmac'>('hash');
  const [algo, setAlgo] = useState<
    'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
  >('SHA-256');
  const [hmacKey, setHmacKey] = useState('');
  const [outputFormat, setOutputFormat] = useState<'hex' | 'base64'>('hex');
  const [copied, setCopied] = useState(false);

  // Compute hash or HMAC reactively
  useEffect(() => {
    let active = true;

    async function run() {
      if (!inputText) {
        if (active) setOutputText('');
        return;
      }

      try {
        let result = '';
        if (mode === 'hash') {
          if (algo === 'MD5') {
            const md5Hex = md5Bytes(new TextEncoder().encode(inputText));
            if (outputFormat === 'hex') {
              result = md5Hex;
            } else {
              const hexBytes = md5Hex
                .match(/.{1,2}/g)!
                .map((byte) => parseInt(byte, 16));
              const binary = hexBytes
                .map((b) => String.fromCharCode(b))
                .join('');
              result = btoa(binary);
            }
          } else {
            const encoder = new TextEncoder();
            const data = encoder.encode(inputText);
            const hashBuffer = await crypto.subtle.digest(algo, data);
            if (outputFormat === 'hex') {
              result = bufferToHex(hashBuffer);
            } else {
              result = bufferToBase64(hashBuffer);
            }
          }
        } else {
          // HMAC Mode
          if (!hmacKey) {
            if (active)
              setOutputText('Enter an HMAC Key to calculate signature...');
            return;
          }

          if (algo === 'MD5') {
            result = hmacMd5(hmacKey, inputText, outputFormat);
          } else {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(hmacKey);
            const data = encoder.encode(inputText);

            const cryptoKey = await crypto.subtle.importKey(
              'raw',
              keyData,
              { name: 'HMAC', hash: { name: algo } },
              false,
              ['sign'],
            );

            const signatureBuffer = await crypto.subtle.sign(
              'HMAC',
              cryptoKey,
              data,
            );
            if (outputFormat === 'hex') {
              result = bufferToHex(signatureBuffer);
            } else {
              result = bufferToBase64(signatureBuffer);
            }
          }
        }

        if (active) setOutputText(result);
      } catch (err) {
        console.error(err);
        if (active) {
          setOutputText(
            'Error computing hash: ' +
              (err instanceof Error ? err.message : String(err)),
          );
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [inputText, mode, algo, hmacKey, outputFormat]);

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setHmacKey('');
    setOutputText('');
  };

  const handleLoadSample = () => {
    setInputText('The quick brown fox jumps over the lazy dog');
    if (mode === 'hmac') {
      setHmacKey('secret-key');
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-950 p-4 border border-zinc-800 rounded-lg items-end">
        {/* Hash / HMAC Mode Selection */}
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono">
            Mode
          </Label>
          <div className="flex space-x-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setMode('hash')}
              className={`flex-1 text-center py-1 rounded text-xs transition-all ${
                mode === 'hash'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Hash
            </button>
            <button
              type="button"
              onClick={() => setMode('hmac')}
              className={`flex-1 text-center py-1 rounded text-xs transition-all ${
                mode === 'hmac'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              HMAC
            </button>
          </div>
        </div>

        {/* Algorithm Selection */}
        <div className="space-y-2">
          <Label
            htmlFor="algo-select"
            className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono"
          >
            Algorithm
          </Label>
          <select
            id="algo-select"
            value={algo}
            onChange={(e) =>
              setAlgo(
                e.target.value as
                  | 'MD5'
                  | 'SHA-1'
                  | 'SHA-256'
                  | 'SHA-384'
                  | 'SHA-512',
              )
            }
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 h-8"
          >
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-512">SHA-512</option>
            <option value="SHA-384">SHA-384</option>
            <option value="SHA-1">SHA-1</option>
            <option value="MD5">MD5</option>
          </select>
        </div>

        {/* Output Format */}
        <div className="space-y-2">
          <Label
            htmlFor="format-select"
            className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono"
          >
            Output Format
          </Label>
          <select
            id="format-select"
            value={outputFormat}
            onChange={(e) =>
              setOutputFormat(e.target.value as 'hex' | 'base64')
            }
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 h-8"
          >
            <option value="hex">HEX (Hexadecimal)</option>
            <option value="base64">Base64</option>
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleLoadSample}
            className="flex-1 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-8"
          >
            Load Sample
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!inputText && !hmacKey}
            className="border-zinc-800 bg-zinc-900 text-red-400 hover:bg-zinc-800 hover:text-red-300 text-xs h-8 px-3"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conditionally Rendered HMAC Key Input */}
      {mode === 'hmac' && (
        <div className="space-y-2 bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-zinc-500" />
            <Label
              htmlFor="hmac-key"
              className="text-zinc-300 text-sm font-semibold"
            >
              HMAC Key (Secret)
            </Label>
          </div>
          <input
            id="hmac-key"
            type="text"
            value={hmacKey}
            onChange={(e) => setHmacKey(e.target.value)}
            placeholder="Enter HMAC key secret..."
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 font-mono"
          />
        </div>
      )}

      {/* Dual Pane Layout for Input / Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Input Textarea */}
        <div className="space-y-2 flex flex-col h-75">
          <Label
            htmlFor="hash-input"
            className="text-zinc-300 text-sm font-semibold"
          >
            Input Text
          </Label>
          <textarea
            id="hash-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter raw text here to hash..."
            className="flex-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 font-mono resize-none leading-relaxed"
          />
        </div>

        {/* Right Column: Output Textarea */}
        <div className="space-y-2 flex flex-col h-75">
          <div className="flex justify-between items-center">
            <Label
              htmlFor="hash-output"
              className="text-zinc-300 text-sm font-semibold"
            >
              Generated Hash
            </Label>
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={
                !outputText ||
                outputText.startsWith('Enter') ||
                outputText.startsWith('Error')
              }
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
          <div className="flex-1 w-full rounded-md border border-zinc-800 bg-zinc-950 p-3 relative font-mono text-xs overflow-auto flex items-start break-all">
            {outputText ? (
              <span
                className={`${
                  outputText.startsWith('Enter')
                    ? 'text-zinc-600 italic'
                    : outputText.startsWith('Error')
                      ? 'text-red-400'
                      : 'text-zinc-100 font-semibold'
                }`}
              >
                {outputText}
              </span>
            ) : (
              <span className="text-zinc-600 italic">
                Output hash will automatically calculate as you type...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Warning */}
      <div className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-md text-[11px] text-zinc-500 flex items-start space-x-2">
        <HelpCircle className="h-4.5 w-4.5 text-zinc-600 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>SHA-256, SHA-512, SHA-384, and SHA-1</strong> are calculated
          using the browser's native W3C Web Crypto API.
          <strong>MD5</strong> calculations run entirely client-side using a
          lightweight byte-level JavaScript implementation. No data is sent over
          the network.
        </span>
      </div>
    </div>
  );
}
