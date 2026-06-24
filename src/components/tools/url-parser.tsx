import { useState, useMemo } from 'react';
import { Link, Copy, Check, Trash2, Plus, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface QueryParam {
  id: string;
  key: string;
  value: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const rebuildUrlString = (parts: {
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
}) => {
  let proto = parts.protocol.trim();
  proto = proto.replace(/[:/]+$/, '');
  
  const host = parts.host.trim();
  let pathname = parts.pathname.trim();
  if (pathname && !pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  
  let search = parts.search.trim();
  if (search && !search.startsWith('?')) {
    search = '?' + search;
  }
  
  let hash = parts.hash.trim();
  if (hash && !hash.startsWith('#')) {
    hash = '#' + hash;
  }

  if (!proto) {
    return `${host}${pathname}${search}${hash}`;
  }
  
  const isNoSlash = ['mailto', 'tel', 'sms'].includes(proto.toLowerCase());
  const separator = isNoSlash ? ':' : '://';
  
  return `${proto}${separator}${host}${pathname}${search}${hash}`;
};

export function UrlParser() {
  const [rawUrl, setRawUrl] = useState('https://example.com/api/v1/users?search=hello%20world&sort=desc&page=1#results');
  const [copied, setCopied] = useState(false);

  // Initial parsed object for local state initialization to prevent empty inputs flash
  const initialObj = useMemo(() => {
    const defaultUrl = 'https://example.com/api/v1/users?search=hello%20world&sort=desc&page=1#results';
    try {
      return new URL(defaultUrl);
    } catch {
      return null;
    }
  }, []);

  // We keep a separate ref to params so we don't regenerate IDs on every keystroke if we don't have to
  const [params, setParams] = useState<QueryParam[]>(() => {
    if (!initialObj) return [];
    const initialParams: QueryParam[] = [];
    initialObj.searchParams.forEach((value, key) => {
      initialParams.push({ id: generateId(), key, value });
    });
    return initialParams;
  });

  // Parse the URL
  const parsed = useMemo(() => {
    if (!rawUrl) return null;
    let urlString = rawUrl.trim();
    
    // Auto-prepend https:// if missing protocol to help parser
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(urlString)) {
      urlString = 'https://' + urlString;
    }

    try {
      const urlObj = new URL(urlString);
      return { obj: urlObj, isValid: true, error: null };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      return { obj: null, isValid: false, error: errorMsg };
    }
  }, [rawUrl]);

  // Local state for each breakdown component, allowing smooth real-time edits without locking focus/cursor
  const [localProtocol, setLocalProtocol] = useState(() => initialObj ? initialObj.protocol.replace(/:$/, '') : '');
  const [localHost, setLocalHost] = useState(() => initialObj ? initialObj.host : '');
  const [localPathname, setLocalPathname] = useState(() => initialObj ? initialObj.pathname : '');
  const [localHash, setLocalHash] = useState(() => initialObj ? initialObj.hash : '');

  const hasObj = parsed && parsed.isValid && parsed.obj;

  const handleUrlChange = (newUrl: string) => {
    setRawUrl(newUrl);
    
    const urlString = newUrl.trim();
    if (!urlString) {
      setLocalProtocol('');
      setLocalHost('');
      setLocalPathname('');
      setLocalHash('');
      setParams([]);
      return;
    }

    // Auto-prepend https:// if missing protocol to help parser
    let parsedUrlString = urlString;
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(parsedUrlString)) {
      parsedUrlString = 'https://' + parsedUrlString;
    }

    try {
      const urlObj = new URL(parsedUrlString);
      
      // Update local states
      setLocalProtocol(urlObj.protocol.replace(/:$/, ''));
      setLocalHost(urlObj.host);
      setLocalPathname(urlObj.pathname);
      setLocalHash(urlObj.hash);
      
      // Update params if different
      const newParams: QueryParam[] = [];
      urlObj.searchParams.forEach((value, key) => {
        newParams.push({ id: generateId(), key, value });
      });
      
      setParams(prevParams => {
        const currentQuery = new URLSearchParams();
        prevParams.forEach(p => {
          if (p.key) currentQuery.append(p.key, p.value);
        });
        
        if (urlObj.search !== '?' + currentQuery.toString() && urlObj.search !== currentQuery.toString()) {
          return newParams;
        }
        return prevParams;
      });
    } catch {
      // Invalid URL format - keep current breakdown fields as is
    }
  };

  const handleBlur = () => {
    if (parsed && parsed.isValid && parsed.obj) {
      setLocalProtocol(parsed.obj.protocol.replace(/:$/, ''));
      setLocalHost(parsed.obj.host);
      setLocalPathname(parsed.obj.pathname);
      setLocalHash(parsed.obj.hash);
    }
  };

  // Handle table edits
  const updateParam = (id: string, newKey: string, newValue: string) => {
    // Update local state first to keep focus
    const newParams = params.map(p => p.id === id ? { ...p, key: newKey, value: newValue } : p);
    setParams(newParams);
    
    // Rebuild URL from current local states and new params
    const searchParams = new URLSearchParams();
    newParams.forEach(p => {
      if (p.key) searchParams.append(p.key, p.value);
    });
    
    const currentParts = {
      protocol: localProtocol,
      host: localHost,
      pathname: localPathname,
      search: searchParams.toString(),
      hash: localHash,
    };
    
    setRawUrl(rebuildUrlString(currentParts));
  };

  const addParam = () => {
    if (!rawUrl) {
      setRawUrl('https://example.com/?new_key=value');
      setLocalProtocol('https');
      setLocalHost('example.com');
      setLocalPathname('/');
      setLocalHash('');
      setParams([{ id: generateId(), key: 'new_key', value: 'value' }]);
      return;
    }
    
    const newParams = [...params, { id: generateId(), key: 'new_key', value: 'value' }];
    setParams(newParams);
    
    const searchParams = new URLSearchParams();
    newParams.forEach(p => {
      if (p.key) searchParams.append(p.key, p.value);
    });
    
    const currentParts = {
      protocol: localProtocol,
      host: localHost,
      pathname: localPathname,
      search: searchParams.toString(),
      hash: localHash,
    };
    
    setRawUrl(rebuildUrlString(currentParts));
  };

  const deleteParam = (id: string) => {
    const newParams = params.filter(p => p.id !== id);
    setParams(newParams);
    
    const searchParams = new URLSearchParams();
    newParams.forEach(p => {
      if (p.key) searchParams.append(p.key, p.value);
    });
    
    const currentParts = {
      protocol: localProtocol,
      host: localHost,
      pathname: localPathname,
      search: searchParams.toString(),
      hash: localHash,
    };
    
    setRawUrl(rebuildUrlString(currentParts));
  };

  const updateComponent = (part: 'protocol' | 'host' | 'pathname' | 'hash', val: string) => {
    // Rebuild URL using current local states (with the newly edited part merged in)
    const searchParams = new URLSearchParams();
    params.forEach(p => {
      if (p.key) searchParams.append(p.key, p.value);
    });

    const currentParts = {
      protocol: part === 'protocol' ? val : localProtocol,
      host: part === 'host' ? val : localHost,
      pathname: part === 'pathname' ? val : localPathname,
      search: searchParams.toString(),
      hash: part === 'hash' ? val : localHash,
    };
    
    setRawUrl(rebuildUrlString(currentParts));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground flex items-center">
            <Link className="w-4 h-4 mr-2 text-primary" />
            URL String
          </label>
          <div className="flex space-x-2">
            {hasObj && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="h-7 text-xs font-semibold px-2.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? 'Copied' : 'Copy URL'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  handleUrlChange(text);
                } catch {
                  // Do nothing
                }
              }}
              className="h-7 text-xs font-semibold px-2.5"
            >
              Paste
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUrlChange('')}
              className="h-7 text-xs font-semibold px-2.5 text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="relative">
          <textarea
            value={rawUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className={`w-full p-3 font-mono text-sm border rounded-lg bg-background text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${
              parsed && !parsed.isValid && rawUrl ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
            }`}
            style={{ fieldSizing: 'content', minHeight: '6rem' } as React.CSSProperties}
            placeholder="Paste URL here (e.g. https://api.example.com/users?id=123)"
          />
        </div>
        {parsed && !parsed.isValid && rawUrl && (
          <div className="flex items-center text-destructive text-sm font-medium mt-1">
            <AlertCircle className="w-4 h-4 mr-1.5" />
            Invalid URL Format
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Breakdown */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Breakdown</h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Scheme / Protocol</label>
              <Input
                id="input-protocol"
                value={localProtocol}
                onChange={(e) => {
                  setLocalProtocol(e.target.value);
                  updateComponent('protocol', e.target.value);
                }}
                onBlur={handleBlur}
                disabled={!hasObj && !rawUrl}
                placeholder="https"
                className="font-mono text-sm bg-muted/10 border-border h-9 focus-visible:bg-background transition-colors disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Host</label>
              <Input
                id="input-host"
                value={localHost}
                onChange={(e) => {
                  setLocalHost(e.target.value);
                  updateComponent('host', e.target.value);
                }}
                onBlur={handleBlur}
                disabled={!hasObj && !rawUrl}
                placeholder="example.com"
                className="font-mono text-sm bg-muted/10 border-border h-9 focus-visible:bg-background transition-colors disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Path</label>
              <Input
                id="input-pathname"
                value={localPathname}
                onChange={(e) => {
                  setLocalPathname(e.target.value);
                  updateComponent('pathname', e.target.value);
                }}
                onBlur={handleBlur}
                disabled={!hasObj && !rawUrl}
                placeholder="/"
                className="font-mono text-sm bg-muted/10 border-border h-9 focus-visible:bg-background transition-colors disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Hash / Fragment</label>
              <Input
                id="input-hash"
                value={localHash}
                onChange={(e) => {
                  setLocalHash(e.target.value);
                  updateComponent('hash', e.target.value);
                }}
                onBlur={handleBlur}
                disabled={!hasObj && !rawUrl}
                placeholder="#"
                className="font-mono text-sm bg-sky-500/5 border-sky-500/20 text-sky-600 dark:text-sky-400 h-9 focus-visible:bg-background transition-colors disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Query Params Table */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold text-foreground">Query Parameters</h3>
            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
              {params.length}
            </span>
          </div>
          
          <div className="bg-muted/10 border border-border rounded-xl overflow-hidden flex flex-col">
            {params.length > 0 ? (
              <div className="divide-y divide-border">
                {params.map((param) => (
                  <div key={param.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center p-2 gap-2 bg-background hover:bg-muted/30 transition-colors">
                    <Input
                      value={param.key}
                      onChange={(e) => updateParam(param.id, e.target.value, param.value)}
                      placeholder="Key"
                      className="font-mono text-xs h-8 bg-transparent border-transparent hover:border-input focus-visible:bg-background w-full min-w-0"
                    />
                    <span className="text-muted-foreground font-bold shrink-0">=</span>
                    <Input
                      value={param.value}
                      onChange={(e) => updateParam(param.id, param.key, e.target.value)}
                      placeholder="Value"
                      className="font-mono text-xs h-8 bg-transparent border-transparent hover:border-input focus-visible:bg-background w-full min-w-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteParam(param.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No query parameters found in URL.
              </div>
            )}
            
            <div className="p-2 border-t border-border bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={addParam}
                disabled={!hasObj && !!rawUrl}
                className="w-full h-8 border-dashed text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Parameter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
