import { useState } from 'react';
import { Copy, Check, Shuffle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface RGB {
  r: number;
  g: number;
  b: number;
}
interface HSL {
  h: number;
  s: number;
  l: number;
}
interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

// --- Conversion Helpers ---

function rgbToHex({ r, g, b }: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function hexToRgb(hex: string): RGB | null {
  const cleanHex = hex.replace(/^#/, '').trim();
  if (cleanHex.length === 3) {
    const expanded = cleanHex
      .split('')
      .map((char) => char + char)
      .join('');
    const num = parseInt(expanded, 16);
    if (isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  if (cleanHex.length === 6) {
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  return null;
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  h /= 360;
  s /= 100;
  l /= 100;
  let r = l,
    g = l,
    b = l;
  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function rgbToCmyk({ r, g, b }: RGB): CMYK {
  r /= 255;
  g /= 255;
  b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

function cmykToRgb({ c, m, y, k }: CMYK): RGB {
  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;
  const r = Math.round(255 * (1 - c) * (1 - k));
  const g = Math.round(255 * (1 - m) * (1 - k));
  const b = Math.round(255 * (1 - y) * (1 - k));
  return { r, g, b };
}

// --- WCAG Contrast Helpers ---

function getLuminance({ r, g, b }: RGB): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(rgb1: RGB, rgb2: RGB): number {
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Helper to format contrast status
function getContrastStatus(ratio: number) {
  return {
    ratio: ratio.toFixed(2),
    aaNormal: ratio >= 4.5,
    aaaNormal: ratio >= 7.0,
    aaLarge: ratio >= 3.0,
    aaaLarge: ratio >= 4.5,
  };
}

export function ColorConverter() {
  const [hexVal, setHexVal] = useState('#3B82F6');
  const [rgbVal, setRgbVal] = useState('59, 130, 246');
  const [hslVal, setHslVal] = useState('217, 91%, 60%');
  const [cmykVal, setCmykVal] = useState('76, 47, 0, 4');

  const [activeColor, setActiveColor] = useState<RGB>({
    r: 59,
    g: 130,
    b: 246,
  });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Common sync helper to update inputs safely while typing
  const updateColorFromRgb = (
    rgb: RGB,
    skipHex = false,
    skipRgb = false,
    skipHsl = false,
    skipCmyk = false,
  ) => {
    setActiveColor(rgb);
    if (!skipHex) setHexVal(rgbToHex(rgb));
    if (!skipRgb) setRgbVal(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    const hsl = rgbToHsl(rgb);
    if (!skipHsl) setHslVal(`${hsl.h}, ${hsl.s}%, ${hsl.l}%`);
    const cmyk = rgbToCmyk(rgb);
    if (!skipCmyk) setCmykVal(`${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`);
  };

  const handleHexChange = (val: string) => {
    setHexVal(val);
    const rgb = hexToRgb(val);
    if (rgb) {
      updateColorFromRgb(rgb, true, false, false, false);
    }
  };

  const handleRgbChange = (val: string) => {
    setRgbVal(val);
    const match = val.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/);
    if (match) {
      const r = Math.min(255, parseInt(match[1], 10));
      const g = Math.min(255, parseInt(match[2], 10));
      const b = Math.min(255, parseInt(match[3], 10));
      updateColorFromRgb({ r, g, b }, false, true, false, false);
    }
  };

  const handleHslChange = (val: string) => {
    setHslVal(val);
    const match = val.match(/^(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?$/);
    if (match) {
      const h = Math.min(360, parseInt(match[1], 10));
      const s = Math.min(100, parseInt(match[2], 10));
      const l = Math.min(100, parseInt(match[3], 10));
      updateColorFromRgb(hslToRgb({ h, s, l }), false, false, true, false);
    }
  };

  const handleCmykChange = (val: string) => {
    setCmykVal(val);
    const match = val.match(
      /^(\d+)%?\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*,\s*(\d+)%?$/,
    );
    if (match) {
      const c = Math.min(100, parseInt(match[1], 10));
      const m = Math.min(100, parseInt(match[2], 10));
      const y = Math.min(100, parseInt(match[3], 10));
      const k = Math.min(100, parseInt(match[4], 10));
      updateColorFromRgb(cmykToRgb({ c, m, y, k }), false, false, false, true);
    }
  };

  const handleRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    updateColorFromRgb({ r, g, b });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 1500);
    } catch (err) {
      console.error('Failed to copy color value:', err);
    }
  };

  // Contrast Status against Black & White
  const whiteContrast = getContrastStatus(
    getContrastRatio(activeColor, { r: 255, g: 255, b: 255 }),
  );
  const blackContrast = getContrastStatus(
    getContrastRatio(activeColor, { r: 0, g: 0, b: 0 }),
  );

  // Color Harmonies
  const activeHsl = rgbToHsl(activeColor);

  const harmonies = [
    {
      title: 'Complementary',
      description: 'Hues directly opposite on the color wheel (180° offset).',
      swatches: [activeHsl, { ...activeHsl, h: (activeHsl.h + 180) % 360 }]
        .map(hslToRgb)
        .map(rgbToHex),
    },
    {
      title: 'Analogous',
      description: 'Hues closely adjacent on the wheel (15° to 30° offsets).',
      swatches: [
        { ...activeHsl, h: (activeHsl.h - 30 + 360) % 360 },
        { ...activeHsl, h: (activeHsl.h - 15 + 360) % 360 },
        activeHsl,
        { ...activeHsl, h: (activeHsl.h + 15) % 360 },
        { ...activeHsl, h: (activeHsl.h + 30) % 360 },
      ]
        .map(hslToRgb)
        .map(rgbToHex),
    },
    {
      title: 'Triadic',
      description: 'Three hues evenly distributed on the wheel (120° offsets).',
      swatches: [
        activeHsl,
        { ...activeHsl, h: (activeHsl.h + 120) % 360 },
        { ...activeHsl, h: (activeHsl.h + 240) % 360 },
      ]
        .map(hslToRgb)
        .map(rgbToHex),
    },
    {
      title: 'Monochromatic',
      description: 'Varying saturation and lightness within the same hue.',
      swatches: [
        { ...activeHsl, l: Math.max(activeHsl.l - 30, 10) },
        {
          ...activeHsl,
          s: Math.max(activeHsl.s - 20, 10),
          l: Math.max(activeHsl.l - 15, 15),
        },
        activeHsl,
        {
          ...activeHsl,
          s: Math.min(activeHsl.s + 15, 100),
          l: Math.min(activeHsl.l + 15, 85),
        },
        { ...activeHsl, l: Math.min(activeHsl.l + 30, 90) },
      ]
        .map(hslToRgb)
        .map(rgbToHex),
    },
    {
      title: 'Split-Complementary',
      description:
        'Base hue plus the two hues adjacent to its complementary color (150° and 210° offsets).',
      swatches: [
        activeHsl,
        { ...activeHsl, h: (activeHsl.h + 150) % 360 },
        { ...activeHsl, h: (activeHsl.h + 210) % 360 },
      ]
        .map(hslToRgb)
        .map(rgbToHex),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
        <span className="text-zinc-400 text-xs font-mono">
          Convert color codes, test readability contrast, and copy palettes.
        </span>
        <Button
          variant="outline"
          onClick={handleRandomColor}
          className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-8"
        >
          <Shuffle className="h-3.5 w-3.5 mr-1.5" />
          Random Color
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Color Inputs & Accessibility (lg:span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Color Preview, Picker & HSL Adjusters */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-4">
              <div
                className="w-24 h-24 rounded-lg shadow-inner border border-zinc-800 shrink-0 transition-colors duration-200"
                style={{ backgroundColor: hexVal }}
              />
              <div className="space-y-2 flex-1">
                <Label
                  htmlFor="color-picker"
                  className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono"
                >
                  Color Picker
                </Label>
                <div className="flex space-x-2">
                  <input
                    id="color-picker"
                    type="color"
                    value={
                      hexVal.startsWith('#') && hexVal.length === 7
                        ? hexVal
                        : '#3B82F6'
                    }
                    onChange={(e) => handleHexChange(e.target.value)}
                    className="w-10 h-8 rounded border border-zinc-850 bg-zinc-900 cursor-pointer p-0"
                  />
                  <div className="text-xs font-mono text-zinc-300 flex items-center justify-center border border-zinc-800 bg-zinc-900/50 rounded px-2.5 flex-1 font-semibold">
                    {hexVal}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-4 space-y-3">
              <span className="text-zinc-500 text-[10px] font-mono font-semibold uppercase tracking-wider block">
                Interactive Adjustments (HSL)
              </span>

              {/* Hue Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>Hue</span>
                  <span>{activeHsl.h}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={activeHsl.h}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10);
                    const rgb = hslToRgb({ h, s: activeHsl.s, l: activeHsl.l });
                    updateColorFromRgb(rgb);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-800 [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-100 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-zinc-800 [&::-moz-range-thumb]:shadow-lg"
                  style={{
                    background:
                      'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  }}
                />
              </div>

              {/* Saturation Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>Saturation</span>
                  <span>{activeHsl.s}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeHsl.s}
                  onChange={(e) => {
                    const s = parseInt(e.target.value, 10);
                    const rgb = hslToRgb({ h: activeHsl.h, s, l: activeHsl.l });
                    updateColorFromRgb(rgb);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-800 [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-100 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-zinc-800 [&::-moz-range-thumb]:shadow-lg"
                  style={{
                    background: `linear-gradient(to right, hsl(${activeHsl.h}, 0%, ${activeHsl.l}%), hsl(${activeHsl.h}, 100%, ${activeHsl.l}%))`,
                  }}
                />
              </div>

              {/* Lightness Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>Lightness</span>
                  <span>{activeHsl.l}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeHsl.l}
                  onChange={(e) => {
                    const l = parseInt(e.target.value, 10);
                    const rgb = hslToRgb({ h: activeHsl.h, s: activeHsl.s, l });
                    updateColorFromRgb(rgb);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-800 [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-100 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-zinc-800 [&::-moz-range-thumb]:shadow-lg"
                  style={{
                    background: `linear-gradient(to right, #000000, hsl(${activeHsl.h}, ${activeHsl.s}%, 50%), #ffffff)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Code Formats Inputs */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 space-y-4">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono block border-b border-zinc-900 pb-2">
              Color Formats
            </span>

            {/* HEX Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="hex-input"
                  className="text-zinc-400 text-xs font-medium font-mono"
                >
                  HEX
                </Label>
                <button
                  onClick={() => copyToClipboard(hexVal, 'hex')}
                  className="text-zinc-500 hover:text-zinc-200 p-0.5"
                  title="Copy HEX"
                >
                  {copiedText === 'hex' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <input
                id="hex-input"
                type="text"
                value={hexVal}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            {/* RGB Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="rgb-input"
                  className="text-zinc-400 text-xs font-medium font-mono"
                >
                  RGB (R, G, B)
                </Label>
                <button
                  onClick={() => copyToClipboard(`rgb(${rgbVal})`, 'rgb')}
                  className="text-zinc-500 hover:text-zinc-200 p-0.5"
                  title="Copy RGB"
                >
                  {copiedText === 'rgb' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <input
                id="rgb-input"
                type="text"
                value={rgbVal}
                onChange={(e) => handleRgbChange(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            {/* HSL Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="hsl-input"
                  className="text-zinc-400 text-xs font-medium font-mono"
                >
                  HSL (H, S%, L%)
                </Label>
                <button
                  onClick={() => copyToClipboard(`hsl(${hslVal})`, 'hsl')}
                  className="text-zinc-500 hover:text-zinc-200 p-0.5"
                  title="Copy HSL"
                >
                  {copiedText === 'hsl' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <input
                id="hsl-input"
                type="text"
                value={hslVal}
                onChange={(e) => handleHslChange(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            {/* CMYK Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="cmyk-input"
                  className="text-zinc-400 text-xs font-medium font-mono"
                >
                  CMYK (C, M, Y, K)
                </Label>
                <button
                  onClick={() => copyToClipboard(`cmyk(${cmykVal})`, 'cmyk')}
                  className="text-zinc-500 hover:text-zinc-200 p-0.5"
                  title="Copy CMYK"
                >
                  {copiedText === 'cmyk' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <input
                id="cmyk-input"
                type="text"
                value={cmykVal}
                onChange={(e) => handleCmykChange(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>

          {/* WCAG Contrast Ratio Checker */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 space-y-4">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono block border-b border-zinc-900 pb-2">
              WCAG 2.1 Contrast Check
            </span>
            <div className="grid grid-cols-2 gap-4">
              {/* White Text Contrast */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    vs White (#FFF)
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    {whiteContrast.ratio}:1
                  </span>
                </div>
                <div
                  className="h-10 rounded text-xs font-semibold flex items-center justify-center border border-zinc-800 transition-colors"
                  style={{ backgroundColor: hexVal, color: '#FFFFFF' }}
                >
                  White Text
                </div>
                <div className="space-y-1 pt-1 border-t border-zinc-900/60 text-[10px] font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Normal Text</span>
                    {whiteContrast.aaNormal ? (
                      <span className="text-emerald-400 flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> AA
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center">
                        <XCircle className="h-3 w-3 mr-0.5" /> Fail
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Large Text</span>
                    {whiteContrast.aaaNormal ? (
                      <span className="text-emerald-400 flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> AAA
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center">
                        <XCircle className="h-3 w-3 mr-0.5" /> Fail
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Black Text Contrast */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    vs Black (#000)
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    {blackContrast.ratio}:1
                  </span>
                </div>
                <div
                  className="h-10 rounded text-xs font-semibold flex items-center justify-center border border-zinc-800 transition-colors"
                  style={{ backgroundColor: hexVal, color: '#000000' }}
                >
                  Black Text
                </div>
                <div className="space-y-1 pt-1 border-t border-zinc-900/60 text-[10px] font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Normal Text</span>
                    {blackContrast.aaNormal ? (
                      <span className="text-emerald-400 flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> AA
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center">
                        <XCircle className="h-3 w-3 mr-0.5" /> Fail
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Large Text</span>
                    {blackContrast.aaaNormal ? (
                      <span className="text-emerald-400 flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> AAA
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center">
                        <XCircle className="h-3 w-3 mr-0.5" /> Fail
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Color Harmonies / Palettes (lg:span-7) */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-lg p-5 space-y-6 h-162.5 overflow-y-auto pr-1">
          <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono block border-b border-zinc-900 pb-2">
            Harmonic Palettes
          </span>

          <div className="space-y-6">
            {harmonies.map((harmony, harmonyIdx) => (
              <div
                key={harmonyIdx}
                className="space-y-3 border-b border-zinc-900 pb-5 last:border-b-0 last:pb-0"
              >
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 font-mono">
                    {harmony.title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                    {harmony.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {harmony.swatches.map((swatchHex, swatchIdx) => (
                    <div
                      key={swatchIdx}
                      className="bg-zinc-900/40 border border-zinc-850 rounded-lg p-2 flex flex-col space-y-2 group relative transition-all duration-200 hover:border-zinc-750"
                    >
                      {/* Swatch color block */}
                      <div
                        onClick={() =>
                          copyToClipboard(
                            swatchHex,
                            `swatch-${harmonyIdx}-${swatchIdx}`,
                          )
                        }
                        className="w-full h-14 rounded-md border border-zinc-950/40 relative shadow-inner cursor-pointer"
                        style={{ backgroundColor: swatchHex }}
                        title="Click to copy HEX"
                      >
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                          <span className="text-[9px] font-bold text-white font-mono bg-zinc-900/90 px-1.5 py-0.5 rounded shadow">
                            {copiedText === `swatch-${harmonyIdx}-${swatchIdx}`
                              ? 'Copied!'
                              : 'Copy'}
                          </span>
                        </div>
                      </div>

                      {/* Info & Set-As-Base Control */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-300 font-bold">
                          {swatchHex}
                        </span>
                        <button
                          onClick={() => handleHexChange(swatchHex)}
                          className="text-zinc-500 hover:text-zinc-200 transition-colors p-0.5 rounded hover:bg-zinc-800"
                          title="Set as base color"
                        >
                          <Shuffle className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
