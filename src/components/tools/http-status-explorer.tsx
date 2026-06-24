import { useState, useMemo } from 'react';
import { Search, Info, Globe, AlertCircle, ServerCrash, CheckCircle2, ShieldAlert, BadgeInfo, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StatusCode {
  code: number;
  name: string;
  category: string;
  description: string;
  seoImplications?: string;
  cacheable: boolean;
  isStandard: boolean;
  referenceUrl?: string;
}

const STATUS_CODES: StatusCode[] = [
  { code: 100, name: 'Continue', category: '1xx', description: 'The server has received the request headers and the client should proceed to send the request body.', cacheable: false, isStandard: true },
  { code: 101, name: 'Switching Protocols', category: '1xx', description: 'The requester has asked the server to switch protocols and the server has agreed to do so. Often used for WebSockets.', cacheable: false, isStandard: true },
  { code: 102, name: 'Processing', category: '1xx', description: 'A WebDAV request may contain many sub-requests involving file operations, requiring a long time to complete the request. This code indicates that the server has received and is processing the request, but no response is available yet.', cacheable: false, isStandard: true },
  { code: 103, name: 'Early Hints', category: '1xx', description: 'Intended to be used with the Link header, letting the user agent start preloading resources while the server prepares a response.', cacheable: false, isStandard: true },
  
  { code: 200, name: 'OK', category: '2xx', description: 'Standard response for successful HTTP requests. The actual response will depend on the request method used.', seoImplications: 'The ideal status code for all indexed pages. Search engines interpret this as a fully healthy, indexable resource.', cacheable: true, isStandard: true },
  { code: 201, name: 'Created', category: '2xx', description: 'The request has been fulfilled, resulting in the creation of a new resource.', cacheable: false, isStandard: true },
  { code: 202, name: 'Accepted', category: '2xx', description: 'The request has been accepted for processing, but the processing has not been completed. Useful for asynchronous operations.', cacheable: false, isStandard: true },
  { code: 204, name: 'No Content', category: '2xx', description: 'The server successfully processed the request and is not returning any content.', cacheable: true, isStandard: true },
  { code: 206, name: 'Partial Content', category: '2xx', description: 'The server is delivering only part of the resource (byte serving) due to a range header sent by the client. Useful for video streaming.', cacheable: true, isStandard: true },
  
  { code: 301, name: 'Moved Permanently', category: '3xx', description: 'This and all future requests should be directed to the given URI.', seoImplications: 'Crucial for SEO. Passes virtually all link equity to the new URL. Always use this when a page has permanently moved.', cacheable: true, isStandard: true },
  { code: 302, name: 'Found', category: '3xx', description: 'Tells the client to look at (browse to) another URL. Formerly known as "Moved Temporarily".', seoImplications: 'Search engines will not transfer link equity to the new destination. Only use if the move is strictly temporary.', cacheable: false, isStandard: true },
  { code: 304, name: 'Not Modified', category: '3xx', description: 'Indicates that the resource has not been modified since the version specified by the request headers If-Modified-Since or If-None-Match.', seoImplications: 'Excellent for crawl budget. Tells Googlebot the content hasn\'t changed, saving bandwidth.', cacheable: true, isStandard: true },
  { code: 307, name: 'Temporary Redirect', category: '3xx', description: 'Similar to 302, but the client MUST NOT change the HTTP method (e.g., POST must remain POST) when following the redirect.', seoImplications: 'Treated similarly to 302 by search engines. Does not consolidate link equity.', cacheable: false, isStandard: true },
  { code: 308, name: 'Permanent Redirect', category: '3xx', description: 'Similar to 301, but the client MUST NOT change the HTTP method when following the redirect.', seoImplications: 'Passes link equity exactly like a 301. Preferred over 301 for permanent redirects of non-GET requests.', cacheable: true, isStandard: true },
  
  { code: 400, name: 'Bad Request', category: '4xx', description: 'The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large).', cacheable: false, isStandard: true },
  { code: 401, name: 'Unauthorized', category: '4xx', description: 'Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.', cacheable: false, isStandard: true },
  { code: 402, name: 'Payment Required', category: '4xx', description: 'Reserved for future use. The original intention was that this code might be used as part of some form of digital cash or micropayment scheme.', cacheable: false, isStandard: true },
  { code: 403, name: 'Forbidden', category: '4xx', description: 'The request contained valid data and was understood by the server, but the server is refusing action (e.g., the user does not have the necessary permissions).', seoImplications: 'Search engines cannot crawl 403 pages. Ensure public content does not accidentally return 403.', cacheable: false, isStandard: true },
  { code: 404, name: 'Not Found', category: '4xx', description: 'The requested resource could not be found but may be available in the future. Subsequent requests by the client are permissible.', seoImplications: 'Normal for removed pages. Soft 404s (returning a 200 with a "not found" message) are penalized by Google. Use actual 404s.', cacheable: true, isStandard: true },
  { code: 405, name: 'Method Not Allowed', category: '4xx', description: 'A request method is not supported for the requested resource; for example, a GET request on a form that requires data to be presented via POST.', cacheable: true, isStandard: true },
  { code: 406, name: 'Not Acceptable', category: '4xx', description: 'The requested resource is capable of generating only content not acceptable according to the Accept headers sent in the request.', cacheable: false, isStandard: true },
  { code: 408, name: 'Request Timeout', category: '4xx', description: 'The server timed out waiting for the request. According to HTTP specifications: "The client did not produce a request within the time that the server was prepared to wait."', cacheable: false, isStandard: true },
  { code: 409, name: 'Conflict', category: '4xx', description: 'Indicates that the request could not be processed because of conflict in the current state of the resource, such as an edit conflict between multiple simultaneous updates.', cacheable: false, isStandard: true },
  { code: 410, name: 'Gone', category: '4xx', description: 'Indicates that the resource requested is no longer available and will not be available again.', seoImplications: 'More definitive than 404. Tells search engines to immediately de-index the page and stop trying to crawl it.', cacheable: true, isStandard: true },
  { code: 414, name: 'URI Too Long', category: '4xx', description: 'The URI provided was too long for the server to process. Often the result of too much data being encoded as a query-string of a GET request.', cacheable: true, isStandard: true },
  { code: 418, name: 'I\'m a teapot', category: '4xx', description: 'An Easter egg status code defined in 1998 as an April Fools\' joke (RFC 2324). Expected response from a teapot attempting to brew coffee.', cacheable: false, isStandard: false },
  { code: 422, name: 'Unprocessable Entity', category: '4xx', description: 'The request was well-formed but was unable to be followed due to semantic errors (often used for validation errors in REST APIs).', cacheable: false, isStandard: true },
  { code: 429, name: 'Too Many Requests', category: '4xx', description: 'The user has sent too many requests in a given amount of time. Intended for use with rate-limiting schemes.', seoImplications: 'If Googlebot hits a 429, it will slow down its crawl rate. Ensure your rate limits are high enough for organic crawlers.', cacheable: false, isStandard: true },
  { code: 451, name: 'Unavailable For Legal Reasons', category: '4xx', description: 'A server operator has received a legal demand to deny access to a resource or to a set of resources that includes the requested resource.', cacheable: false, isStandard: true },
  
  { code: 500, name: 'Internal Server Error', category: '5xx', description: 'A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.', seoImplications: 'Frequent 500s will cause search engines to drastically reduce crawl frequency and potentially drop rankings.', cacheable: false, isStandard: true },
  { code: 502, name: 'Bad Gateway', category: '5xx', description: 'The server was acting as a gateway or proxy and received an invalid response from the upstream server.', cacheable: false, isStandard: true },
  { code: 503, name: 'Service Unavailable', category: '5xx', description: 'The server cannot handle the request (because it is overloaded or down for maintenance). Generally a temporary state.', seoImplications: 'The BEST status code for planned maintenance. Tells Googlebot "try again later" without penalizing the page\'s indexation.', cacheable: false, isStandard: true },
  { code: 504, name: 'Gateway Timeout', category: '5xx', description: 'The server was acting as a gateway or proxy and did not receive a timely response from the upstream server.', cacheable: false, isStandard: true },
  { code: 521, name: 'Web Server Is Down', category: '5xx', description: 'An unofficial Cloudflare error indicating that the origin web server refused the connection from Cloudflare.', cacheable: false, isStandard: false, referenceUrl: 'https://developers.cloudflare.com/support/troubleshooting/cloudflare-errors/troubleshooting-cloudflare-5xx-errors/#521-web-server-is-down' },
  { code: 522, name: 'Connection Timed Out', category: '5xx', description: 'An unofficial Cloudflare error indicating that Cloudflare could not negotiate a TCP handshake with the origin server.', cacheable: false, isStandard: false, referenceUrl: 'https://developers.cloudflare.com/support/troubleshooting/cloudflare-errors/troubleshooting-cloudflare-5xx-errors/#522-connection-timed-out' }
];

const CATEGORY_STYLES: Record<string, string> = {
  '1xx': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  '2xx': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  '3xx': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  '4xx': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  '5xx': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const CATEGORY_NAMES: Record<string, string> = {
  '1xx': 'Informational',
  '2xx': 'Success',
  '3xx': 'Redirection',
  '4xx': 'Client Error',
  '5xx': 'Server Error',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  '1xx': Info,
  '2xx': CheckCircle2,
  '3xx': Globe,
  '4xx': AlertCircle,
  '5xx': ServerCrash,
};

export function HttpStatusExplorer() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCode, setSelectedCode] = useState<StatusCode | null>(STATUS_CODES.find(c => c.code === 200) || null);

  const filteredCodes = useMemo(() => {
    return STATUS_CODES.filter(item => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchSearch = item.code.toString().includes(search) || item.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  return (
    <div className="flex flex-col h-162.5 bg-card text-card-foreground border border-border shadow-sm rounded-xl overflow-hidden">
      
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-border bg-muted/20 space-y-4 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code (e.g. 404) or name (e.g. Not Found)..."
            className="pl-9 bg-background h-10 border-border focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              selectedCategory === 'All' 
                ? 'bg-foreground text-background border-foreground' 
                : 'bg-background text-muted-foreground hover:bg-muted border-border'
            }`}
          >
            All Codes
          </button>
          {Object.keys(CATEGORY_STYLES).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                selectedCategory === cat 
                  ? CATEGORY_STYLES[cat] + ' border-current shadow-sm'
                  : 'bg-background text-muted-foreground hover:bg-muted border-border'
              }`}
            >
              {cat} {CATEGORY_NAMES[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: List */}
        <div className="w-1/3 min-w-50 max-w-70 border-r border-border overflow-y-auto bg-muted/10">
          {filteredCodes.length > 0 ? (
            <div className="p-2 space-y-1">
              {filteredCodes.map(code => (
                <button
                  key={code.code}
                  onClick={() => setSelectedCode(code)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                    selectedCode?.code === code.code
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                      selectedCode?.code === code.code 
                        ? 'bg-primary-foreground/20 border-transparent text-primary-foreground'
                        : CATEGORY_STYLES[code.category]
                    }`}>
                      {code.code}
                    </span>
                    <span className="text-sm font-medium truncate">{code.name}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground italic">
              No status codes found.
            </div>
          )}
        </div>

        {/* Right Pane: Details */}
        <div className="flex-1 overflow-y-auto bg-background p-6 lg:p-10">
          {selectedCode ? (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className={`text-3xl font-black px-4 py-1.5 rounded-xl border-2 ${CATEGORY_STYLES[selectedCode.category]}`}>
                    {selectedCode.code}
                  </span>
                  {!selectedCode.isStandard && (
                    <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-md border border-border">
                      Unofficial
                    </span>
                  )}
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-foreground">{selectedCode.name}</h2>
                <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  {(() => {
                    const Icon = CATEGORY_ICONS[selectedCode.category];
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span>{selectedCode.category} {CATEGORY_NAMES[selectedCode.category]}</span>
                </div>
              </div>

              {/* Main Description */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-base text-foreground/90 leading-relaxed border-l-4 border-primary pl-4">
                  {selectedCode.description}
                </p>
              </div>

              {/* Badges / Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${selectedCode.cacheable ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-muted/50 border-border'}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                    {selectedCode.cacheable ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={selectedCode.cacheable ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>Cacheable</span>
                  </h4>
                  <p className="text-sm font-medium text-foreground">
                    {selectedCode.cacheable ? 'Yes by default' : 'No by default'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${selectedCode.isStandard ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                    <BadgeInfo className={`w-3.5 h-3.5 ${selectedCode.isStandard ? 'text-blue-500' : 'text-amber-500'}`} />
                    <span className={selectedCode.isStandard ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}>Standard</span>
                  </h4>
                  <p className="text-sm font-medium text-foreground">
                    {selectedCode.isStandard ? 'Official IANA Registry' : 'Vendor Specific / Easter Egg'}
                  </p>
                </div>
              </div>

              {/* SEO Implications (if any) */}
              {selectedCode.seoImplications && (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-5 space-y-2">
                  <h4 className="text-sm font-bold text-sky-700 dark:text-sky-400 flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>SEO Implications</span>
                  </h4>
                  <p className="text-sm text-sky-900/80 dark:text-sky-100/80 leading-relaxed font-medium">
                    {selectedCode.seoImplications}
                  </p>
                </div>
              )}

              {/* Reference Link */}
              <div className="pt-4 border-t border-border flex">
                <a 
                  href={selectedCode.referenceUrl || `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${selectedCode.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Read more documentation</span>
                </a>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Info className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a status code from the sidebar to view details.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
