import { useState } from 'react';
import { Search, Info, Copy, Check, Code, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MatchInfo {
  index: number;
  matchText: string;
  groups: string[];
}

export function RegexTester() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState({
    g: true,
    i: true,
    m: false,
    s: false,
    u: false,
  });
  const [testString, setTestString] = useState('Contact us at support@example.com or info@domain.org for help.');
  const [activeLang, setActiveLang] = useState<'js' | 'python' | 'go' | 'rust'>('js');
  const [copied, setCopied] = useState(false);

  const getRegexResult = () => {
    if (!pattern) {
      return { matches: [], error: null };
    }

    try {
      const activeFlags = Object.entries(flags)
        .filter(([, active]) => active)
        .map(([flag]) => flag)
        .join('');

      const regex = new RegExp(pattern, activeFlags);
      const foundMatches: MatchInfo[] = [];
      
      if (flags.g) {
        let match;
        let count = 0;
        // Reset lastIndex
        regex.lastIndex = 0;
        
        while ((match = regex.exec(testString)) !== null && count < 500) {
          count++;
          foundMatches.push({
            index: match.index,
            matchText: match[0],
            groups: match.slice(1).map(g => g || ''),
          });
          
          if (match[0].length === 0) {
            regex.lastIndex++;
          }
        }
      } else {
        const match = regex.exec(testString);
        if (match) {
          foundMatches.push({
            index: match.index,
            matchText: match[0],
            groups: match.slice(1).map(g => g || ''),
          });
        }
      }

      return { matches: foundMatches, error: null };
    } catch (e: unknown) {
      return { matches: [], error: e instanceof Error ? e.message : 'Invalid regular expression syntax' };
    }
  };

  const { matches, error } = getRegexResult();

  const toggleFlag = (flag: 'g' | 'i' | 'm' | 's' | 'u') => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  const getHighlightedSpans = () => {
    if (!pattern || error) return [{ text: testString, isMatch: false }];

    try {
      const activeFlags = Object.entries(flags)
        .filter(([, active]) => active)
        .map(([flag]) => flag)
        .join('');

      const regex = new RegExp(pattern, activeFlags);
      const spans: { text: string; isMatch: boolean; index?: number }[] = [];
      let lastIndex = 0;
      let count = 0;

      if (flags.g) {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(testString)) !== null && count < 500) {
          const matchIndex = match.index;
          const matchText = match[0];

          if (matchIndex > lastIndex) {
            spans.push({
              text: testString.slice(lastIndex, matchIndex),
              isMatch: false,
            });
          }

          spans.push({
            text: matchText,
            isMatch: true,
            index: count,
          });

          lastIndex = regex.lastIndex;
          count++;

          if (matchText.length === 0) {
            regex.lastIndex++;
          }
        }
      } else {
        const match = regex.exec(testString);
        if (match) {
          const matchIndex = match.index;
          const matchText = match[0];

          if (matchIndex > 0) {
            spans.push({
              text: testString.slice(0, matchIndex),
              isMatch: false,
            });
          }

          spans.push({
            text: matchText,
            isMatch: true,
            index: 0,
          });

          lastIndex = matchIndex + matchText.length;
        }
      }

      if (lastIndex < testString.length) {
        spans.push({
          text: testString.slice(lastIndex),
          isMatch: false,
        });
      }

      return spans;
    } catch {
      return [{ text: testString, isMatch: false }];
    }
  };

  const getCodeSnippet = () => {
    const activeFlags = Object.entries(flags)
      .filter(([, active]) => active)
      .map(([flag]) => flag)
      .join('');

    switch (activeLang) {
      case 'js': {
        return `// JavaScript / TypeScript implementation
const pattern = /${pattern}/${activeFlags};
const testString = ${JSON.stringify(testString)};

${
  flags.g
    ? `// Match all occurrences
const matches = [...testString.matchAll(pattern)];
matches.forEach(match => {
  console.log(\`Found match: "\${match[0]}" at index \${match.index}\`);
  if (match.length > 1) {
    console.log("Capture Groups:", match.slice(1));
  }
});`
    : `// Match first occurrence
const match = testString.match(pattern);
if (match) {
  console.log(\`Found match: "\${match[0]}" at index \${match.index}\`);
  if (match.length > 1) {
    console.log("Capture Groups:", match.slice(1));
  }
}`
}`;
      }

      case 'python': {
        const pyFlags: string[] = [];
        if (flags.i) pyFlags.push('re.IGNORECASE');
        if (flags.m) pyFlags.push('re.MULTILINE');
        if (flags.s) pyFlags.push('re.DOTALL');
        const flagStr = pyFlags.length > 0 ? `, ${pyFlags.join(' | ')}` : '';

        return `# Python Implementation
import re

pattern = r"${pattern}"
test_string = ${JSON.stringify(testString)}

${
  flags.g
    ? `# Find all matches
matches = re.finditer(pattern, test_string${flagStr})
for match in matches:
    print(f"Found match: '{match.group(0)}' at index {match.start()}")
    if len(match.groups()) > 0:
        print("Capture Groups:", match.groups())`
    : `# Find first match
match = re.search(pattern, test_string${flagStr})
if match:
    print(f"Found match: '{match.group(0)}' at index {match.start()}")
    if len(match.groups()) > 0:
        print("Capture Groups:", match.groups())`
}`;
      }

      case 'go': {
        // Go regex flavor has no case flags inline unless using (?i)
        const goPattern = flags.i ? `(?i)${pattern}` : pattern;
        return `// Go Implementation
package main

import (
\t"fmt"
\t"regexp"
)

func main() {
\tpattern := \`\u0060${goPattern.replace(/`/g, '` + "`" + `')}\`\u0060
\ttestString := ${JSON.stringify(testString)}

\tre := regexp.MustCompile(pattern)

\t${
    flags.g
      ? `// Find all matches
\tmatches := re.FindAllStringSubmatchIndex(testString, -1)
\tfor _, loc := range matches {
\t\tfmt.Printf("Found match: %q\\n", testString[loc[0]:loc[1]])
\t\tif len(loc) > 2 {
\t\t\tfor i := 1; i < len(loc)/2; i++ {
\t\t\t\tfmt.Printf("Group %d: %q\\n", i, testString[loc[2*i]:loc[2*i+1]])
\t\t\t}
\t\t}
\t}`
      : `// Find first match
\tloc := re.FindStringSubmatchIndex(testString)
\tif loc != nil {
\t\tfmt.Printf("Found match: %q\\n", testString[loc[0]:loc[1]])
\t\tif len(loc) > 2 {
\t\t\tfor i := 1; i < len(loc)/2; i++ {
\t\t\t\tfmt.Printf("Group %d: %q\\n", i, testString[loc[2*i]:loc[2*i+1]])
\t\t\t}
\t\t}
\t}`
  }
}`;
      }

      case 'rust': {
        const rustFlags = flags.i ? '(?i)' : '';
        return `// Rust Implementation
use regex::Regex;

fn main() {
    let pattern = r"${rustFlags}${pattern}";
    let test_string = ${JSON.stringify(testString)};

    let re = Regex::new(pattern).unwrap();

    ${
      flags.g
        ? `// Find all matches
    for mat in re.find_iter(test_string) {
        println!("Found match: '{}' at index {}", mat.as_str(), mat.start());
    }`
        : `// Find first match
    if let Some(mat) = re.find(test_string) {
        println!("Found match: '{}' at index {}", mat.as_str(), mat.start());
    }`
    }
}`;
      }
      default:
        return '';
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. Pattern & Flags Setup */}
      <div className="border border-border bg-muted/20 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex-1 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block font-mono">
              Regular Expression Pattern
            </span>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">/</span>
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="[a-z]+"
                className="pl-6 font-mono text-sm tracking-wide border-border bg-background text-foreground h-10 focus-visible:ring-ring focus-visible:border-border"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                /
                {Object.entries(flags)
                  .filter(([, active]) => active)
                  .map(([flag]) => flag)
                  .join('')}
              </span>
            </div>
          </div>
        </div>

        {/* Flag Checkboxes */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          {([
            { id: 'g', label: 'global (g)', desc: 'Match all occurrences' },
            { id: 'i', label: 'ignore case (i)', desc: 'Case-insensitive matching' },
            { id: 'm', label: 'multiline (m)', desc: 'Treat anchors ^ and $ as lines' },
            { id: 's', label: 'single line (s)', desc: 'Dot (.) matches newline' },
            { id: 'u', label: 'unicode (u)', desc: 'Full unicode support' }
          ] as const).map((flag) => (
            <label
              key={flag.id}
              title={flag.desc}
              className="flex items-center space-x-1.5 font-medium text-foreground cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={flags[flag.id]}
                onChange={() => toggleFlag(flag.id)}
                className="rounded border-border bg-background text-primary focus:ring-0 cursor-pointer h-3.5 w-3.5"
              />
              <span className="font-mono">{flag.label}</span>
            </label>
          ))}
        </div>

        {/* Syntax Error */}
        {error && (
          <div className="flex items-start bg-destructive/5 border border-destructive/20 p-3 rounded-lg text-destructive text-xs">
            <ShieldAlert className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
            <div className="font-mono">
              <span className="font-semibold block uppercase tracking-wider text-[10px] text-destructive/80 mb-0.5">
                Regex Compilation Error
              </span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Text Input & Live Highlight Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left: Raw Text Input */}
        <div className="border border-border bg-muted/10 rounded-lg p-4 flex flex-col justify-between flex-1">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center space-x-1.5 border-b border-border pb-2.5">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Sample Test Text</h3>
            </div>
            <textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Type or paste sample text here..."
              className="w-full flex-1 min-h-[140px] p-3 text-sm font-mono border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-ring focus:border-border select-text leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Right: Highlighted Visualizer Output */}
        <div className="border border-border bg-muted/10 rounded-lg p-4 flex flex-col justify-between flex-1">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <div className="flex items-center space-x-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Match Highlighter</h3>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border border-border bg-background text-muted-foreground">
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
            
            <div className="custom-scrollbar w-full flex-1 min-h-[140px] p-3 text-sm font-mono border border-border bg-background text-foreground rounded-lg overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
              {getHighlightedSpans().map((span, i) => {
                if (span.isMatch) {
                  return (
                    <span
                      key={i}
                      title={`Match #${(span.index ?? 0) + 1}`}
                      className="bg-sky-500/25 border-b-2 border-sky-500 text-foreground py-0.5 rounded-sm font-bold font-mono px-0.5 shadow-sm"
                    >
                      {span.text}
                    </span>
                  );
                }
                return <span key={i}>{span.text}</span>;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Capture Groups Inspector & Code Snippets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left: Match & Capture Groups Table */}
        <div className="border border-border bg-muted/10 rounded-lg p-4 flex flex-col justify-between flex-1">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center space-x-1.5 border-b border-border pb-2.5">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Capture Groups Inspector</h3>
            </div>

            {matches.length > 0 ? (
              <div className="custom-scrollbar flex-1 overflow-y-auto max-h-[220px]">
                <table className="w-full text-xs text-left border-collapse font-mono">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border bg-muted/30">
                      <th className="py-2 px-3 font-semibold w-16">Match</th>
                      <th className="py-2 px-3 font-semibold w-16">Index</th>
                      <th className="py-2 px-3 font-semibold">Value</th>
                      <th className="py-2 px-3 font-semibold">Capture Groups</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {matches.map((match, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-muted-foreground">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-muted-foreground">{match.index}</td>
                        <td className="py-2.5 px-3 text-foreground font-semibold">
                          <span className="bg-sky-500/10 px-1 py-0.5 rounded border border-sky-500/20 text-sky-600 dark:text-sky-400">
                            {match.matchText || '""'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {match.groups.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {match.groups.map((group, gIdx) => (
                                <div key={gIdx} className="flex items-center space-x-1">
                                  <span className="text-[10px] text-muted-foreground font-bold font-sans">${gIdx + 1}:</span>
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-semibold text-foreground border border-border">
                                    {group || '""'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="italic text-muted-foreground/60 text-[11px]">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-border rounded-lg bg-muted/20 flex-grow flex items-center justify-center">
                <p className="text-muted-foreground text-xs italic">
                  No active matches found.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Snippets Generator */}
        <div className="border border-border bg-muted/10 rounded-lg p-4 flex flex-col justify-between flex-1">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <div className="flex items-center space-x-1.5">
                <Code className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Code Generator</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground h-7 text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            {/* Language Selector */}
            <div className="flex gap-1 bg-muted/50 border border-border p-1 rounded">
              {([
                { id: 'js', label: 'JavaScript' },
                { id: 'python', label: 'Python' },
                { id: 'go', label: 'Go' },
                { id: 'rust', label: 'Rust' }
              ] as const).map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setActiveLang(lang.id)}
                  className={`flex-1 py-1 text-center text-xs font-semibold rounded select-none ${
                    activeLang === lang.id
                      ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Snippet Display */}
            <pre className="custom-scrollbar w-full flex-1 max-h-[160px] p-3 text-[11px] font-mono border border-border bg-background text-foreground rounded-lg overflow-auto leading-relaxed select-text">
              {getCodeSnippet()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
