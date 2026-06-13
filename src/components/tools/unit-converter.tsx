import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
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

type Category = 'temperature' | 'length' | 'weight';

interface UnitOption {
  value: string;
  label: string;
}

const CATEGORY_UNITS: Record<Category, UnitOption[]> = {
  temperature: [
    { value: 'C', label: 'Celsius (°C)' },
    { value: 'F', label: 'Fahrenheit (°F)' },
    { value: 'K', label: 'Kelvin (K)' },
  ],
  length: [
    { value: 'm', label: 'Meters (m)' },
    { value: 'km', label: 'Kilometers (km)' },
    { value: 'mi', label: 'Miles (mi)' },
    { value: 'ft', label: 'Feet (ft)' },
    { value: 'in', label: 'Inches (in)' },
  ],
  weight: [
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'lb', label: 'Pounds (lb)' },
    { value: 'oz', label: 'Ounces (oz)' },
  ],
};

// Length base conversions (to Meters)
const LENGTH_CONVERSION: Record<string, number> = {
  m: 1,
  km: 1000,
  mi: 1609.344,
  ft: 0.3048,
  in: 0.0254,
};

// Weight base conversions (to Kilograms)
const WEIGHT_CONVERSION: Record<string, number> = {
  kg: 1,
  g: 0.001,
  lb: 0.45359237,
  oz: 0.028349523,
};

export function UnitConverter() {
  const [category, setCategory] = useState<Category>('temperature');
  const [sourceVal, setSourceVal] = useState('1');
  const [sourceUnit, setSourceUnit] = useState('C');
  const [targetUnit, setTargetUnit] = useState('F');

  const handleCategoryChange = (newCategory: Category) => {
    setCategory(newCategory);
    const defaultUnits = CATEGORY_UNITS[newCategory];
    setSourceUnit(defaultUnits[0].value);
    setTargetUnit(defaultUnits[1].value);
  };

  // Derive target value during render
  const value = parseFloat(sourceVal);
  let targetVal = '';

  if (!isNaN(value)) {
    if (sourceUnit === targetUnit) {
      targetVal = sourceVal;
    } else {
      let result = 0;

      if (category === 'temperature') {
        // Temperature math
        if (sourceUnit === 'C' && targetUnit === 'F')
          result = (value * 9) / 5 + 32;
        else if (sourceUnit === 'C' && targetUnit === 'K')
          result = value + 273.15;
        else if (sourceUnit === 'F' && targetUnit === 'C')
          result = ((value - 32) * 5) / 9;
        else if (sourceUnit === 'F' && targetUnit === 'K')
          result = ((value - 32) * 5) / 9 + 273.15;
        else if (sourceUnit === 'K' && targetUnit === 'C')
          result = value - 273.15;
        else if (sourceUnit === 'K' && targetUnit === 'F')
          result = ((value - 273.15) * 9) / 5 + 32;
      } else if (category === 'length') {
        // Length conversion: convert to meter, then to target
        const valInMeters = value * LENGTH_CONVERSION[sourceUnit];
        result = valInMeters / LENGTH_CONVERSION[targetUnit];
      } else if (category === 'weight') {
        // Weight conversion: convert to kg, then to target
        const valInKg = value * WEIGHT_CONVERSION[sourceUnit];
        result = valInKg / WEIGHT_CONVERSION[targetUnit];
      }

      // Format target value to 6 decimal places, removing trailing zeros
      targetVal = Number(result.toFixed(6)).toString();
    }
  }

  const swapUnits = () => {
    const prevSource = sourceUnit;
    setSourceUnit(targetUnit);
    setTargetUnit(prevSource);
    setSourceVal(targetVal || '0');
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-2">
        <Label htmlFor="conv-category" className="text-zinc-300">
          Conversion Category
        </Label>
        <Select
          value={category}
          onValueChange={(val) => handleCategoryChange(val as Category)}
        >
          <SelectTrigger
            id="conv-category"
            className="border-zinc-800 bg-zinc-900 text-zinc-100"
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
            <SelectItem value="temperature">Temperature</SelectItem>
            <SelectItem value="length">Length</SelectItem>
            <SelectItem value="weight">Weight</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inputs / Output Panel */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center pt-2">
        {/* Source Unit and Value */}
        <div className="space-y-3 p-4 border border-zinc-800 bg-zinc-900/30 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="source-unit" className="text-zinc-400 text-xs">
              From
            </Label>
            <Select value={sourceUnit} onValueChange={setSourceUnit}>
              <SelectTrigger
                id="source-unit"
                className="border-zinc-800 bg-zinc-900 text-zinc-100 font-medium"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                {CATEGORY_UNITS[category].map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source-val" className="text-zinc-400 text-xs">
              Value
            </Label>
            <Input
              id="source-val"
              type="number"
              value={sourceVal}
              onChange={(e) => setSourceVal(e.target.value)}
              className="border-zinc-800 bg-zinc-900 text-zinc-100 font-mono text-lg focus-visible:ring-zinc-700"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapUnits}
            className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 h-10 w-10 rounded-full"
            title="Swap Units"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Target Unit and Value */}
        <div className="space-y-3 p-4 border border-zinc-800 bg-zinc-900/30 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="target-unit" className="text-zinc-400 text-xs">
              To
            </Label>
            <Select value={targetUnit} onValueChange={setTargetUnit}>
              <SelectTrigger
                id="target-unit"
                className="border-zinc-800 bg-zinc-900 text-zinc-100 font-medium"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                {CATEGORY_UNITS[category].map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-val" className="text-zinc-400 text-xs">
              Result
            </Label>
            <Input
              id="target-val"
              value={targetVal}
              readOnly
              className="border-zinc-800 bg-zinc-900 text-zinc-100 font-mono text-lg select-all cursor-default focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Conversion result..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
