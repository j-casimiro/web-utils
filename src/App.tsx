import { useState } from 'react';
import { Search } from 'lucide-react';
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

interface ToolItem {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
}

const TOOLS: ToolItem[] = [
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

  // Filter tools based on search query
  const filteredTools = TOOLS.filter(
    (tool) =>
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeTool = TOOLS.find((tool) => tool.id === activeToolId);
  const ActiveToolComponent = activeTool?.component;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-16">
        {ActiveToolComponent && activeTool ? (
          <ToolWrapper
            title={activeTool.title}
            description={activeTool.description}
            onBack={() => setActiveToolId(null)}
          >
            <ActiveToolComponent />
          </ToolWrapper>
        ) : (
          <div className="space-y-10">
            {/* Minimal Hero / Intro */}
            <div className="space-y-4 max-w-xl mx-auto text-center flex flex-col items-center">
              <h1 className="text-[36px] font-semibold tracking-tight text-zinc-100">
                Web Utilities
              </h1>
              <p className="text-zinc-400 text-[13px] leading-normal max-w-md">
                A minimal, offline-first collection of utilities for daily
                developer needs. All conversions and generations run entirely in
                your browser.
              </p>
            </div>

            {/* Search Section */}
            <div className="relative max-w-md w-full mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search tools (e.g. password, qr, unit)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-500 focus-visible:ring-zinc-850 focus-visible:border-zinc-800"
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
                      <CardTitle className="text-[15px] font-bold group-hover:text-white transition-colors">
                        {tool.title}
                      </CardTitle>
                      <CardDescription className="text-zinc-400 text-[13px] leading-normal">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent></CardContent>
                    <CardFooter className="pt-4 border-t border-border mt-auto px-4 pb-4">
                      <Button
                        onClick={() => setActiveToolId(tool.id)}
                        className="w-full border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 border text-xs"
                      >
                        Open Tool
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-zinc-900 rounded-lg">
                <p className="text-zinc-500 text-sm">
                  No tools found matching your search.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-black py-8 mt-12 text-center text-[12px] text-zinc-500 font-mono">
        <p>built by j-casimiro</p>
      </footer>
    </div>
  );
}
