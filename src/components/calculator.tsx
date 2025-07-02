"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eraser, CornerDownLeft, Save } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { addToHistory } from "@/lib/history";
import { useToast } from "@/hooks/use-toast";

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

const safeEvaluate = (expression: string): string => {
  try {
    // Sanitize expression: remove anything that's not a digit, operator, or parenthesis
    const sanitizedExpression = expression
      .replace(/[^0-9+\-*/().^%sqrtcosintanlog]/g, '')
      .replace(/\^/g, '**')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/log\(/g, 'Math.log10(');
      
    const result = new Function('return ' + sanitizedExpression)();
    if (isNaN(result) || !isFinite(result)) {
        return "Error";
    }
    return String(result);
  } catch (error) {
    return "Error";
  }
};

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [isScientific, setIsScientific] = useState(false);
  const { toast } = useToast();

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
      return prev + operator;
    });
  }, []);
  
  const handleFunction = useCallback((func: string) => {
    setDisplay(prev => {
      if (prev === "Error") return `${func}(`;
      if (prev === "0") return `${func}(`;
      return prev + `${func}(`;
    });
  }, []);


  const handleClear = useCallback(() => {
    setDisplay("0");
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
  }, []);

  const handleEquals = useCallback(() => {
    setDisplay(prev => safeEvaluate(prev));
  }, []);

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
    { label: "C", handler: handleClear, className: "text-destructive" },
    { label: "(", handler: () => handleInput('(') },
    { label: ")", handler: () => handleInput(')') },
    { label: "/", handler: () => handleOperator("/") },
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
  
  const scientificButtons = [
    { label: "sin", handler: () => handleFunction('sin') },
    { label: "cos", handler: () => handleFunction('cos') },
    { label: "tan", handler: () => handleFunction('tan') },
    { label: "log", handler: () => handleFunction('log') },
    { label: "^", handler: () => handleOperator('^') },
    { label: "√", handler: () => handleFunction('sqrt') },
  ];

  return (
    <div className="p-4 rounded-3xl bg-background dark:bg-card space-y-4 shadow-neumorphic-light dark:shadow-neumorphic-dark">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center space-x-2">
          <Switch id="scientific-mode" checked={isScientific} onCheckedChange={setIsScientific} />
          <Label htmlFor="scientific-mode">Scientific</Label>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSave} className="h-10 w-10"><Save className="h-5 w-5"/></Button>
      </div>

      <div className="bg-background dark:bg-card shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset rounded-xl p-4 text-right overflow-x-auto">
        <p className="text-4xl font-mono break-all">{display}</p>
      </div>
      
      <AnimatePresence>
      {isScientific && (
        <motion.div 
          className="grid grid-cols-3 gap-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {scientificButtons.map((btn, i) => <NeumorphicButton key={`sci-${i}`} onClick={btn.handler}>{btn.label}</NeumorphicButton>)}
        </motion.div>
      )}
      </AnimatePresence>

      <div className="grid grid-cols-4 gap-2">
        <NeumorphicButton onClick={handleBackspace}><Eraser /></NeumorphicButton>
        {basicButtons.slice(0, 3).map((btn, i) => <NeumorphicButton key={`b1-${i}`} onClick={btn.handler} className={btn.className}>{btn.label}</NeumorphicButton>)}
        {basicButtons.slice(4).map((btn, i) => <NeumorphicButton key={`b2-${i}`} onClick={btn.handler} className={btn.className}>{btn.label}</NeumorphicButton>)}
      </div>
    </div>
  );
}
