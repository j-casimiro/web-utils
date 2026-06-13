import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function QRGenerator() {
  const [text, setText] = useState('https://github.com');
  const [size, setSize] = useState('256');
  const [fgColor, setFgColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#09090b'); // zinc-950
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!text || !canvasRef.current) return;

    const generateQR = async () => {
      try {
        const options = {
          width: parseInt(size),
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        };
        await QRCode.toCanvas(canvasRef.current, text, options);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQR();
  }, [text, size, fgColor, bgColor]);

  const downloadQR = () => {
    if (!canvasRef.current || !text) return;
    try {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading QR code:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="qr-text" className="text-zinc-300">
            Text or URL
          </Label>
          <Input
            id="qr-text"
            placeholder="Type text or paste URL..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 focus-visible:ring-zinc-700 focus-visible:border-zinc-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="qr-size" className="text-zinc-300">
              Size (px)
            </Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger
                id="qr-size"
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              >
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="128">128 x 128</SelectItem>
                <SelectItem value="256">256 x 256</SelectItem>
                <SelectItem value="384">384 x 384</SelectItem>
                <SelectItem value="512">512 x 512</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Reset Defaults</Label>
            <Button
              variant="outline"
              onClick={() => {
                setText('https://github.com');
                setFgColor('#ffffff');
                setBgColor('#09090b');
                setSize('256');
              }}
              className="w-full border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fg-color" className="text-zinc-300">
              Foreground Color
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                id="fg-color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="h-10 w-12 cursor-pointer border-zinc-800 bg-zinc-900 p-1 rounded"
              />
              <span className="text-xs text-zinc-400 font-mono uppercase">
                {fgColor}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bg-color" className="text-zinc-300">
              Background Color
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                id="bg-color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-10 w-12 cursor-pointer border-zinc-800 bg-zinc-900 p-1 rounded"
              />
              <span className="text-xs text-zinc-400 font-mono uppercase">
                {bgColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 min-h-75 bg-zinc-900/10">
        {text ? (
          <div className="space-y-6 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              className="rounded-sm border border-border max-w-full"
              style={{ width: '200px', height: '200px' }}
            />

            <Button
              onClick={downloadQR}
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
            >
              <Download className="mr-2 h-4 w-4" /> Download PNG
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-zinc-500">
            Enter text on the left to generate QR Code
          </p>
        )}
      </div>
    </div>
  );
}
