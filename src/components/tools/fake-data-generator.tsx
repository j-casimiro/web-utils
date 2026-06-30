import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  GripVertical,
  Plus,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
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

type OutputFormat = 'json' | 'csv' | 'sql' | 'xml';
type FieldCategory =
  | 'Identity'
  | 'Contact'
  | 'Business'
  | 'Location'
  | 'Network'
  | 'Commerce'
  | 'Content'
  | 'System';

interface FieldDefinition {
  key: string;
  label: string;
  category: FieldCategory;
  generate: (context: RowContext) => string;
}

interface RowContext {
  index: number;
  seed: number;
  firstName: string;
  lastName: string;
  emailDomain: string;
  company: string;
  city: string;
  state: string;
  country: string;
}

const FIRST_NAMES = [
  'Ava',
  'Liam',
  'Mia',
  'Noah',
  'Sofia',
  'Elijah',
  'Isla',
  'Mason',
  'Harper',
  'Lucas',
  'Camila',
  'Ethan',
  'Amara',
  'Leo',
  'Nina',
  'Kai',
  'Zoe',
  'Julian',
  'Mila',
  'Owen',
];

const LAST_NAMES = [
  'Santos',
  'Reyes',
  'Cruz',
  'Garcia',
  'Nguyen',
  'Patel',
  'Morgan',
  'Bennett',
  'Kim',
  'Rivera',
  'Torres',
  'Campbell',
  'Diaz',
  'Ahmed',
  'Walker',
  'Price',
  'Tan',
  'Brooks',
  'Ross',
  'Flores',
];

const CITIES = [
  ['Austin', 'Texas', 'United States'],
  ['Seattle', 'Washington', 'United States'],
  ['Cebu City', 'Central Visayas', 'Philippines'],
  ['Toronto', 'Ontario', 'Canada'],
  ['Berlin', 'Berlin', 'Germany'],
  ['Melbourne', 'Victoria', 'Australia'],
  ['Lisbon', 'Lisbon', 'Portugal'],
  ['Singapore', 'Singapore', 'Singapore'],
  ['Dublin', 'Leinster', 'Ireland'],
  ['Tokyo', 'Tokyo', 'Japan'],
] as const;

const STREET_NAMES = [
  'Maple',
  'Pine',
  'Cedar',
  'Lakeview',
  'Sunset',
  'Hillcrest',
  'Riverside',
  'Willow',
  'Oakridge',
  'Park',
];

const COMPANIES = [
  'Northstar Labs',
  'Blue Harbor Systems',
  'Summit Forge',
  'Pixel River Studio',
  'Atlas Grid',
  'Brightline Health',
  'Nimbus Retail',
  'Copperleaf Media',
  'Everpeak Logistics',
  'Orbitlane Tech',
];

const JOB_TITLES = [
  'Frontend Engineer',
  'QA Analyst',
  'Product Manager',
  'Data Engineer',
  'UX Researcher',
  'Solutions Architect',
  'Operations Lead',
  'Finance Analyst',
  'Support Specialist',
  'Marketing Strategist',
];

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Operations',
  'Finance',
  'Sales',
  'Support',
  'Security',
  'Growth',
  'Legal',
];

const ROLES = [
  'Admin',
  'Editor',
  'Viewer',
  'Manager',
  'Owner',
  'Analyst',
  'Operator',
  'Guest',
];

const STATUSES = [
  'active',
  'pending',
  'archived',
  'disabled',
  'invited',
  'verified',
];

const DOMAINS = [
  'example.com',
  'acme.io',
  'northstar.dev',
  'pixelriver.co',
  'mailforge.app',
  'demo.test',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'CAD'];
const COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#e11d48', '#8b5cf6', '#14b8a6'];
const PRODUCTS = [
  'Starter Plan',
  'Pro License',
  'Analytics Add-on',
  'Team Workspace',
  'API Bundle',
  'Performance Kit',
  'Growth Pack',
  'Ops Dashboard',
];
const TAG_LINES = [
  'Needs follow-up next sprint.',
  'Imported from staging seed set.',
  'Preferred contact hours are afternoons.',
  'Created for demo workflow validation.',
  'Eligible for onboarding automation.',
  'Flagged for regression test coverage.',
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]) {
  return items[randomInt(0, items.length - 1)];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function randomDigits(length: number) {
  return Array.from({ length }, () => randomInt(0, 9)).join('');
}

function randomHex(length: number) {
  const chars = '0123456789abcdef';
  return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join('');
}

function randomSentence() {
  const starts = ['Build', 'Review', 'Track', 'Validate', 'Seed', 'Ship'];
  const middles = [
    'customer records',
    'test fixtures',
    'integration payloads',
    'demo accounts',
    'billing events',
    'search indexes',
  ];
  const endings = [
    'before release.',
    'for the staging run.',
    'without touching production.',
    'with realistic edge cases.',
    'for QA smoke tests.',
    'during migration prep.',
  ];

  return `${pick(starts)} ${pick(middles)} ${pick(endings)}`;
}

function randomParagraph() {
  return Array.from({ length: 3 }, () => randomSentence()).join(' ');
}

function buildContext(index: number): RowContext {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const [city, state, country] = pick(CITIES);
  const company = pick(COMPANIES);
  const emailDomain = pick(DOMAINS);

  return {
    index,
    seed: Date.now() + index,
    firstName,
    lastName,
    city,
    state,
    country,
    company,
    emailDomain,
  };
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sqlEscape(value: string) {
  return value.replace(/'/g, "''");
}

function csvEscape(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function formatDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(offsetHours: number) {
  const date = new Date();
  date.setHours(date.getHours() + offsetHours);
  return date.toISOString();
}

function createUuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-a${randomHex(3)}-${randomHex(12)}`;
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: 'id',
    label: 'ID',
    category: 'Identity',
    generate: ({ index }) => String(1000 + index),
  },
  {
    key: 'uuid',
    label: 'UUID',
    category: 'Identity',
    generate: () => createUuid(),
  },
  {
    key: 'firstName',
    label: 'First Name',
    category: 'Identity',
    generate: ({ firstName }) => firstName,
  },
  {
    key: 'lastName',
    label: 'Last Name',
    category: 'Identity',
    generate: ({ lastName }) => lastName,
  },
  {
    key: 'fullName',
    label: 'Full Name',
    category: 'Identity',
    generate: ({ firstName, lastName }) => `${firstName} ${lastName}`,
  },
  {
    key: 'displayName',
    label: 'Display Name',
    category: 'Identity',
    generate: ({ firstName, lastName }) => `${firstName} ${lastName[0]}.`,
  },
  {
    key: 'username',
    label: 'Username',
    category: 'Identity',
    generate: ({ firstName, lastName, index }) =>
      `${firstName.toLowerCase()}_${lastName.toLowerCase()}${index + 1}`,
  },
  {
    key: 'email',
    label: 'Email',
    category: 'Contact',
    generate: ({ firstName, lastName, emailDomain }) =>
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`,
  },
  {
    key: 'alternateEmail',
    label: 'Alternate Email',
    category: 'Contact',
    generate: ({ firstName, lastName }) =>
      `${firstName[0].toLowerCase()}${lastName.toLowerCase()}@mail.test`,
  },
  {
    key: 'phoneNumber',
    label: 'Phone Number',
    category: 'Contact',
    generate: () =>
      `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
  },
  {
    key: 'mobileNumber',
    label: 'Mobile Number',
    category: 'Contact',
    generate: () => `+1-${randomInt(200, 999)}-${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
  },
  {
    key: 'company',
    label: 'Company',
    category: 'Business',
    generate: ({ company }) => company,
  },
  {
    key: 'jobTitle',
    label: 'Job Title',
    category: 'Business',
    generate: () => pick(JOB_TITLES),
  },
  {
    key: 'department',
    label: 'Department',
    category: 'Business',
    generate: () => pick(DEPARTMENTS),
  },
  {
    key: 'role',
    label: 'Role',
    category: 'Business',
    generate: () => pick(ROLES),
  },
  {
    key: 'status',
    label: 'Status',
    category: 'Business',
    generate: () => pick(STATUSES),
  },
  {
    key: 'website',
    label: 'Website',
    category: 'Business',
    generate: ({ company }) => `https://${slugify(company)}.com`,
  },
  {
    key: 'domain',
    label: 'Domain',
    category: 'Business',
    generate: ({ company }) => `${slugify(company)}.com`,
  },
  {
    key: 'streetAddress',
    label: 'Street Address',
    category: 'Location',
    generate: () => `${randomInt(100, 9999)} ${pick(STREET_NAMES)} Street`,
  },
  {
    key: 'secondaryAddress',
    label: 'Secondary Address',
    category: 'Location',
    generate: () => `Suite ${randomInt(100, 999)}`,
  },
  {
    key: 'city',
    label: 'City',
    category: 'Location',
    generate: ({ city }) => city,
  },
  {
    key: 'state',
    label: 'State / Region',
    category: 'Location',
    generate: ({ state }) => state,
  },
  {
    key: 'postalCode',
    label: 'Postal Code',
    category: 'Location',
    generate: () => randomDigits(5),
  },
  {
    key: 'country',
    label: 'Country',
    category: 'Location',
    generate: ({ country }) => country,
  },
  {
    key: 'latitude',
    label: 'Latitude',
    category: 'Location',
    generate: () => (Math.random() * 180 - 90).toFixed(6),
  },
  {
    key: 'longitude',
    label: 'Longitude',
    category: 'Location',
    generate: () => (Math.random() * 360 - 180).toFixed(6),
  },
  {
    key: 'ipAddress',
    label: 'IPv4 Address',
    category: 'Network',
    generate: () =>
      `${randomInt(11, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`,
  },
  {
    key: 'ipv6Address',
    label: 'IPv6 Address',
    category: 'Network',
    generate: () =>
      `${randomHex(4)}:${randomHex(4)}:${randomHex(4)}:${randomHex(4)}:${randomHex(4)}:${randomHex(4)}:${randomHex(4)}:${randomHex(4)}`,
  },
  {
    key: 'macAddress',
    label: 'MAC Address',
    category: 'Network',
    generate: () =>
      Array.from({ length: 6 }, () => randomHex(2).toUpperCase()).join(':'),
  },
  {
    key: 'urlSlug',
    label: 'URL Slug',
    category: 'Network',
    generate: ({ firstName, lastName, index }) =>
      slugify(`${firstName} ${lastName} profile ${index + 1}`),
  },
  {
    key: 'apiKey',
    label: 'API Key',
    category: 'System',
    generate: () => `sk_test_${randomHex(24)}`,
  },
  {
    key: 'colorHex',
    label: 'Color Hex',
    category: 'System',
    generate: () => pick(COLORS),
  },
  {
    key: 'booleanFlag',
    label: 'Boolean Flag',
    category: 'System',
    generate: () => (Math.random() > 0.5 ? 'true' : 'false'),
  },
  {
    key: 'createdAt',
    label: 'Created At',
    category: 'System',
    generate: () => formatDateTime(-randomInt(24, 24 * 120)),
  },
  {
    key: 'updatedAt',
    label: 'Updated At',
    category: 'System',
    generate: () => formatDateTime(-randomInt(1, 72)),
  },
  {
    key: 'birthday',
    label: 'Birthday',
    category: 'Identity',
    generate: () => formatDate(-randomInt(365 * 55, 365 * 18)),
  },
  {
    key: 'futureDate',
    label: 'Future Date',
    category: 'System',
    generate: () => formatDate(randomInt(1, 180)),
  },
  {
    key: 'avatarUrl',
    label: 'Avatar URL',
    category: 'Identity',
    generate: ({ firstName, lastName }) =>
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(`${firstName} ${lastName}`)}`,
  },
  {
    key: 'productName',
    label: 'Product Name',
    category: 'Commerce',
    generate: () => pick(PRODUCTS),
  },
  {
    key: 'sku',
    label: 'SKU',
    category: 'Commerce',
    generate: () => `SKU-${randomHex(8).toUpperCase()}`,
  },
  {
    key: 'orderNumber',
    label: 'Order Number',
    category: 'Commerce',
    generate: ({ index }) => `ORD-${new Date().getFullYear()}-${String(index + 1).padStart(5, '0')}`,
  },
  {
    key: 'amount',
    label: 'Amount',
    category: 'Commerce',
    generate: () => (Math.random() * 5000 + 25).toFixed(2),
  },
  {
    key: 'currency',
    label: 'Currency',
    category: 'Commerce',
    generate: () => pick(CURRENCIES),
  },
  {
    key: 'creditCardLast4',
    label: 'Card Last 4',
    category: 'Commerce',
    generate: () => randomDigits(4),
  },
  {
    key: 'iban',
    label: 'IBAN',
    category: 'Commerce',
    generate: () => `DE${randomDigits(20)}`,
  },
  {
    key: 'licensePlate',
    label: 'License Plate',
    category: 'System',
    generate: () => `${randomHex(3).toUpperCase()}-${randomDigits(3)}`,
  },
  {
    key: 'sentence',
    label: 'Sentence',
    category: 'Content',
    generate: () => randomSentence(),
  },
  {
    key: 'paragraph',
    label: 'Paragraph',
    category: 'Content',
    generate: () => randomParagraph(),
  },
  {
    key: 'tags',
    label: 'Tags',
    category: 'Content',
    generate: () =>
      [pick(DEPARTMENTS), pick(ROLES), pick(STATUSES)]
        .map((item) => slugify(item))
        .join(', '),
  },
  {
    key: 'notes',
    label: 'Notes',
    category: 'Content',
    generate: () => pick(TAG_LINES),
  },
  {
    key: 'password',
    label: 'Password',
    category: 'System',
    generate: () => `${pick(['Nova', 'Atlas', 'Pixel', 'Grid'])}!${randomDigits(4)}${pick(['#', '@', '$'])}`,
  },
];

const DEFAULT_FIELDS = [
  'id',
  'fullName',
  'email',
  'phoneNumber',
  'company',
  'jobTitle',
  'city',
  'country',
  'status',
];

const FIELD_GROUPS = Array.from(
  FIELD_DEFINITIONS.reduce((map, field) => {
    const fields = map.get(field.category) ?? [];
    fields.push(field);
    map.set(field.category, fields);
    return map;
  }, new Map<FieldCategory, FieldDefinition[]>()),
);

function serializeJson(rows: Record<string, string>[]) {
  return JSON.stringify(rows, null, 2);
}

function serializeCsv(rows: Record<string, string>[], fields: FieldDefinition[]) {
  const headers = fields.map((field) => field.key);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header] ?? '')).join(','),
    ),
  ];

  return lines.join('\n');
}

function serializeSql(
  rows: Record<string, string>[],
  fields: FieldDefinition[],
  tableName: string,
) {
  const headers = fields.map((field) => field.key);
  const values = rows
    .map(
      (row) =>
        `(${headers
          .map((header) => `'${sqlEscape(row[header] ?? '')}'`)
          .join(', ')})`,
    )
    .join(',\n');

  return `INSERT INTO ${tableName} (${headers.join(', ')})\nVALUES\n${values};`;
}

function serializeXml(
  rows: Record<string, string>[],
  fields: FieldDefinition[],
  rootName: string,
) {
  const itemName = rootName.endsWith('s') ? rootName.slice(0, -1) || 'record' : 'record';
  const items = rows
    .map((row) => {
      const fieldsXml = fields
        .map(
          (field) =>
            `    <${field.key}>${xmlEscape(row[field.key] ?? '')}</${field.key}>`,
        )
        .join('\n');

      return `  <${itemName}>\n${fieldsXml}\n  </${itemName}>`;
    })
    .join('\n');

  return `<${rootName}>\n${items}\n</${rootName}>`;
}

function createRows(count: number, fieldKeys: string[]) {
  const definitions = FIELD_DEFINITIONS.filter((field) => fieldKeys.includes(field.key));

  return Array.from({ length: count }, (_, index) => {
    const context = buildContext(index);
    return Object.fromEntries(
      definitions.map((field) => [field.key, field.generate(context)]),
    );
  });
}

function clampCount(value: number) {
  if (Number.isNaN(value)) return 1;
  return Math.min(250, Math.max(1, Math.round(value)));
}

export function FakeDataGenerator() {
  const [count, setCount] = useState(12);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json');
  const [tableName, setTableName] = useState('fake_records');
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_FIELDS);
  const [activeCategory, setActiveCategory] = useState<FieldCategory>('Identity');
  const [rows, setRows] = useState(() => createRows(12, DEFAULT_FIELDS));
  const [copied, setCopied] = useState(false);
  const [draggedFieldKey, setDraggedFieldKey] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    targetKey: string;
    position: 'before' | 'after';
  } | null>(null);

  const selectedDefinitions = useMemo(
    () =>
      selectedFields
        .map((fieldKey) =>
          FIELD_DEFINITIONS.find((field) => field.key === fieldKey),
        )
        .filter((field): field is FieldDefinition => Boolean(field)),
    [selectedFields],
  );

  const availableFields = useMemo(
    () =>
      FIELD_DEFINITIONS.filter(
        (field) =>
          field.category === activeCategory &&
          !selectedFields.includes(field.key),
      ),
    [activeCategory, selectedFields],
  );

  const output = useMemo(() => {
    if (!rows.length || !selectedDefinitions.length) return '';

    if (outputFormat === 'csv') {
      return serializeCsv(rows, selectedDefinitions);
    }

    if (outputFormat === 'sql') {
      return serializeSql(rows, selectedDefinitions, tableName);
    }

    if (outputFormat === 'xml') {
      return serializeXml(rows, selectedDefinitions, tableName);
    }

    return serializeJson(rows);
  }, [outputFormat, rows, selectedDefinitions, tableName]);

  const previewRows = rows.slice(0, 8);

  const handleGenerate = (nextCount = count, nextFields = selectedFields) => {
    setRows(createRows(nextCount, nextFields));
    setCopied(false);
  };

  const handleCountChange = (value: string) => {
    setCount(clampCount(Number(value)));
  };

  const toggleField = (fieldKey: string) => {
    setSelectedFields((current) => {
      const next = current.includes(fieldKey)
        ? current.filter((key) => key !== fieldKey)
        : [...current, fieldKey];

      return next.length ? next : current;
    });
    setCopied(false);
  };

  const removeField = (fieldKey: string) => {
    if (selectedFields.length === 1) return;
    toggleField(fieldKey);
  };

  const reorderFields = (
    draggedKey: string,
    targetKey: string,
    position: 'before' | 'after',
  ) => {
    setSelectedFields((current) => {
      const fromIndex = current.indexOf(draggedKey);
      const targetIndex = current.indexOf(targetKey);
      if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      const adjustedTargetIndex = next.indexOf(targetKey);
      const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;
      next.splice(insertIndex, 0, item);
      return next;
    });
    setCopied(false);
  };

  const handleFieldDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    fieldKey: string,
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', fieldKey);
    setDraggedFieldKey(fieldKey);
    setDropIndicator(null);
  };

  const handleFieldDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetKey: string,
  ) => {
    event.preventDefault();

    const activeKey = draggedFieldKey ?? event.dataTransfer.getData('text/plain');

    if (!activeKey || activeKey === targetKey) {
      setDropIndicator(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const midpoint = bounds.left + bounds.width / 2;
    const position = event.clientX < midpoint ? 'before' : 'after';

    setDropIndicator({ targetKey, position });
    reorderFields(activeKey, targetKey, position);
  };

  const handleFieldDrop = (targetKey: string) => {
    if (draggedFieldKey && dropIndicator && draggedFieldKey !== targetKey) {
      reorderFields(draggedFieldKey, targetKey, dropIndicator.position);
    }

    setDraggedFieldKey(null);
    setDropIndicator(null);
  };

  const handleFieldDragEnd = () => {
    setDraggedFieldKey(null);
    setDropIndicator(null);
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy fake data output:', error);
    }
  };

  const handleClear = () => {
    setRows([]);
    setCopied(false);
  };

  const handlePreset = (keys: string[]) => {
    setSelectedFields(keys);
    setRows(createRows(count, keys));
    setCopied(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card px-4 py-4">
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[110px_150px_minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="fake-data-count" className="text-xs text-muted-foreground">
                Rows
              </Label>
              <Input
                id="fake-data-count"
                type="number"
                min={1}
                max={250}
                value={count}
                onChange={(event) => handleCountChange(event.target.value)}
                className="border-border bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fake-data-format" className="text-xs text-muted-foreground">
                Format
              </Label>
              <Select
                value={outputFormat}
                onValueChange={(value) => setOutputFormat(value as OutputFormat)}
              >
                <SelectTrigger
                  id="fake-data-format"
                  className="w-full border-border bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fake-data-table-name" className="text-xs text-muted-foreground">
                Root / table name
              </Label>
              <Input
                id="fake-data-table-name"
                value={tableName}
                onChange={(event) => setTableName(slugify(event.target.value) || 'fake_records')}
                placeholder="fake_records"
                className="border-border bg-background font-mono"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={() => handleGenerate()}
                disabled={!selectedFields.length}
              >
                <Database className="mr-1.5 h-3.5 w-3.5" />
                Generate
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={!rows.length}
                className="border-border bg-background text-red-400 hover:bg-muted hover:text-red-300"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3 rounded-md border border-border bg-background px-3 py-3">
              <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select
                    value={activeCategory}
                    onValueChange={(value) => setActiveCategory(value as FieldCategory)}
                  >
                    <SelectTrigger className="w-full border-border bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_GROUPS.map(([category]) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Add field</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!selectedFields.includes(value)) {
                        setSelectedFields((current) => [...current, value]);
                        setCopied(false);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full border-border bg-card">
                      <SelectValue placeholder={`Choose a ${activeCategory.toLowerCase()} field`} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.length ? (
                        availableFields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          All {activeCategory.toLowerCase()} fields selected
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <div className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-card px-3 text-xs text-muted-foreground">
                    <span>{selectedFields.length} selected</span>
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Selected fields
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Drag chips to reorder columns before exporting.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handlePreset([
                          'id',
                          'fullName',
                          'email',
                          'phoneNumber',
                          'company',
                          'jobTitle',
                          'city',
                          'country',
                          'status',
                        ])
                      }
                      className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Person preset
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handlePreset([
                          'orderNumber',
                          'productName',
                          'amount',
                          'currency',
                          'status',
                          'createdAt',
                          'creditCardLast4',
                          'country',
                        ])
                      }
                      className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Commerce preset
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handlePreset([
                          'id',
                          'username',
                          'email',
                          'role',
                          'status',
                          'createdAt',
                          'ipAddress',
                          'apiKey',
                        ])
                      }
                      className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Auth / API
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handlePreset([
                          'firstName',
                          'lastName',
                          'streetAddress',
                          'city',
                          'state',
                          'postalCode',
                          'country',
                          'phoneNumber',
                        ])
                      }
                      className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Address book
                    </Button>
                  </div>
                </div>

                <div className="-mx-1 max-h-28 overflow-y-auto px-1 pb-1">
                  <div className="flex flex-wrap gap-2">
                    {selectedDefinitions.map((field) => (
                      <div
                        key={field.key}
                        draggable
                        onDragStart={(event) => handleFieldDragStart(event, field.key)}
                        onDragOver={(event) => handleFieldDragOver(event, field.key)}
                        onDrop={() => handleFieldDrop(field.key)}
                        onDragEnd={handleFieldDragEnd}
                        className={[
                          'relative inline-flex min-h-9 cursor-grab select-none items-center gap-2 rounded-md border border-primary bg-primary/10 px-2.5 py-1.5 text-xs font-mono text-foreground active:cursor-grabbing',
                          draggedFieldKey === field.key ? 'scale-[0.98] border-primary/70 bg-primary/20 opacity-70' : '',
                          dropIndicator?.targetKey === field.key && dropIndicator.position === 'before'
                            ? 'before:absolute before:-left-1 before:top-1 before:bottom-1 before:w-1 before:rounded-full before:bg-primary'
                            : '',
                          dropIndicator?.targetKey === field.key && dropIndicator.position === 'after'
                            ? 'after:absolute after:-right-1 after:top-1 after:bottom-1 after:w-1 after:rounded-full after:bg-primary'
                            : '',
                        ].join(' ')}
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="whitespace-nowrap">{field.label}</span>
                        <button
                          type="button"
                          onClick={() => removeField(field.key)}
                          disabled={selectedFields.length === 1}
                          className="rounded-sm p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            selectedFields.length === 1
                              ? 'At least one field is required'
                              : `Remove ${field.label}`
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background px-3 py-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Rows</span>
                  <span className="font-mono text-foreground">{rows.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Selected fields</span>
                  <span className="font-mono text-foreground">{selectedFields.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-mono text-foreground">{outputFormat.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Root</span>
                  <span className="max-w-[18ch] truncate font-mono text-foreground" title={tableName}>
                    {tableName}
                  </span>
                </div>
              </div>

              <p className="mt-3 border-t border-border pt-3 text-[11px] leading-normal text-muted-foreground">
                Local-only generation. SQL escapes string values. XML uses the root name,
                and CSV keeps machine-friendly headers.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-18rem)] gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(420px,0.9fr)]">
        <div className="flex min-h-0 flex-col rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Preview table</h3>
              <p className="text-[11px] text-muted-foreground">
                First {previewRows.length || 0} rows from the current fake dataset.
              </p>
            </div>
            <Table2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length && selectedDefinitions.length ? (
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border bg-background/60">
                    {selectedDefinitions.map((field) => (
                      <th
                        key={field.key}
                        className="border-r border-border px-3 py-2 font-mono font-semibold text-foreground last:border-r-0"
                      >
                        {field.key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={`fake-row-${rowIndex}`} className="border-b border-border last:border-b-0">
                      {selectedDefinitions.map((field) => (
                        <td
                          key={`${rowIndex}-${field.key}`}
                          className="max-w-[18rem] border-r border-border px-3 py-2 align-top font-mono text-[11px] text-muted-foreground last:border-r-0"
                          title={row[field.key]}
                        >
                          {row[field.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Generate a dataset to preview it here.
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-md border border-border bg-card">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Export output</h3>
              <p className="text-[11px] text-muted-foreground">
                Copyable JSON, CSV, SQL, or XML based on your current selection.
              </p>
            </div>
            <div className="flex gap-2">
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
          <div className="min-h-0 flex-1 p-3">
            <textarea
              value={output}
              readOnly
              placeholder="Generated output will appear here..."
              className="h-full min-h-[34rem] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
