"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Save } from "lucide-react";
import { addToHistory } from "@/lib/history";
import { useToast } from "@/hooks/use-toast";
import { create, all } from 'mathjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { answerMathQuestion } from "@/ai/flows/answer-math-question";
import { Skeleton } from "@/components/ui/skeleton";

// Initialize mathjs
const math = create(all);
math.config({
  number: 'BigNumber',
  precision: 64,
});

const NeumorphicButton = ({ children, onClick, className = '', ...props }: { children: React.ReactNode, onClick: () => void, className?: string, props?: any }) => (
  <Button
    variant="ghost"
    className={`h-16 w-16 rounded-full text-xl font-bold text-foreground/80 shadow-neumorphic-light dark:shadow-neumorphic-dark active:shadow-neumorphic-light-inset active:dark:shadow-neumorphic-dark-inset transition-all duration-150 ease-in-out hover:text-primary ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </Button>
);

const ScientificButton = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick: () => void, className?: string }) => (
    <Button
      variant="ghost"
      className={`h-12 w-full rounded-lg text-base font-semibold text-foreground/70 shadow-neumorphic-light dark:shadow-neumorphic-dark active:shadow-neumorphic-light-inset active:dark:shadow-neumorphic-dark-inset transition-all duration-150 ease-in-out hover:text-primary ${className}`}
      onClick={onClick}
    >
      {children}
    </Button>
);

const advancedKeywords = [
    'integral', '∫', 'limit', 'lim', 'derivative', 'd/dx', 'solve', 'dy/dx', '∂/∂x',
    'distance', 'midpoint', 'area of circle', 'volume of sphere', 'area of triangle'
];

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [angleMode, setAngleMode] = useState<'rad' | 'deg'>('rad');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const localEvaluate = (expression: string) => {
    try {
      math.config({ angle: angleMode });
      const result = math.evaluate(expression);
      return math.format(result, { precision: 14 });
    } catch (e) {
      console.error(e);
      return "Error";
    }
  };

  const handleInput = useCallback((value: string) => {
    setDisplay(prev => {
      if (prev === "0" || prev === "Error") return value;
      return prev + value;
    });
  }, []);

  const handleOperator = useCallback((operator: string) => {
    setDisplay(prev => {
      if (prev === "Error") return "0";
      const lastChar = prev.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        return prev.slice(0, -1) + operator;
      }
      return prev + ` ${operator} `;
    });
  }, []);
  
  const handleFunction = useCallback((func: string) => {
    setDisplay(prev => {
      const textToAdd = `${func}(`;
      if (prev === "Error" || prev === "0") return textToAdd;
      return prev + textToAdd;
    });
  }, []);

  const handleClear = useCallback(() => {
    setDisplay("0");
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1).trim() : "0");
  }, []);

  const handleEquals = useCallback(async () => {
    if (isLoading) return;
    const expression = display.trim();
    if (!expression || expression === "Error") return;

    const useAI = advancedKeywords.some(keyword => expression.toLowerCase().includes(keyword));

    setIsLoading(true);
    let result;
    if (useAI) {
      try {
        const aiResult = await answerMathQuestion({ question: expression, angleMode });
        result = aiResult.answer;
      } catch (error) {
        console.error("AI Error:", error);
        result = "AI Error";
        toast({ variant: 'destructive', title: 'AI evaluation failed.' });
      }
    } else {
      result = localEvaluate(expression);
    }
    setIsLoading(false);
    setDisplay(result);
  }, [display, angleMode, isLoading, toast]);

  const handleSave = () => {
    if (display && display !== "0" && display !== "Error") {
      addToHistory({ type: 'calculator', data: { calculation: display }, name: 'Saved Calculation' });
      toast({
        title: "Saved!",
        description: "Calculation saved to history.",
      });
    }
  };

  const basicButtons = [
    { label: "7", handler: () => handleInput("7") },
    { label: "8", handler: () => handleInput("8") },
    { label: "9", handler: () => handleInput("9") },
    { label: "*", handler: () => handleOperator("*") },
    { label: "4", handler: () => handleInput("4") },
    { label: "5", handler: () => handleInput("5") },
    { label: "6", handler: () => handleInput("6") },
    { label: "-", handler: () => handleOperator("-") },
    { label: "1", handler: () => handleInput("1") },
    { label: "2", handler: () => handleInput("2") },
    { label: "3", handler: () => handleInput("3") },
    { label: "+", handler: () => handleOperator("+") },
    { label: "0", handler: () => handleInput("0"), className: "col-span-2 w-full" },
    { label: ".", handler: () => handleInput(".") },
    { label: "=", handler: handleEquals, className: "bg-primary text-primary-foreground hover:bg-primary/90" },
  ];

  const trigButtons = [
    { label: "sin", handler: () => handleFunction('sin') },
    { label: "cos", handler: () => handleFunction('cos') },
    { label: "tan", handler: () => handleFunction('tan') },
    { label: "sin⁻¹", handler: () => handleFunction('asin') },
    { label: "cos⁻¹", handler: () => handleFunction('acos') },
    { label: "tan⁻¹", handler: () => handleFunction('atan') },
    { label: "sinh", handler: () => handleFunction('sinh') },
    { label: "cosh", handler: () => handleFunction('cosh') },
    { label: "tanh", handler: () => handleFunction('tanh') },
    { label: "sinh⁻¹", handler: () => handleFunction('asinh') },
    { label: "cosh⁻¹", handler: () => handleFunction('acosh') },
    { label: "tanh⁻¹", handler: () => handleFunction('atanh') },
  ];
  
  const funcButtons = [
    { label: "xʸ", handler: () => handleOperator('^') },
    { label: "√", handler: () => handleFunction('sqrt') },
    { label: "log", handler: () => handleFunction('log10') },
    { label: "ln", handler: () => handleFunction('log') },
    { label: "eˣ", handler: () => handleFunction('exp') },
    { label: "x!", handler: () => handleFunction('factorial') },
    { label: "|x|", handler: () => handleFunction('abs') },
    { label: "mod", handler: () => handleOperator('mod') },
    { label: "nPr", handler: () => handleFunction('permutations') },
    { label: "nCr", handler: () => handleFunction('combinations') },
    { label: "π", handler: () => handleInput('pi') },
    { label: "e", handler: () => handleInput('e') },
  ];
  
  const statsButtons = [
      { label: "mean", handler: () => handleFunction('mean') },
      { label: "median", handler: () => handleFunction('median') },
      { label: "std", handler: () => handleFunction('std') },
      { label: "var", handler: () => handleFunction('variance') },
      { label: "mode", handler: () => handleFunction('mode') },
      { label: "Σ", handler: () => handleFunction('sum') },
  ];

  const calcButtons = [
      { label: "d/dx", handler: () => handleFunction('derivative') },
      { label: "∫", handler: () => handleFunction('integral') },
      { label: "lim", handler: () => handleFunction('limit') },
  ];

  return (
    <div className="p-4 rounded-3xl bg-background dark:bg-card space-y-4 shadow-neumorphic-light dark:shadow-neumorphic-dark w-full max-w-md">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center space-x-2">
            <Button
                variant={angleMode === 'rad' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setAngleMode('rad')}
                className="rounded-full"
            >Rad</Button>
            <Button
                variant={angleMode === 'deg' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setAngleMode('deg')}
                className="rounded-full"
            >Deg</Button>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSave} className="h-10 w-10"><Save className="h-5 w-5"/></Button>
      </div>

      <div className="bg-background dark:bg-card shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset rounded-xl p-4 text-right overflow-x-auto min-h-[72px] flex items-center justify-end">
        {isLoading ? 
            <Skeleton className="h-8 w-3/4" /> :
            <p className="text-4xl font-mono break-all">{display}</p>
        }
      </div>
      
      <Tabs defaultValue="trig" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trig">Trig</TabsTrigger>
            <TabsTrigger value="func">Func</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="calc">Adv</TabsTrigger>
        </TabsList>
        <TabsContent value="trig">
            <div className="grid grid-cols-4 gap-2 mt-2">
                {trigButtons.map((btn, i) => <ScientificButton key={`trig-${i}`} onClick={btn.handler}>{btn.label}</ScientificButton>)}
            </div>
        </TabsContent>
        <TabsContent value="func">
            <div className="grid grid-cols-4 gap-2 mt-2">
                {funcButtons.map((btn, i) => <ScientificButton key={`func-${i}`} onClick={btn.handler}>{btn.label}</ScientificButton>)}
            </div>
        </TabsContent>
        <TabsContent value="stats">
            <div className="grid grid-cols-4 gap-2 mt-2">
                {statsButtons.map((btn, i) => <ScientificButton key={`stats-${i}`} onClick={btn.handler}>{btn.label}</ScientificButton>)}
            </div>
        </TabsContent>
        <TabsContent value="calc">
            <div className="grid grid-cols-4 gap-2 mt-2">
                {calcButtons.map((btn, i) => <ScientificButton key={`calc-${i}`} onClick={btn.handler}>{btn.label}</ScientificButton>)}
            </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-4 gap-2">
        <NeumorphicButton onClick={handleClear} className="text-destructive">C</NeumorphicButton>
        <NeumorphicButton onClick={() => handleInput('(')}>(</NeumorphicButton>
        <NeumorphicButton onClick={() => handleInput(')')}>)</NeumorphicButton>
        <NeumorphicButton onClick={() => handleOperator('/')}>/</NeumorphicButton>
        
        {basicButtons.map((btn, i) => <NeumorphicButton key={`b-${i}`} onClick={btn.handler} className={btn.className}>{btn.label}</NeumorphicButton>)}
      </div>
    </div>
  );
}
