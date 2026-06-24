import { useState, useEffect } from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToolWrapper } from '@/components/tool-wrapper';

// Import our tools
import { QRGenerator } from '@/components/tools/qr-generator';
import { PasswordGenerator } from '@/components/tools/password-generator';
import { UnitConverter } from '@/components/tools/unit-converter';
import { TextUtils } from '@/components/tools/text-utils';
import { StringComparison } from '@/components/tools/string-comparison';
import { JSONFormatter } from '@/components/tools/json-formatter';
import { JWTDecoder } from '@/components/tools/jwt-decoder';
import { HashGenerator } from '@/components/tools/hash-generator';
import { LoremGenerator } from '@/components/tools/lorem-generator';
import { ColorConverter } from '@/components/tools/color-converter';
import { KeyboardInspector } from '@/components/tools/keyboard-inspector';
import { CronBuilder } from '@/components/tools/cron-builder';
import { RegexTester } from '@/components/tools/regex-tester';
import { HttpStatusExplorer } from '@/components/tools/http-status-explorer';
import { UrlParser } from '@/components/tools/url-parser';
import { AsciiShader } from '@/components/tools/ascii-shader';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
}

const TOOLS: ToolItem[] = [
  {
    id: 'ascii-shader',
    title: 'ASCII Shader Sandbox',
    description:
      'Render procedural WebGL shaders (Perlin noise flow, plasma waves, matrix rain) or custom images as interactive colored ASCII grids.',
    component: AsciiShader,
  },
  {
    id: 'url-parser',
    title: 'URL Parser & Query Builder',
    description:
      'Parse messy URLs into editable components and interactively build query strings.',
    component: UrlParser,
  },
  {
    id: 'http-status-explorer',
    title: 'HTTP Status Code Explorer',
    description:
      'Search and browse a comprehensive offline dictionary of HTTP status codes with caching and SEO implications.',
    component: HttpStatusExplorer,
  },
  {
    id: 'json-formatter',
    title: 'JSON Formatter',
    description:
      'Format, validate, minify, and inspect JSON structures interactively.',
    component: JSONFormatter,
  },
  {
    id: 'jwt-decoder',
    title: 'JWT Decoder',
    description:
      'Decode and inspect JSON Web Tokens (JWT) headers, payloads, and claims locally.',
    component: JWTDecoder,
  },
  {
    id: 'hash-generator',
    title: 'Hash & HMAC Generator',
    description:
      'Compute MD5, SHA-1, SHA-256, and SHA-512 hashes or HMAC signatures for text inputs.',
    component: HashGenerator,
  },
  {
    id: 'lorem-generator',
    title: 'Lorem Ipsum Generator',
    description:
      'Generate customizable dummy text, paragraphs, sentences, words, or lists.',
    component: LoremGenerator,
  },
  {
    id: 'color-converter',
    title: 'Color Converter & Palette Builder',
    description:
      'Convert HEX, RGB, HSL, and CMYK colors, build harmonious palettes, and check accessibility contrast.',
    component: ColorConverter,
  },
  {
    id: 'keyboard-inspector',
    title: 'Keyboard Event Inspector',
    description:
      'Press any key to inspect JavaScript event properties, active modifier keys, and visual key mapping.',
    component: KeyboardInspector,
  },
  {
    id: 'cron-builder',
    title: 'Cron Expression Builder & Explainer',
    description:
      'Demystify and build cron schedules interactively with natural language explanations and execution forecasts.',
    component: CronBuilder,
  },
  {
    id: 'regex-tester',
    title: 'RegEx Tester & Visualizer',
    description:
      'Test and validate regular expressions against sample texts with match highlights, capture groups, and code generators.',
    component: RegexTester,
  },
  {
    id: 'qr-generator',
    title: 'QR Code Generator',
    description:
      'Generate custom QR Codes instantly with color configurations and download options.',
    component: QRGenerator,
  },
  {
    id: 'password-generator',
    title: 'Password Generator',
    description:
      'Generate highly secure passwords with custom lengths and option parameters.',
    component: PasswordGenerator,
  },
  {
    id: 'unit-converter',
    title: 'Unit Converter',
    description:
      'Convert Temperature, Length, and Weight units with accurate math transformations.',
    component: UnitConverter,
  },
  {
    id: 'text-utils',
    title: 'Text Utilities',
    description:
      'Encode/Decode URLs and Base64, count words, and transform text cases.',
    component: TextUtils,
  },
  {
    id: 'string-comparison',
    title: 'String Comparison',
    description:
      'Compare two strings character-by-character and highlight differences.',
    component: StringComparison,
  },
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Filter tools based on search query
  const filteredTools = TOOLS.filter(
    (tool) =>
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeTool = TOOLS.find((tool) => tool.id === activeToolId);
  const ActiveToolComponent = activeTool?.component;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Main Content */}
      <main className={`flex-1 w-full mx-auto px-4 py-16 transition-all duration-300 ${
        activeToolId === 'keyboard-inspector' ? 'max-w-none md:px-8 lg:px-12' : 'max-w-5xl'
      }`}>
        {ActiveToolComponent && activeTool ? (
          <ToolWrapper
            title={activeTool.title}
            description={activeTool.description}
            onBack={() => setActiveToolId(null)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          >
            <ActiveToolComponent />
          </ToolWrapper>
        ) : (
          <div className="space-y-10">
            {/* Top Bar for Home Page Actions */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleTheme}
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>

            {/* Minimal Hero / Intro */}
            <div className="space-y-4 max-w-xl mx-auto text-center flex flex-col items-center">
              <h1 className="text-[36px] font-semibold tracking-tight text-foreground">
                Web Utilities
              </h1>
              <p className="text-muted-foreground text-[13px] leading-normal max-w-md">
                A minimal, offline-first collection of utilities for daily
                developer needs. All conversions and generations run entirely in
                your browser.
              </p>
            </div>

            {/* Search Section */}
            <div className="relative max-w-md w-full mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools (e.g. password, qr, unit)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border bg-card text-foreground placeholder-muted-foreground focus-visible:ring-ring focus-visible:border-border"
              />
            </div>

            {/* Tools Grid */}
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTools.map((tool) => (
                  <Card
                    key={tool.id}
                    className="border border-border bg-card text-card-foreground hover:bg-card-hover hover:border-active transition-all group duration-200 flex flex-col justify-between"
                  >
                    <CardHeader className="space-y-2">
                      <CardTitle className="text-[15px] font-bold group-hover:text-primary transition-colors">
                        {tool.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-[13px] leading-normal">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent></CardContent>
                    <CardFooter className="pt-4 border-t border-border mt-auto px-4 pb-4">
                      <Button
                        variant="outline"
                        onClick={() => setActiveToolId(tool.id)}
                        className="w-full border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground text-xs"
                      >
                        Open Tool
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-zinc-900 rounded-lg">
                <p className="text-muted-foreground text-sm">
                  No tools found matching your search.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8 mt-12 text-center text-[12px] text-zinc-500 font-mono flex flex-col items-center justify-center gap-3">
        <p>built by j-casimiro</p>
        <a
          href="https://github.com/j-casimiro/web-utils"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-[11px] font-sans"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>View on GitHub</span>
        </a>
      </footer>
    </div>
  );
}
