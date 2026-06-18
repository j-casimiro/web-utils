import { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const LOREM_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'ut',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'ut',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'dolor',
  'in',
  'reprehenderit',
  'in',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'dolore',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'in',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
];

function generateWords(count: number, startWithLorem: boolean): string[] {
  const words: string[] = [];
  if (startWithLorem && count > 0) {
    const prefix = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];
    for (let i = 0; i < Math.min(count, prefix.length); i++) {
      words.push(prefix[i]);
    }
  }
  while (words.length < count) {
    const randomIndex = Math.floor(Math.random() * LOREM_WORDS.length);
    words.push(LOREM_WORDS[randomIndex]);
  }
  return words;
}

function generateSentence(startWithLorem: boolean): string {
  const length = Math.floor(Math.random() * 8) + 6; // 6 to 13 words
  const words = generateWords(length, startWithLorem);
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ') + '.';
}

function generateParagraph(startWithLorem: boolean): string {
  const length = Math.floor(Math.random() * 5) + 4; // 4 to 8 sentences
  const sentences: string[] = [];
  for (let i = 0; i < length; i++) {
    sentences.push(generateSentence(i === 0 && startWithLorem));
  }
  return sentences.join(' ');
}

function doGenerateText(
  type: 'paragraphs' | 'sentences' | 'words' | 'list',
  quantity: number,
  startWithLorem: boolean,
  wrapper: 'plain' | 'html',
  listType: 'ul' | 'ol',
): string {
  if (quantity < 1) return '';

  if (type === 'words') {
    const words = generateWords(quantity, startWithLorem);
    if (wrapper === 'plain') {
      return words.join(' ');
    } else {
      return words.map((w) => `<span>${w}</span>`).join(' ');
    }
  }

  if (type === 'sentences') {
    const sentences: string[] = [];
    for (let i = 0; i < quantity; i++) {
      sentences.push(generateSentence(i === 0 && startWithLorem));
    }
    if (wrapper === 'plain') {
      return sentences.join(' ');
    } else {
      return sentences.map((s) => `<p>${s}</p>`).join('\n');
    }
  }

  if (type === 'paragraphs') {
    const paragraphs: string[] = [];
    for (let i = 0; i < quantity; i++) {
      paragraphs.push(generateParagraph(i === 0 && startWithLorem));
    }
    if (wrapper === 'plain') {
      return paragraphs.join('\n\n');
    } else {
      return paragraphs.map((p) => `<p>${p}</p>`).join('\n');
    }
  }

  if (type === 'list') {
    const items: string[] = [];
    for (let i = 0; i < quantity; i++) {
      const wordsCount = Math.floor(Math.random() * 5) + 5; // 5 to 9 words
      const words = generateWords(wordsCount, i === 0 && startWithLorem);
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      items.push(words.join(' ') + '.');
    }
    if (wrapper === 'plain') {
      const getPrefix =
        listType === 'ol' ? (idx: number) => `${idx + 1}. ` : () => '• ';
      return items.map((item, idx) => `${getPrefix(idx)}${item}`).join('\n');
    } else {
      const listItems = items.map((item) => `  <li>${item}</li>`).join('\n');
      return `<${listType}>\n${listItems}\n</${listType}>`;
    }
  }

  return '';
}

export function LoremGenerator() {
  const [type, setType] = useState<
    'paragraphs' | 'sentences' | 'words' | 'list'
  >('paragraphs');
  const [quantity, setQuantity] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [wrapper, setWrapper] = useState<'plain' | 'html'>('plain');
  const [listType, setListType] = useState<'ul' | 'ol'>('ul');
  const [copied, setCopied] = useState(false);

  // Initialize generatedText state lazily on mount
  const [generatedText, setGeneratedText] = useState(() => {
    return doGenerateText('paragraphs', 3, true, 'plain', 'ul');
  });

  const updateText = (
    newType: 'paragraphs' | 'sentences' | 'words' | 'list',
    newQuantity: number,
    newStartWithLorem: boolean,
    newWrapper: 'plain' | 'html',
    newListType: 'ul' | 'ol',
  ) => {
    const text = doGenerateText(
      newType,
      newQuantity,
      newStartWithLorem,
      newWrapper,
      newListType,
    );
    setGeneratedText(text);
  };

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerate = () => {
    updateText(type, quantity, startWithLorem, wrapper, listType);
  };

  const maxQuantity = type === 'words' ? 250 : type === 'sentences' ? 50 : 20;

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-zinc-950 p-6 border border-zinc-800 rounded-lg">
        {/* Type Selection */}
        <div className="space-y-2">
          <Label
            htmlFor="type-select"
            className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono"
          >
            Generate Type
          </Label>
          <select
            id="type-select"
            value={type}
            onChange={(e) => {
              const newType = e.target.value as
                | 'paragraphs'
                | 'sentences'
                | 'words'
                | 'list';
              setType(newType);
              let newQty: number;
              if (newType === 'words') {
                newQty = Math.min(quantity, 250);
              } else if (newType === 'sentences') {
                newQty = Math.min(quantity, 50);
              } else {
                newQty = Math.min(quantity, 20);
              }
              setQuantity(newQty);
              updateText(newType, newQty, startWithLorem, wrapper, listType);
            }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 h-8 font-mono"
          >
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
            <option value="list">List Items</option>
          </select>
        </div>

        {/* Quantity Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono">
              Amount
            </Label>
            <span className="text-xs font-mono text-zinc-300 font-bold">
              {quantity}
            </span>
          </div>
          <div className="pt-2">
            <Slider
              value={[quantity]}
              onValueChange={(val) => {
                const newQty = val[0];
                setQuantity(newQty);
                updateText(type, newQty, startWithLorem, wrapper, listType);
              }}
              max={maxQuantity}
              min={1}
              step={1}
            />
          </div>
        </div>

        {/* Formatting/Wrapper Selector */}
        <div className="space-y-2">
          <Label
            htmlFor="wrapper-select"
            className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono"
          >
            Format Wrapper
          </Label>
          <select
            id="wrapper-select"
            value={wrapper}
            onChange={(e) => {
              const newWrapper = e.target.value as 'plain' | 'html';
              setWrapper(newWrapper);
              updateText(type, quantity, startWithLorem, newWrapper, listType);
            }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 h-8 font-mono"
          >
            <option value="plain">Plain Text</option>
            <option value="html">HTML Code</option>
          </select>
        </div>

        {/* List type selection or Switch option */}
        <div className="space-y-2 flex flex-col justify-end">
          {type === 'list' ? (
            <div className="space-y-2">
              <Label
                htmlFor="list-type-select"
                className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono"
              >
                List Tag
              </Label>
              <select
                id="list-type-select"
                value={listType}
                onChange={(e) => {
                  const newListType = e.target.value as 'ul' | 'ol';
                  setListType(newListType);
                  updateText(
                    type,
                    quantity,
                    startWithLorem,
                    wrapper,
                    newListType,
                  );
                }}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 h-8 font-mono"
              >
                <option value="ul">Unordered (&lt;ul&gt;)</option>
                <option value="ol">Ordered (&lt;ol&gt;)</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/80 p-2.5 rounded h-8">
              <Label
                htmlFor="prefix-switch"
                className="text-zinc-400 text-[11px] font-mono leading-none"
              >
                Start with 'Lorem ipsum'
              </Label>
              <Switch
                id="prefix-switch"
                checked={startWithLorem}
                onCheckedChange={(checked) => {
                  setStartWithLorem(checked);
                  updateText(type, quantity, checked, wrapper, listType);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Output / Preview Box */}
      <div className="space-y-2 flex flex-col h-100">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono">
            Generated Output Preview
          </span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-7 px-2.5"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!generatedText}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-7 px-2.5"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="flex-1 w-full rounded-md border border-zinc-800 bg-zinc-950 p-4 relative overflow-auto font-mono text-xs select-text leading-relaxed">
          {generatedText ? (
            <pre className="whitespace-pre-wrap text-zinc-300 select-text font-mono">
              {generatedText}
            </pre>
          ) : (
            <span className="text-zinc-600 italic">
              Adjust options above to generate dummy text...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
