import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  FileSpreadsheet,
  RefreshCw,
  Rows3,
  Table2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SourceFormat = 'auto' | 'csv' | 'tsv';
type OutputFormat = 'csv' | 'tsv' | 'json';

interface ParsedTable {
  rows: string[][];
  delimiter: ',' | '\t';
}

const SAMPLE_INPUT = `name,email,role,notes
"Ana Santos",ana@example.com,Admin,"Owns onboarding, ""VIP"" accounts"
"Miguel Cruz",miguel@example.com,Editor,"Prefers TSV exports
for bulk review"
"Jamie Lee",jamie@example.com,Viewer,"Last login: 2026-06-28"`;

function parseDelimited(text: string, delimiter: ',' | '\t') {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';

      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      continue;
    }

    field += char;
  }

  if (inQuotes) {
    return {
      rows: [],
      error: 'Unclosed quoted field detected. Check for a missing double quote.',
    };
  }

  row.push(field);

  const hasMeaningfulContent =
    row.length > 1 || row.some((cell) => cell.length > 0) || rows.length > 0;

  if (hasMeaningfulContent) {
    rows.push(row);
  }

  const cleanedRows = rows.filter(
    (currentRow, rowIndex) =>
      rowIndex !== rows.length - 1 ||
      currentRow.some((cell) => cell.length > 0) ||
      rows.length === 1,
  );

  return { rows: cleanedRows, error: null };
}

function scoreParsedRows(rows: string[][]) {
  if (!rows.length) return 0;

  const widths = rows.map((row) => row.length);
  const maxWidth = Math.max(...widths);
  const minWidth = Math.min(...widths);
  const multiColumnRows = widths.filter((width) => width > 1).length;

  return multiColumnRows * 4 + maxWidth - (maxWidth - minWidth);
}

function detectFormat(text: string): ParsedTable | null {
  const csv = parseDelimited(text, ',');
  const tsv = parseDelimited(text, '\t');

  if (csv.error && tsv.error) {
    return null;
  }

  if (!csv.error && tsv.error) {
    return { rows: csv.rows, delimiter: ',' };
  }

  if (!tsv.error && csv.error) {
    return { rows: tsv.rows, delimiter: '\t' };
  }

  const csvScore = scoreParsedRows(csv.rows);
  const tsvScore = scoreParsedRows(tsv.rows);

  return csvScore >= tsvScore
    ? { rows: csv.rows, delimiter: ',' }
    : { rows: tsv.rows, delimiter: '\t' };
}

function parseInput(text: string, format: SourceFormat) {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      parsed: null as ParsedTable | null,
      error: '',
    };
  }

  if (format === 'auto') {
    const detected = detectFormat(text);

    if (!detected) {
      return {
        parsed: null,
        error: 'Unable to parse the input as CSV or TSV.',
      };
    }

    return { parsed: detected, error: '' };
  }

  const delimiter: ',' | '\t' = format === 'csv' ? ',' : '\t';
  const result = parseDelimited(text, delimiter);

  if (result.error) {
    return { parsed: null, error: result.error };
  }

  return {
    parsed: { rows: result.rows, delimiter },
    error: '',
  };
}

function escapeDelimitedField(value: string, delimiter: ',' | '\t') {
  const needsQuotes =
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value.includes(delimiter) ||
    /^\s|\s$/.test(value);

  if (!needsQuotes) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function serializeDelimited(rows: string[][], delimiter: ',' | '\t') {
  return rows
    .map((row) =>
      row.map((cell) => escapeDelimitedField(cell, delimiter)).join(delimiter),
    )
    .join('\n');
}

function createUniqueHeaders(row: string[], columnCount: number) {
  const counts = new Map<string, number>();

  return Array.from({ length: columnCount }, (_, index) => {
    const rawHeader = row[index]?.trim() || `column_${index + 1}`;
    const count = counts.get(rawHeader) ?? 0;
    counts.set(rawHeader, count + 1);
    return count === 0 ? rawHeader : `${rawHeader}_${count + 1}`;
  });
}

function serializeJson(rows: string[][], useFirstRowAsHeader: boolean) {
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  const paddedRows = rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ''),
  );

  if (!useFirstRowAsHeader || paddedRows.length === 0) {
    return JSON.stringify(paddedRows, null, 2);
  }

  const headers = createUniqueHeaders(paddedRows[0], columnCount);
  const objects = paddedRows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])),
  );

  return JSON.stringify(objects, null, 2);
}

function delimiterLabel(delimiter: ',' | '\t') {
  return delimiter === ',' ? 'CSV' : 'TSV';
}

export function CsvTsvViewer() {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>('auto');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json');
  const [useFirstRowAsHeader, setUseFirstRowAsHeader] = useState(true);
  const [copied, setCopied] = useState(false);

  const { parsed, error } = useMemo(
    () => parseInput(input, sourceFormat),
    [input, sourceFormat],
  );

  const rowCount = parsed?.rows.length ?? 0;
  const columnCount = parsed
    ? Math.max(0, ...parsed.rows.map((row) => row.length))
    : 0;
  const raggedRows =
    parsed?.rows.some((row) => row.length !== columnCount) ?? false;

  const headers = useMemo(() => {
    if (!parsed || !parsed.rows.length) return [];

    const baseRow = useFirstRowAsHeader ? parsed.rows[0] : [];
    return createUniqueHeaders(baseRow, columnCount);
  }, [columnCount, parsed, useFirstRowAsHeader]);

  const previewRows = useMemo(() => {
    if (!parsed) return [];

    const rows =
      useFirstRowAsHeader ? parsed.rows.slice(1) : parsed.rows;

    return rows.slice(0, 12).map((row) =>
      Array.from({ length: columnCount }, (_, index) => row[index] ?? ''),
    );
  }, [columnCount, parsed, useFirstRowAsHeader]);

  const output = useMemo(() => {
    if (!parsed) return '';

    if (outputFormat === 'json') {
      return serializeJson(parsed.rows, useFirstRowAsHeader);
    }

    return serializeDelimited(parsed.rows, outputFormat === 'csv' ? ',' : '\t');
  }, [outputFormat, parsed, useFirstRowAsHeader]);

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error('Failed to copy converted output:', copyError);
    }
  };

  const handleClear = () => {
    setInput('');
    setCopied(false);
  };

  const handleSwapToOutput = () => {
    if (!output) return;

    setInput(output);
    setSourceFormat(outputFormat === 'json' ? 'auto' : outputFormat);
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="source-format" className="text-xs text-muted-foreground">
            Source format
          </Label>
          <Select
            value={sourceFormat}
            onValueChange={(value) => setSourceFormat(value as SourceFormat)}
          >
            <SelectTrigger
              id="source-format"
              className="w-full border-border bg-card text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto detect</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="tsv">TSV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="output-format" className="text-xs text-muted-foreground">
            Output format
          </Label>
          <Select
            value={outputFormat}
            onValueChange={(value) => setOutputFormat(value as OutputFormat)}
          >
            <SelectTrigger
              id="output-format"
              className="w-full border-border bg-card text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="tsv">TSV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <div className="flex h-8 w-full items-center justify-between rounded-md border border-border bg-card px-3">
            <div className="flex items-center gap-2">
              <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
              <Label
                htmlFor="header-row"
                className="text-xs text-muted-foreground"
              >
                First row is header
              </Label>
            </div>
            <Switch
              id="header-row"
              checked={useFirstRowAsHeader}
              onCheckedChange={setUseFirstRowAsHeader}
              size="sm"
            />
          </div>
        </div>

        <div className="flex items-end justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setInput(SAMPLE_INPUT)}
            className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Sample
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!input}
            className="border-border bg-card text-red-400 hover:bg-muted hover:text-red-300"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="delimited-input" className="text-sm text-foreground">
              Spreadsheet input
            </Label>
            <div className="text-[11px] font-mono text-muted-foreground">
              Paste CSV or TSV with quoted cells
            </div>
          </div>
          <textarea
            id="delimited-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (copied) setCopied(false);
            }}
            placeholder="Paste CSV or TSV data here..."
            className="min-h-72 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="converted-output" className="text-sm text-foreground">
              Converted output
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSwapToOutput}
                disabled={!output || outputFormat === 'json'}
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Use as input
              </Button>
              <Button
                variant="outline"
                onClick={handleCopy}
                disabled={!output}
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy output'}
              </Button>
            </div>
          </div>
          <textarea
            id="converted-output"
            value={output}
            readOnly
            placeholder="Converted output will appear here..."
            className="min-h-72 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Table preview
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Showing up to 12 rows with padded empty cells for uneven data.
              </p>
            </div>
            <Table2 className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="overflow-x-auto">
            {parsed && columnCount > 0 ? (
              <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/60">
                    {Array.from({ length: columnCount }, (_, index) => (
                      <th
                        key={headers[index] ?? `column-${index + 1}`}
                        className="border-r border-border px-3 py-2 font-mono font-semibold text-foreground last:border-r-0"
                      >
                        {useFirstRowAsHeader
                          ? headers[index]
                          : `Column ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length ? (
                    previewRows.map((row, rowIndex) => (
                      <tr
                        key={`${rowIndex}-${row.join('|')}`}
                        className="border-b border-border last:border-b-0"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${rowIndex}-${cellIndex}`}
                            className="border-r border-border px-3 py-2 align-top font-mono text-[11px] text-muted-foreground last:border-r-0"
                          >
                            {cell || <span className="text-muted-foreground/60">empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        No data rows to preview with the current header setting.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Paste spreadsheet data to preview it as a table.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card px-3 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Parse Stats
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Detected format</span>
                <span className="font-mono text-foreground">
                  {parsed ? delimiterLabel(parsed.delimiter) : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rows</span>
                <span className="font-mono text-foreground">{rowCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Columns</span>
                <span className="font-mono text-foreground">{columnCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">JSON mode</span>
                <span className="font-mono text-foreground">
                  {useFirstRowAsHeader ? 'Objects' : 'Arrays'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card px-3 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h3>
            <div className="mt-3 space-y-2 text-[12px] leading-normal text-muted-foreground">
              <p>Quoted fields support escaped double quotes and embedded line breaks.</p>
              <p>CSV and TSV exports are re-serialized safely before copy.</p>
              <p>
                {raggedRows
                  ? 'Some rows have uneven column counts. Empty cells are padded in the preview and JSON output.'
                  : 'Column counts are consistent across the parsed rows.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
