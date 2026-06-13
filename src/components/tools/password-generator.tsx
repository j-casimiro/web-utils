import { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate initial password state synchronously on mount
  const [password, setPassword] = useState(() => {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:',./<>?";
    let result = '';
    for (let i = 0; i < 16; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      result += charset[randomIndex];
    }
    return result;
  });

  const generatePassword = (
    len: number,
    up: boolean,
    low: boolean,
    num: boolean,
    sym: boolean,
  ) => {
    let charset = '';
    if (up) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (low) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (num) charset += '0123456789';
    if (sym) charset += "!@#$%^&*()_+-=[]{}|;:',./<>?";

    if (!charset) {
      setPassword('');
      return;
    }

    let result = '';
    for (let i = 0; i < len; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      result += charset[randomIndex];
    }
    setPassword(result);
    setCopied(false);
  };

  const handleRegenerate = () => {
    generatePassword(length, uppercase, lowercase, numbers, symbols);
  };

  const handleLengthChange = (val: number[]) => {
    const newLen = val[0];
    setLength(newLen);
    generatePassword(newLen, uppercase, lowercase, numbers, symbols);
  };

  const handleUppercaseChange = (checked: boolean) => {
    setUppercase(checked);
    generatePassword(length, checked, lowercase, numbers, symbols);
  };

  const handleLowercaseChange = (checked: boolean) => {
    setLowercase(checked);
    generatePassword(length, uppercase, checked, numbers, symbols);
  };

  const handleNumbersChange = (checked: boolean) => {
    setNumbers(checked);
    generatePassword(length, uppercase, lowercase, checked, symbols);
  };

  const handleSymbolsChange = (checked: boolean) => {
    setSymbols(checked);
    generatePassword(length, uppercase, lowercase, numbers, checked);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Password strength logic
  const getStrength = () => {
    if (!password)
      return { label: 'None', color: 'text-zinc-500', bg: 'bg-zinc-800' };

    let activeOptions = 0;
    if (uppercase) activeOptions++;
    if (lowercase) activeOptions++;
    if (numbers) activeOptions++;
    if (symbols) activeOptions++;

    const score = length * 0.75 + activeOptions * 2;

    if (length < 8 || activeOptions <= 1) {
      return {
        label: 'Weak',
        color: 'text-red-400',
        bg: 'bg-red-950/50 border-red-800',
      };
    }
    if (score < 14) {
      return {
        label: 'Medium',
        color: 'text-orange-400',
        bg: 'bg-orange-950/50 border-orange-800',
      };
    }
    if (score < 20) {
      return {
        label: 'Strong',
        color: 'text-green-400',
        bg: 'bg-green-950/50 border-green-800',
      };
    }
    return {
      label: 'Very Strong',
      color: 'text-cyan-400',
      bg: 'bg-cyan-950/50 border-cyan-800',
    };
  };

  const strength = getStrength();

  return (
    <div className="space-y-6">
      {/* Password Display Field */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            value={password}
            readOnly
            className="pr-12 font-mono text-lg py-6 border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Generated password..."
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRegenerate}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 h-8 w-8"
              title="Regenerate"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          onClick={copyToClipboard}
          disabled={!password}
          className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 py-6"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* Strength Indicator */}
      {password && (
        <div
          className={`flex items-center justify-between p-3 border rounded-lg ${strength.bg}`}
        >
          <span className="text-sm text-zinc-400">Password Strength</span>
          <span
            className={`text-sm font-semibold uppercase tracking-wider ${strength.color}`}
          >
            {strength.label}
          </span>
        </div>
      )}

      {/* Options Panel */}
      <div className="space-y-6 pt-2">
        {/* Length Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-zinc-300 text-sm font-medium">
              Password Length
            </Label>
            <span className="text-zinc-100 font-mono font-bold text-sm bg-zinc-850 px-2 py-0.5 rounded border border-zinc-800">
              {length}
            </span>
          </div>
          <Slider
            value={[length]}
            onValueChange={handleLengthChange}
            min={8}
            max={32}
            step={1}
            className="py-2"
          />
        </div>

        {/* Character Switches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/30 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="uppercase" className="text-zinc-200">
                Uppercase Letters
              </Label>
              <p className="text-xs text-zinc-500 font-mono">A-Z</p>
            </div>
            <Switch
              id="uppercase"
              checked={uppercase}
              onCheckedChange={handleUppercaseChange}
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/30 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="lowercase" className="text-zinc-200">
                Lowercase Letters
              </Label>
              <p className="text-xs text-zinc-500 font-mono">a-z</p>
            </div>
            <Switch
              id="lowercase"
              checked={lowercase}
              onCheckedChange={handleLowercaseChange}
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/30 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="numbers" className="text-zinc-200">
                Include Numbers
              </Label>
              <p className="text-xs text-zinc-500 font-mono">0-9</p>
            </div>
            <Switch
              id="numbers"
              checked={numbers}
              onCheckedChange={handleNumbersChange}
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/30 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="symbols" className="text-zinc-200">
                Include Symbols
              </Label>
              <p className="text-xs text-zinc-500 font-mono">!@#$%^&*</p>
            </div>
            <Switch
              id="symbols"
              checked={symbols}
              onCheckedChange={handleSymbolsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
