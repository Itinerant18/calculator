"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { addToHistory } from '@/lib/history';
import { useToast } from '@/hooks/use-toast';

type DataPoint = {
  x: number;
  y: number;
};

const generateData = (fn: (x: number) => number, min: number, max: number, step: number): DataPoint[] => {
  const data: DataPoint[] = [];
  for (let x = min; x <= max; x += step) {
    try {
      const y = fn(x);
      if (Number.isFinite(y)) {
        data.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
      }
    } catch (e) {
      // Ignore points that cause errors
    }
  }
  return data;
};

const parseFunction = (expression: string): ((x: number) => number) | null => {
  try {
    // A very basic sanitizer, not for production against malicious user input.
    const sanitizedExpression = expression
      .toLowerCase()
      .replace(/[^0-9+\-*/().^xsqrtcossintanlog]/g, '')
      .replace(/\^/g, '**')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/log\(/g, 'Math.log10(');
      
    return new Function('x', `return ${sanitizedExpression}`) as (x: number) => number;
  } catch (error) {
    console.error("Invalid function:", error);
    return null;
  }
};

export function GraphCalculator() {
  const [expression, setExpression] = useState('x^2');
  const [data, setData] = useState<DataPoint[]>([]);
  const [minX, setMinX] = useState(-10);
  const [maxX, setMaxX] = useState(10);
  const { toast } = useToast();

  const plotGraph = useCallback(() => {
    if (minX >= maxX) {
        toast({
            variant: "destructive",
            title: "Invalid Range",
            description: "Min X must be less than Max X.",
        });
        return;
    }
    const fn = parseFunction(expression);
    if (fn) {
      const step = (maxX - minX) / 200; // Generate 201 points
      const newData = generateData(fn, minX, maxX, step);
      setData(newData);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Function",
        description: "Please enter a valid mathematical function of x.",
      });
      setData([]);
    }
  }, [expression, minX, maxX, toast]);

  useEffect(() => {
    plotGraph();
  }, []);

  const handleSave = () => {
    if (expression && data.length > 0) {
      addToHistory({ type: 'graph', data: { expression, minX, maxX }, name: `Graph: y = ${expression}` });
      toast({
        title: "Saved!",
        description: "Graph saved to history.",
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      plotGraph();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Graph Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="function">y = f(x)</Label>
            <Input
              id="function"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., sin(x) or x^2 - 2"
            />
          </div>
          <div className="grid w-full sm:w-32 gap-1.5">
             <Label htmlFor="min-x">Min X</Label>
             <Input
                id="min-x"
                type="number"
                value={minX}
                onChange={(e) => setMinX(Number(e.target.value))}
                onKeyDown={handleKeyDown}
             />
          </div>
          <div className="grid w-full sm:w-32 gap-1.5">
             <Label htmlFor="max-x">Max X</Label>
             <Input
                id="max-x"
                type="number"
                value={maxX}
                onChange={(e) => setMaxX(Number(e.target.value))}
                onKeyDown={handleKeyDown}
             />
          </div>
          <Button onClick={plotGraph} className="w-full sm:w-auto">Plot</Button>
        </div>
        <div className="h-96 w-full pt-4">
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 5, }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" type="number" domain={[minX, maxX]} allowDuplicatedCategory={false} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} name={expression} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} variant="outline" disabled={!expression || data.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Save to History
        </Button>
      </CardFooter>
    </Card>
  );
}
