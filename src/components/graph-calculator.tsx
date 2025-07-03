"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider as SliderComponent } from '@/components/ui/slider';
import { Save, Trash2, Plus, Move, MousePointer, SlidersHorizontal, Share2 } from 'lucide-react';
import { addToHistory } from '@/lib/history';
import { useToast } from '@/hooks/use-toast';
import { create, all, type MathNode } from 'mathjs';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Setup mathjs instance
const math = create(all);

// #region Type Definitions
type Tool = 'move' | 'point' | 'slider';

type GraphObject = Point | Func | Slider;

type Point = {
  id: string;
  type: 'point';
  x: number;
  y: number;
  label: string;
};

type Func = {
  id: string;
  type: 'function';
  expression: string;
  compiled: ReturnType<MathNode['compile']>;
  color: string;
};

type Slider = {
  id: string;
  type: 'slider';
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
};

type ViewTransform = {
  x: number; // pan x
  y: number; // pan y
  zoom: number;
};
// #endregion

export function GraphCalculator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [objects, setObjects] = useState<GraphObject[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('move');
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, zoom: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const { toast } = useToast();

  // #region Core Drawing & Transformation Logic
  // This useEffect hook sets up the main render loop using requestAnimationFrame.
  // It's responsible for drawing the grid, axes, and all graph objects.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    const { x: panX, y: panY, zoom } = viewTransform;

    let animationFrameId: number;
    
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // --- Coordinate System Transformation ---
      // Center the origin and apply pan/zoom
      ctx.save();
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(zoom, -zoom); // Flip Y-axis for standard math coordinates

      const viewBounds = {
        minX: - (width / 2 + panX) / zoom,
        maxX: (width / 2 - panX) / zoom,
        minY: - (height / 2 - panY) / zoom,
        maxY: (height / 2 + panY) / zoom,
      };

      // --- Grid & Axes ---
      drawGrid(ctx, viewBounds, zoom);
      drawAxes(ctx, viewBounds);
      
      // --- Render Objects ---
      const scope = objects.filter(o => o.type === 'slider').reduce((acc, s) => ({ ...acc, [(s as Slider).name]: (s as Slider).value }), {});
      objects.forEach(obj => {
        if (obj.type === 'function') drawFunction(ctx, obj, viewBounds, scope);
        if (obj.type === 'point') drawPoint(ctx, obj);
      });

      ctx.restore();
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [objects, viewTransform]);

  const worldToScreen = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const { width, height } = canvas;
    const screenX = x * viewTransform.zoom + width / 2 + viewTransform.x;
    const screenY = -y * viewTransform.zoom + height / 2 + viewTransform.y;
    return { x: screenX, y: screenY };
  };

  const screenToWorld = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const { width, height } = canvas;
    const worldX = (x - width / 2 - viewTransform.x) / viewTransform.zoom;
    const worldY = -(y - height / 2 - viewTransform.y) / viewTransform.zoom;
    return { x: worldX, y: worldY };
  };
  // #endregion

  // #region Canvas Drawing Helpers
  const drawGrid = (ctx: CanvasRenderingContext2D, bounds: any, zoom: number) => {
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 1 / zoom;

    const step = Math.pow(10, Math.floor(Math.log10(bounds.maxX - bounds.minX)) - 1);

    for (let x = Math.floor(bounds.minX / step) * step; x <= bounds.maxX; x += step) {
        ctx.moveTo(x, bounds.minY);
        ctx.lineTo(x, bounds.maxY);
    }
    for (let y = Math.floor(bounds.minY / step) * step; y <= bounds.maxY; y += step) {
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
    }
    ctx.stroke();
  };

  const drawAxes = (ctx: CanvasRenderingContext2D, bounds: any) => {
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2 / viewTransform.zoom;
    // X-Axis
    ctx.moveTo(bounds.minX, 0);
    ctx.lineTo(bounds.maxX, 0);
    // Y-Axis
    ctx.moveTo(0, bounds.minY);
    ctx.lineTo(0, bounds.maxY);
    ctx.stroke();
  };
  
  const drawFunction = (ctx: CanvasRenderingContext2D, func: Func, bounds: any, scope: any) => {
    ctx.beginPath();
    ctx.strokeStyle = func.color;
    ctx.lineWidth = 2 / viewTransform.zoom;
    let firstPoint = true;

    for (let sx = 0; sx <= ctx.canvas.width; sx++) {
        const x = screenToWorld(sx, 0).x;
        try {
            const y = func.compiled.evaluate({ ...scope, x });
            if (Number.isFinite(y)) {
                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        } catch (e) { /* ignore eval errors */ }
    }
    ctx.stroke();
  };

  const drawPoint = (ctx: CanvasRenderingContext2D, point: Point) => {
    ctx.beginPath();
    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.arc(point.x, point.y, 4 / viewTransform.zoom, 0, 2 * Math.PI);
    ctx.fill();
  };
  // #endregion

  // #region Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || activeTool !== 'move') return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setViewTransform(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'point' && !isDragging) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        addPoint(x, y);
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? viewTransform.zoom * zoomFactor : viewTransform.zoom / zoomFactor;
    setViewTransform(v => ({ ...v, zoom: newZoom }));
  };
  // #endregion

  // #region Object Management
  const addObject = (type: 'function' | 'slider' | 'point') => {
    if (type === 'function') {
        const newFunc: Func = {
            id: crypto.randomUUID(),
            type: 'function',
            expression: 'sin(x)',
            compiled: math.parse('sin(x)').compile(),
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        };
        setObjects(prev => [...prev, newFunc]);
    } else if (type === 'slider') {
        const sliderName = String.fromCharCode(97 + objects.filter(o => o.type === 'slider').length);
        const newSlider: Slider = {
            id: crypto.randomUUID(),
            type: 'slider',
            name: sliderName,
            min: -5,
            max: 5,
            step: 0.1,
            value: 1,
        };
        setObjects(prev => [...prev, newSlider]);
    }
  };

  const addPoint = (x: number, y: number) => {
    const newPoint: Point = {
        id: crypto.randomUUID(),
        type: 'point',
        x,
        y,
        label: `(${x.toFixed(2)}, ${y.toFixed(2)})`
    };
    setObjects(prev => [...prev, newPoint]);
  };

  const updateObject = (id: string, updates: Partial<GraphObject>) => {
    setObjects(prev => prev.map(obj => {
      if (obj.id === id) {
        const updatedObj = { ...obj, ...updates };
        if (updatedObj.type === 'function' && 'expression' in updates) {
          try {
            updatedObj.compiled = math.parse(updatedObj.expression).compile();
          } catch(e) {
            toast({ variant: 'destructive', title: 'Invalid expression' });
          }
        }
        return updatedObj;
      }
      return obj;
    }));
  };

  const deleteObject = (id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id));
  };
  // #endregion
  
  const handleSave = () => {
    const dataToSave = {
        objects: objects.map(o => o.type === 'function' ? { ...o, compiled: undefined } : o),
        viewTransform,
    };
    addToHistory({ type: 'graph', data: dataToSave, name: `Saved Interactive Graph` });
    toast({ title: "Saved!", description: "Graph saved to history." });
  };
  

  return (
    <div className="h-full w-full flex" ref={containerRef}>
      {/* --- Left Panel: Object List & Controls --- */}
      <Card className="w-80 h-full flex flex-col rounded-none border-0 border-r">
        <CardHeader>
          <CardTitle>Objects</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {/* Function List */}
              <div>
                <Label className="text-lg font-semibold">Functions</Label>
                {objects.filter(o => o.type === 'function').map(obj => {
                    const func = obj as Func;
                    return (
                        <div key={func.id} className="flex items-center gap-2 mt-2">
                          <Input type="color" value={func.color} onChange={e => updateObject(func.id, { color: e.target.value })} className="p-1 h-8 w-8" />
                          <Input value={func.expression} onChange={e => updateObject(func.id, { expression: e.target.value })} />
                          <Button variant="ghost" size="icon" onClick={() => deleteObject(func.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    );
                })}
                <Button onClick={() => addObject('function')} variant="outline" size="sm" className="mt-2"><Plus className="h-4 w-4 mr-2" />Add Function</Button>
              </div>
              <Separator />
              {/* Slider List */}
              <div>
                <Label className="text-lg font-semibold">Sliders</Label>
                 {objects.filter(o => o.type === 'slider').map(obj => {
                    const slider = obj as Slider;
                    return (
                        <div key={slider.id} className="mt-2 space-y-2">
                           <div className="flex justify-between items-center">
                             <Label className="font-mono text-lg">{slider.name} = {slider.value}</Label>
                             <Button variant="ghost" size="icon" onClick={() => deleteObject(slider.id)}><Trash2 className="h-4 w-4" /></Button>
                           </div>
                           <SliderComponent
                                value={[slider.value]}
                                min={slider.min}
                                max={slider.max}
                                step={slider.step}
                                onValueChange={([val]) => updateObject(slider.id, { value: val })}
                            />
                        </div>
                    );
                })}
                <Button onClick={() => addObject('slider')} variant="outline" size="sm" className="mt-2"><Plus className="h-4 w-4 mr-2" />Add Slider</Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
           <Button onClick={handleSave} variant="outline"><Save className="h-4 w-4 mr-2" />Save to History</Button>
        </CardFooter>
      </Card>
      
      {/* --- Main Area: Canvas & Toolbar --- */}
      <div className="flex-grow h-full relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          onWheel={handleWheel}
        />
        <div className="absolute top-4 left-4">
          <ToggleGroup type="single" value={activeTool} onValueChange={(value: Tool) => value && setActiveTool(value)} className="bg-background rounded-lg shadow-md p-1">
            <ToggleGroupItem value="move" aria-label="Move"><Move /></ToggleGroupItem>
            <ToggleGroupItem value="point" aria-label="Add Point"><MousePointer /></ToggleGroupItem>
            {/* Placeholder for future tools */}
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
