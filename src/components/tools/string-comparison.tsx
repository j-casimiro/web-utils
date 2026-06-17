import { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DiffChar {
  char: string;
  type: 'match' | 'added' | 'removed';
}

export function StringComparison() {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [hasCompared, setHasCompared] = useState(false);
  const [leftDiff, setLeftDiff] = useState<DiffChar[]>([]);
  const [rightDiff, setRightDiff] = useState<DiffChar[]>([]);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);

  const handleCompare = () => {
    setHasCompared(true);

    // Quick optimization: if identical, avoid LCS computation
    if (leftText === rightText) {
      setLeftDiff(leftText.split('').map((c) => ({ char: c, type: 'match' })));
      setRightDiff(
        rightText.split('').map((c) => ({ char: c, type: 'match' })),
      );
      setDiscrepancyCount(0);
      return;
    }

    const m = leftText.length;
    const n = rightText.length;

    // Dynamic Programming matrix for Longest Common Subsequence (LCS)
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (leftText[i - 1] === rightText[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to build the diff representation
    let i = m;
    let j = n;
    const leftAccumulator: DiffChar[] = [];
    const rightAccumulator: DiffChar[] = [];
    let discrepancies = 0;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && leftText[i - 1] === rightText[j - 1]) {
        leftAccumulator.unshift({ char: leftText[i - 1], type: 'match' });
        rightAccumulator.unshift({ char: rightText[j - 1], type: 'match' });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        rightAccumulator.unshift({ char: rightText[j - 1], type: 'added' });
        discrepancies++;
        j--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
        leftAccumulator.unshift({ char: leftText[i - 1], type: 'removed' });
        discrepancies++;
        i--;
      }
    }

    setLeftDiff(leftAccumulator);
    setRightDiff(rightAccumulator);
    setDiscrepancyCount(discrepancies);
  };

  const handleClear = () => {
    setLeftText('');
    setRightText('');
    setLeftDiff([]);
    setRightDiff([]);
    setDiscrepancyCount(0);
    setHasCompared(false);
  };

  return (
    <div className="space-y-6">
      {/* Side-by-side Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="left-input" className="text-zinc-300">
            Original Text (Left)
          </Label>
          <textarea
            id="left-input"
            value={leftText}
            onChange={(e) => {
              setLeftText(e.target.value);
              setHasCompared(false);
            }}
            placeholder="Enter original text..."
            className="flex min-h-32 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="right-input" className="text-zinc-300">
            Modified Text (Right)
          </Label>
          <textarea
            id="right-input"
            value={rightText}
            onChange={(e) => {
              setRightText(e.target.value);
              setHasCompared(false);
            }}
            placeholder="Enter compared text..."
            className="flex min-h-32 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
          />
        </div>
      </div>

      {/* Center Compare Buttons */}
      <div className="flex justify-center space-x-2">
        <Button
          onClick={handleCompare}
          disabled={!leftText.trim() || !rightText.trim()}
          className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none"
        >
          Compare Text
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Reset
        </Button>
      </div>

      {/* Comparison Results */}
      {hasCompared && (
        <div className="space-y-6 pt-2">
          {/* Notification banner */}
          {discrepancyCount === 0 ? (
            <div className="flex items-center space-x-2 p-3 border border-green-800/50 bg-green-950/20 text-green-400 text-sm rounded-md">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Strings are identical. No discrepancies found.</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-3 border border-red-800/50 bg-red-950/20 text-red-400 text-sm rounded-md">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Discrepancy found: <strong>{discrepancyCount}</strong>{' '}
                difference{discrepancyCount > 1 ? 's' : ''} detected.
              </span>
            </div>
          )}

          {/* Highlighted diff visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">
                Diff Highlights (Left)
              </Label>
              <div className="w-full min-h-32 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono whitespace-pre-wrap break-all overflow-y-auto">
                {leftDiff.map((item, idx) => (
                  <span
                    key={idx}
                    className={
                      item.type === 'removed'
                        ? 'bg-red-950 text-red-300 border border-red-900/50 px-0.5 rounded-xs font-bold'
                        : 'text-zinc-100'
                    }
                  >
                    {item.char}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">
                Diff Highlights (Right)
              </Label>
              <div className="w-full min-h-32 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono whitespace-pre-wrap break-all overflow-y-auto">
                {rightDiff.map((item, idx) => (
                  <span
                    key={idx}
                    className={
                      item.type === 'added'
                        ? 'bg-green-950 text-green-300 border border-green-900/50 px-0.5 rounded-xs font-bold'
                        : 'text-zinc-100'
                    }
                  >
                    {item.char}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
