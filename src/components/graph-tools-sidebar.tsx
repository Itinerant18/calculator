
"use client";

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import {
  Move, MousePointer, SlidersHorizontal, Crosshair, TrendingUp, Anchor, Sigma,
  Minus, Spline, Ruler, Trash2, Edit
} from 'lucide-react';

// A simple SVG for the angle icon, as lucide-react doesn't have a direct equivalent.
const AngleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6 mb-1"
  >
    <path d="M21 21H3L12 3" />
    <path d="M10 15.5a5.5 5.5 0 0 0 5.5-5.5" />
  </svg>
);


export type Tool = 
  | 'move' | 'point' | 'slider'
  | 'intersect' | 'extremum' | 'roots' | 'best-fit'
  | 'segment' | 'polygon' | 'distance' | 'angle'
  | 'midpoint' | 'tangent'
  | 'select' | 'delete';

const toolConfig = {
  basic: [
    { id: 'move', label: 'Move', icon: Move },
    { id: 'point', label: 'Point', icon: MousePointer },
    { id: 'slider', label: 'Slider', icon: SlidersHorizontal },
  ],
  analysis: [
    { id: 'intersect', label: 'Intersect', icon: Crosshair },
    { id: 'extremum', label: 'Extremum', icon: TrendingUp },
    { id: 'roots', label: 'Roots', icon: Anchor },
    { id: 'best-fit', label: 'Best Fit', icon: Sigma },
  ],
  drawing: [
    { id: 'segment', label: 'Segment', icon: Minus },
    { id: 'polygon', label: 'Polygon', icon: Spline },
    { id: 'distance', label: 'Distance', icon: Ruler },
    { id: 'angle', label: 'Angle', icon: AngleIcon },
  ],
  edit: [
    { id: 'select', label: 'Select', icon: Edit },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ]
};

interface GraphToolsSidebarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

export function GraphToolsSidebar({ activeTool, setActiveTool }: GraphToolsSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Tools</h2>
      </div>
      <Accordion type="multiple" defaultValue={['basic', 'analysis']} className="w-full flex-grow overflow-y-auto">
        {Object.entries(toolConfig).map(([key, tools]) => (
          <AccordionItem value={key} key={key}>
            <AccordionTrigger className='px-4 text-base capitalize'>{key}</AccordionTrigger>
            <AccordionContent className='p-2 grid grid-cols-3 gap-1'>
              {tools.map(tool => (
                <Button
                  key={tool.id}
                  variant={activeTool === tool.id ? 'secondary' : 'ghost'}
                  className="flex flex-col h-16 items-center justify-center p-1"
                  onClick={() => setActiveTool(tool.id as Tool)}
                  title={tool.label}
                >
                  <tool.icon className="h-6 w-6 mb-1" />
                  <span className="text-xs text-center leading-tight">{tool.label}</span>
                </Button>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
