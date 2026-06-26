import { useState } from 'react';
import {
  Copy,
  Check,
  Trash2,
  Calendar,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Helper for Base64Url decode
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binString = atob(base64);
  const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Helper for Base64Url encode (used to construct the sample token dynamically)
function base64UrlEncode(obj: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(jsonStr);
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    '',
  );
  const base64 = btoa(binString);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function JWTDecoder() {
  const [inputToken, setInputToken] = useState('');
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  let headerText = '';
  let payloadText = '';
  let signatureText = '';
  let error = '';
  let tokenStatus: {
    status: 'active' | 'expired' | 'invalid' | 'none';
    message: string;
    expDate?: string;
    iatDate?: string;
  } = { status: 'none', message: '' };

  if (inputToken.trim()) {
    try {
      const parts = inputToken.trim().split('.');
      if (parts.length !== 3) {
        throw new Error(
          'Invalid token structure. A JWT must consist of exactly 3 parts separated by dots (header.payload.signature).',
        );
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Decode header
      try {
        const decodedHeader = base64UrlDecode(headerB64);
        const parsedHeader = JSON.parse(decodedHeader) as Record<
          string,
          unknown
        >;
        headerText = JSON.stringify(parsedHeader, null, 2);
      } catch {
        throw new Error(
          'Failed to decode Header. The header portion is not valid Base64Url or JSON.',
        );
      }

      // Decode payload
      let parsedPayload: Record<string, unknown> = {};
      try {
        const decodedPayload = base64UrlDecode(payloadB64);
        parsedPayload = JSON.parse(decodedPayload) as Record<string, unknown>;
        payloadText = JSON.stringify(parsedPayload, null, 2);
      } catch {
        throw new Error(
          'Failed to decode Payload. The payload portion is not valid Base64Url or JSON.',
        );
      }

      signatureText = signatureB64;

      // Analyze claims (exp, iat)
      let status: 'active' | 'expired' | 'invalid' | 'none' = 'active';
      let message = 'Token structure is valid.';
      let expDateStr: string | undefined;
      let iatDateStr: string | undefined;

      if (typeof parsedPayload.iat === 'number') {
        iatDateStr = new Date(parsedPayload.iat * 1000).toLocaleString();
      }

      if (typeof parsedPayload.exp === 'number') {
        expDateStr = new Date(parsedPayload.exp * 1000).toLocaleString();
        const diff = parsedPayload.exp - nowSeconds;
        if (diff < 0) {
          status = 'expired';
          message = `Token expired on ${expDateStr}`;
        } else {
          status = 'active';
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          if (hours > 0) {
            message = `Expires in ${hours}h ${minutes}m (${expDateStr})`;
          } else {
            message = `Expires in ${minutes}m (${expDateStr})`;
          }
        }
      } else {
        message = 'Token structure is valid (No expiration claim found).';
      }

      tokenStatus = {
        status,
        message,
        expDate: expDateStr,
        iatDate: iatDateStr,
      };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to parse JWT.';
      headerText = '';
      payloadText = '';
      signatureText = '';
      tokenStatus = { status: 'invalid', message: 'Invalid token structure' };
    }
  }

  const handleLoadSample = () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const sampleHeader = { alg: 'HS256', typ: 'JWT' };
    const samplePayload = {
      sub: 'user_1234567890',
      name: 'Jane Developer',
      email: 'jane.dev@example.org',
      admin: true,
      iat: nowSeconds,
      exp: nowSeconds + 7200, // 2 hours from now
    };

    const headerB64 = base64UrlEncode(sampleHeader);
    const payloadB64 = base64UrlEncode(samplePayload);
    const signatureB64 = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    setInputToken(`${headerB64}.${payloadB64}.${signatureB64}`);
  };

  const handleClear = () => {
    setInputToken('');
  };

  const handleCopySection = async (
    text: string,
    setCopied: (val: boolean) => void,
  ) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap gap-4 justify-between items-center bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
        <span className="text-zinc-400 text-xs font-mono">
          Decodes client-side only. Your token never leaves your browser.
        </span>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleLoadSample}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-8 px-3"
          >
            Sample Token
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!inputToken}
            className="border-zinc-800 bg-zinc-900 text-red-400 hover:bg-zinc-800 hover:text-red-300 text-xs h-8 px-3"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Token (lg:span-5) */}
        <div className="lg:col-span-5 space-y-2 flex flex-col h-137.5">
          <Label
            htmlFor="jwt-input"
            className="text-zinc-300 text-sm font-semibold"
          >
            Encoded Token
          </Label>
          <textarea
            id="jwt-input"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            placeholder="Paste your JWT encoded token here..."
            className="flex-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 font-mono resize-none break-all leading-relaxed"
          />
        </div>

        {/* Right Column: Decoded Structure (lg:span-7) */}
        <div className="custom-scrollbar lg:col-span-7 space-y-4 flex flex-col h-137.5 overflow-y-auto pr-1">
          {error ? (
            <div className="p-4 bg-red-950/20 border border-red-800/50 text-red-400 font-mono text-xs rounded-md flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block mb-1">Invalid Token:</span>
                <span>{error}</span>
              </div>
            </div>
          ) : !inputToken ? (
            <div className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-600 text-xs italic">
              Decoded header and payload will be displayed here
            </div>
          ) : (
            <div className="space-y-4">
              {/* Claims status banner */}
              <div
                className={`p-4 border rounded-md flex items-center justify-between text-xs ${
                  tokenStatus.status === 'active'
                    ? 'border-emerald-800/50 bg-emerald-950/10 text-emerald-400'
                    : tokenStatus.status === 'expired'
                      ? 'border-red-800/50 bg-red-950/10 text-red-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {tokenStatus.status === 'active' ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <span className="font-mono">{tokenStatus.message}</span>
                </div>
                {tokenStatus.iatDate && (
                  <div className="text-[10px] text-zinc-500 hidden sm:flex items-center space-x-1 font-mono">
                    <Calendar className="h-3 w-3" />
                    <span>Issued: {tokenStatus.iatDate}</span>
                  </div>
                )}
              </div>

              {/* Decoded Header */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono">
                    Header: Algorithm & Token Type
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleCopySection(headerText, setCopiedHeader)
                    }
                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-[10px] h-6 px-2"
                  >
                    {copiedHeader ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copiedHeader ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <pre className="custom-scrollbar p-3 rounded border border-zinc-800 bg-zinc-950 text-xs font-mono text-indigo-300 overflow-x-auto">
                  {headerText}
                </pre>
              </div>

              {/* Decoded Payload */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono">
                    Payload: Data & Claims
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleCopySection(payloadText, setCopiedPayload)
                    }
                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-[10px] h-6 px-2"
                  >
                    {copiedPayload ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copiedPayload ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <pre className="custom-scrollbar p-3 rounded border border-zinc-800 bg-zinc-950 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                  {payloadText}
                </pre>
              </div>

              {/* Signature visualization */}
              <div className="space-y-2">
                <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono block">
                  Signature Verification (Simulated)
                </span>
                <div className="p-3 rounded border border-zinc-800 bg-zinc-950 text-[11px] font-mono text-zinc-400 space-y-2">
                  <div className="text-rose-400 leading-relaxed break-all">
                    {signatureText}
                  </div>
                  <div className="pt-2 border-t border-zinc-900 text-[10px] text-zinc-500">
                    HMACSHA256(
                    <br />
                    &nbsp;&nbsp;base64UrlEncode(header) + "." +
                    <br />
                    &nbsp;&nbsp;base64UrlEncode(payload),
                    <br />
                    &nbsp;&nbsp;your-256-bit-secret
                    <br />)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
