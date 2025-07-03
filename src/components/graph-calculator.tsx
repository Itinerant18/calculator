
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { addToHistory } from '@/lib/history';
import { useToast } from '@/hooks/use-toast';
import { create, all, type MathNode } from 'mathjs';
import { GraphToolsSidebar, type Tool } from './graph-tools-sidebar';
import type { GraphObject, Point, Func, Segment, Measurement, Polygon, Angle } from '@/lib/graph-types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PanelLeft } from 'lucide-react';
import { GraphObjectsPanel } from './graph-objects-panel';

// Setup mathjs instance
const math = create(all);

type ViewTransform = {
  x: number; // pan x
  y: number; // pan y
  zoom: number;
};

type InteractionState = 
    | { tool: 'segment', point1Id: string }
    | { tool: 'distance', point1Id: string }
    | { tool: 'polygon', pointIds: string[] }
    | { tool: 'angle', step: 'vertex', pointIds: [] }
    | { tool: 'angle', step: 'arm1', pointIds: [string] }
    | { tool: 'angle', step: 'arm2', pointIds: [string, string] }
    | null;

export function GraphCalculator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [objects, setObjects] = useState<GraphObject[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('move');
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, zoom: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [interactionState, setInteractionState] = useState<InteractionState>(null);
  const lastMousePos = useRef({ x: 0, y: 0, world: {x: 0, y: 0} });
  const isMobile = useIsMobile();

  const { toast } = useToast();

  const clearSelection = useCallback(() => {
    setSelectedObjectIds([]);
    setInteractionState(null);
  }, []);

  // When tool changes, clear any pending selections
  useEffect(() => {
    clearSelection();
  }, [activeTool, clearSelection]);


  // #region Core Drawing & Transformation Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    const { width, height } = container.getBoundingClientRect();
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const { x: panX, y: panY, zoom } = viewTransform;
    let animationFrameId: number;
    
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(zoom, -zoom);

      const viewBounds = {
        minX: - (width / 2 + panX) / zoom,
        maxX: (width / 2 - panX) / zoom,
        minY: - (height / 2 - panY) / zoom,
        maxY: (height / 2 + panY) / zoom,
      };

      drawGrid(ctx, viewBounds, zoom);
      drawAxes(ctx, viewBounds);
      
      const scope = objects.filter(o => o.type === 'slider').reduce((acc, s) => ({ ...acc, [(s as any).name]: (s as any).value }), {});
      objects.forEach(obj => {
        if (obj.type === 'function') drawFunction(ctx, obj as Func, viewBounds, scope);
        if (obj.type === 'point') drawPoint(ctx, obj as Point);
        if (obj.type === 'segment') drawSegment(ctx, obj as Segment, objects);
        if (obj.type === 'polygon') drawPolygon(ctx, obj as Polygon, objects);
        if (obj.type === 'measurement') drawMeasurement(ctx, obj as Measurement, viewTransform.zoom);
        if (obj.type === 'angle') drawAngle(ctx, obj as Angle, objects, viewTransform.zoom);
      });

      if (interactionState?.tool === 'polygon' && interactionState.pointIds.length > 0) {
        drawInprogressPolygon(ctx, interactionState.pointIds, lastMousePos.current.world, objects);
      }

      ctx.restore();
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [objects, viewTransform, selectedObjectIds, interactionState]);

  const screenToWorld = (x: number, y: number): {x: number, y: number} => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const { width, height } = canvas;
    return {
      x: (x - width / 2 - viewTransform.x) / viewTransform.zoom,
      y: -(y - height / 2 - viewTransform.y) / viewTransform.zoom
    };
  };
  // #endregion

  // #region Canvas Drawing Helpers
  const drawGrid = (ctx: CanvasRenderingContext2D, bounds: any, zoom: number) => {
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 1 / zoom;

    // Determine grid step based on zoom level to avoid clutter
    const pixelsPerUnit = zoom;
    const minGridSpacingPixels = 60; // Aim for at least 60px between grid lines
    const minUnitsPerLine = minGridSpacingPixels / pixelsPerUnit;

    const magnitude = Math.pow(10, Math.floor(Math.log10(minUnitsPerLine)));
    const residual = minUnitsPerLine / magnitude;
    let step;
    if (residual > 5) {
        step = 10 * magnitude;
    } else if (residual > 2) {
        step = 5 * magnitude;
    } else if (residual > 1) {
        step = 2 * magnitude;
    } else {
        step = magnitude;
    }

    const startXIndex = Math.floor(bounds.minX / step);
    const endXIndex = Math.ceil(bounds.maxX / step);
    const startYIndex = Math.floor(bounds.minY / step);
    const endYIndex = Math.ceil(bounds.maxY / step);

    // Draw grid lines using an index-based loop to avoid floating point errors
    for (let i = startXIndex; i <= endXIndex; i++) {
        const x = i * step;
        ctx.moveTo(x, bounds.minY);
        ctx.lineTo(x, bounds.maxY);
    }

    for (let i = startYIndex; i <= endYIndex; i++) {
        const y = i * step;
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
    }
    ctx.stroke();

    // Draw labels
    ctx.save();
    ctx.fillStyle = 'hsl(var(--muted-foreground))';
    ctx.font = `${12 / zoom}px sans-serif`;
    ctx.scale(1, -1); // Flip text to be upright
    
    const labelPadding = 5 / zoom;
    // Clamp decimal places to avoid floating point issues and toFixed limitations.
    const decimalPlaces = Math.min(15, Math.max(0, Math.ceil(-Math.log10(step))));
    
    // X-axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = startXIndex; i <= endXIndex; i++) {
        const x = i * step;
        if (Math.abs(x) > 1e-9) { // Don't draw label at origin
            const label = x.toFixed(decimalPlaces);
            ctx.fillText(label, x, -labelPadding);
        }
    }
    
    // Y-axis labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = startYIndex; i <= endYIndex; i++) {
        const y = i * step;
        if (Math.abs(y) > 1e-9) { // Don't draw label at origin
            const label = y.toFixed(decimalPlaces);
            ctx.fillText(label, -labelPadding, -y);
        }
    }
    
    // Origin label
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText('0', labelPadding, -labelPadding);
    ctx.restore();
  };

  const drawAxes = (ctx: CanvasRenderingContext2D, bounds: any) => {
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2 / viewTransform.zoom;
    ctx.moveTo(bounds.minX, 0);
    ctx.lineTo(bounds.maxX, 0);
    ctx.moveTo(0, bounds.minY);
    ctx.lineTo(0, bounds.maxY);
    ctx.stroke();
  };
  
  const drawFunction = (ctx: CanvasRenderingContext2D, func: Func, bounds: any, scope: any) => {
    ctx.beginPath();
    ctx.strokeStyle = func.color;
    
    if (selectedObjectIds.includes(func.id)) {
        ctx.lineWidth = 4 / viewTransform.zoom;
        ctx.shadowColor = func.color;
        ctx.shadowBlur = 15 / viewTransform.zoom;
    } else {
        ctx.lineWidth = 2 / viewTransform.zoom;
        ctx.shadowBlur = 0;
    }
    
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
        } catch (e) { /* ignore */ }
    }
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  const drawPoint = (ctx: CanvasRenderingContext2D, point: Point) => {
    ctx.beginPath();
    if (point.isDerived) {
        ctx.fillStyle = 'hsl(var(--accent))';
        ctx.arc(point.x, point.y, 5 / viewTransform.zoom, 0, 2 * Math.PI);
    } else {
        ctx.fillStyle = 'hsl(var(--primary))';
        ctx.arc(point.x, point.y, 4 / viewTransform.zoom, 0, 2 * Math.PI);
    }
    ctx.fill();
  };

  const drawSegment = (ctx: CanvasRenderingContext2D, segment: Segment, allObjects: GraphObject[]) => {
      const p1 = allObjects.find(o => o.id === segment.point1Id) as Point;
      const p2 = allObjects.find(o => o.id === segment.point2Id) as Point;
      if (!p1 || !p2) return;

      ctx.beginPath();
      ctx.strokeStyle = segment.color;
      ctx.lineWidth = 2 / viewTransform.zoom;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
  };
  
  const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon, allObjects: GraphObject[]) => {
    if (polygon.pointIds.length < 2) return;
    const points = polygon.pointIds.map(id => allObjects.find(o => o.id === id) as Point).filter(Boolean);
    if (points.length !== polygon.pointIds.length || points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    
    // 80 is hex for 50% opacity
    ctx.fillStyle = `${polygon.color}80`;
    ctx.fill();
    ctx.strokeStyle = polygon.color;
    ctx.lineWidth = 2 / viewTransform.zoom;
    ctx.stroke();
  };

  const drawInprogressPolygon = (ctx: CanvasRenderingContext2D, pointIds: string[], currentMousePos: {x:number, y:number}, allObjects: GraphObject[]) => {
    const points = pointIds.map(id => allObjects.find(o => o.id === id) as Point).filter(Boolean);
    if (points.length === 0) return;

    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2 / viewTransform.zoom;

    // Draw solid lines between existing points
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(currentMousePos.x, currentMousePos.y);
    ctx.stroke();
    
    // If more than 1 point, draw dashed line from mouse back to start
    if (points.length > 1) {
        ctx.beginPath();
        ctx.setLineDash([5 / viewTransform.zoom, 5 / viewTransform.zoom]);
        ctx.moveTo(currentMousePos.x, currentMousePos.y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
  };


  const drawMeasurement = (ctx: CanvasRenderingContext2D, measurement: Measurement, zoom: number) => {
    ctx.save();
    ctx.font = `${12 / zoom}px Arial`;
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.scale(1, -1); // Flip text back
    ctx.fillText(measurement.label, measurement.x, -measurement.y);
    ctx.restore();
  };

  const drawAngle = (ctx: CanvasRenderingContext2D, angle: Angle, allObjects: GraphObject[], zoom: number) => {
    const p1 = allObjects.find(o => o.id === angle.arm1PointId) as Point;
    const vertex = allObjects.find(o => o.id === angle.vertexPointId) as Point;
    const p2 = allObjects.find(o => o.id === angle.arm2PointId) as Point;
    if (!p1 || !vertex || !p2) return;

    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if(mag1 === 0 || mag2 === 0) return;

    const angleRad = Math.acos(dotProduct / (mag1 * mag2));
    const angleDeg = angleRad * (180 / Math.PI);

    const startAngle = Math.atan2(v1.y, v1.x);
    const endAngle = Math.atan2(v2.y, v2.x);
    const arcRadius = Math.min(mag1, mag2) * 0.3;

    ctx.beginPath();
    ctx.strokeStyle = angle.color;
    ctx.lineWidth = 1.5 / zoom;
    ctx.arc(vertex.x, vertex.y, arcRadius, startAngle, endAngle);
    ctx.stroke();
    
    // Draw text
    const textAngle = startAngle + (angleRad / 2) * (endAngle > startAngle ? 1 : -1);
    const textX = vertex.x + arcRadius * 1.3 * Math.cos(textAngle);
    const textY = vertex.y + arcRadius * 1.3 * Math.sin(textAngle);
    
    ctx.save();
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.font = `${12 / zoom}px Arial`;
    ctx.scale(1, -1);
    ctx.fillText(`${angleDeg.toFixed(1)}°`, textX, -textY);
    ctx.restore();
  };
  // #endregion

  // #region Tool Logic & Event Handlers
  const findClosestFunction = useCallback((pos: {x:number, y:number}) => {
    let closestFunc: Func | null = null;
    let minDistance = Infinity;
    const scope = objects.filter(o => o.type === 'slider').reduce((acc, s) => ({ ...acc, [(s as any).name]: (s as any).value }), {});
    objects.forEach(obj => {
      if (obj.type === 'function') {
        try {
          const y = (obj as Func).compiled.evaluate({ ...scope, x: pos.x });
          const distance = Math.abs(y - pos.y);
          if (distance < minDistance) {
            minDistance = distance;
            closestFunc = obj as Func;
          }
        } catch (e) {}
      }
    });
    // Check if click is close enough to the function line
    if (closestFunc && minDistance < 1 / viewTransform.zoom * 20) {
        return closestFunc;
    }
    return null;
  }, [objects, viewTransform.zoom]);

  const findClosestPoint = useCallback((pos: {x:number, y:number}) => {
    let closestPoint: Point | null = null;
    let minDistance = Infinity;
    const clickTolerance = 1 / viewTransform.zoom * 20;

    objects.forEach(obj => {
        if (obj.type === 'point') {
            const distance = Math.sqrt(Math.pow(obj.x - pos.x, 2) + Math.pow(obj.y - pos.y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = obj;
            }
        }
    });
    
    return minDistance < clickTolerance ? closestPoint : null;
  }, [objects, viewTransform.zoom]);

  const findClosestObject = useCallback((pos: {x:number, y:number}) => {
    let closestObj: GraphObject | null = null;
    let minDistance = Infinity;
    const clickTolerance = 1 / viewTransform.zoom * 20;

    objects.forEach(obj => {
        let distance = Infinity;
        if (obj.type === 'point') {
            distance = Math.sqrt(Math.pow(obj.x - pos.x, 2) + Math.pow(obj.y - pos.y, 2));
        } else if (obj.type === 'function') {
             try {
                const scope = objects.filter(o => o.type === 'slider').reduce((acc, s) => ({ ...acc, [(s as any).name]: (s as any).value }), {});
                const y = obj.compiled.evaluate({ ...scope, x: pos.x });
                distance = Math.abs(y - pos.y);
            } catch (e) {}
        }

        if (distance < minDistance) {
            minDistance = distance;
            closestObj = obj;
        }
    });

    return minDistance < clickTolerance ? closestObj : null;
  }, [objects, viewTransform.zoom]);

  const bisection = (f: (x: number) => number, a: number, b: number, tol = 1e-7, maxIter = 100) => {
      let fa = f(a);
      if (Math.abs(fa) < tol) return a;
      let fb = f(b);
      if (Math.abs(fb) < tol) return b;
      if (fa * fb >= 0) return null;
      let c = a;
      for (let i = 0; i < maxIter; i++) {
        c = (a + b) / 2;
        let fc = f(c);
        if (fc === 0 || (b - a) / 2 < tol) return c;
        if (fa * fc < 0) { b = c; } else { a = c; fa = fc; }
      }
      return c;
  };

  const findPoints = useCallback((
      compiledFunc: ReturnType<MathNode['compile']>, 
      bounds: {minX: number, maxX: number}, 
      labelPrefix: string,
      yCalculator?: (x:number) => number
  ) => {
    const { minX, maxX } = bounds;
    const points: { x: number; y: number }[] = [];
    const step = (maxX - minX) / 1000;
    
    for (let x = minX; x < maxX; x += step) {
      try {
        const y1 = compiledFunc.evaluate({x});
        const y2 = compiledFunc.evaluate({x: x + step});
        if (y1 * y2 < 0) {
          const rootX = bisection((xVal) => compiledFunc.evaluate({x: xVal}), x, x + step);
          if (rootX !== null) {
              const yVal = yCalculator ? yCalculator(rootX) : 0;
              points.push({ x: rootX, y: yVal });
          }
        }
      } catch (e) { /* ignore */ }
    }
    
    if(points.length > 0) {
      const newPoints: Point[] = points.map(p => ({
          id: crypto.randomUUID(), type: 'point', x: p.x, y: p.y,
          label: `${labelPrefix} (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`, isDerived: true,
      }));
      setObjects(prev => [...prev.filter(o => !(o.type === 'point' && o.label.startsWith(labelPrefix))), ...newPoints]);
      toast({ title: `Found ${newPoints.length} ${labelPrefix.toLowerCase()}(s).` });
    } else {
      toast({ variant: 'destructive', title: `No ${labelPrefix.toLowerCase()} found in the current view.` });
    }
  }, [toast]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    lastMousePos.current = { x: e.clientX, y: e.clientY, world: worldPos };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    if (isDragging && activeTool === 'move') {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewTransform(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }

    lastMousePos.current = { x: e.clientX, y: e.clientY, world: worldPos };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const scope = objects.filter(o => o.type === 'slider').reduce((acc, s) => ({ ...acc, [(s as any).name]: (s as any).value }), {});
    const viewBounds = {
        minX: screenToWorld(0, 0).x,
        maxX: screenToWorld(canvasRef.current!.width, 0).x,
    };
    
    const clickedPoint = findClosestPoint(worldPos);

    switch (activeTool) {
      case 'point':
        addPoint(worldPos.x, worldPos.y);
        break;

      case 'segment':
        {
            const pointId = clickedPoint?.id ?? addPoint(worldPos.x, worldPos.y, true);
            if (!interactionState) {
                setInteractionState({ tool: 'segment', point1Id: pointId });
                toast({ description: 'First point selected. Select second point.' });
            } else if (interactionState.tool === 'segment') {
                addSegment(interactionState.point1Id, pointId);
                setInteractionState(null);
                toast({ title: 'Segment created.' });
            }
        }
        break;
      
      case 'polygon': {
          const clickedOnExistingPoint = findClosestPoint(worldPos);
          
          if (!interactionState || interactionState.tool !== 'polygon') {
              // Start a new polygon
              const pointId = clickedOnExistingPoint?.id ?? addPoint(worldPos.x, worldPos.y, true);
              setInteractionState({ tool: 'polygon', pointIds: [pointId] });
              toast({ description: 'First point selected. Click to add more vertices or click the first point to finish.' });
          } else {
              // Continue polygon
              const firstPointId = interactionState.pointIds[0];
              
              // Check if user clicked the first point to close the polygon
              if (clickedOnExistingPoint && clickedOnExistingPoint.id === firstPointId && interactionState.pointIds.length > 2) {
                  addPolygon(interactionState.pointIds);
                  setInteractionState(null);
                  toast({ title: 'Polygon created.' });
              } else {
                  // Add a new point to the polygon
                  const newPointId = clickedOnExistingPoint?.id ?? addPoint(worldPos.x, worldPos.y, true);
                  // Avoid adding the same point twice in a row
                  if (newPointId === interactionState.pointIds[interactionState.pointIds.length - 1]) return;
                  
                  setInteractionState({
                      tool: 'polygon',
                      pointIds: [...interactionState.pointIds, newPointId]
                  });
                  toast({ description: 'Vertex added.' });
              }
          }
          break;
      }

      case 'distance':
        {
            const pointId = clickedPoint?.id;
            if (!pointId) {
                toast({ variant: 'destructive', description: 'Click on a point to measure distance.' });
                return;
            }
            if (!interactionState) {
                setInteractionState({ tool: 'distance', point1Id: pointId });
                toast({ description: 'First point selected. Select second point.' });
            } else if (interactionState.tool === 'distance') {
                measureDistance(interactionState.point1Id, pointId);
                setInteractionState(null);
            }
        }
        break;

      case 'angle':
        {
          const pointId = clickedPoint?.id;
          if (!pointId) {
            toast({ variant: 'destructive', description: 'Click on a point to define the angle.' });
            return;
          }
          if (!interactionState || interactionState.tool !== 'angle') {
            setInteractionState({ tool: 'angle', step: 'vertex', pointIds: [pointId] });
            toast({ description: 'Vertex point selected. Select first arm point.' });
          } else if (interactionState.step === 'vertex') {
            setInteractionState({ tool: 'angle', step: 'arm1', pointIds: [interactionState.pointIds[0], pointId] });
            toast({ description: 'First arm point selected. Select second arm point.' });
          } else if (interactionState.step === 'arm1') {
            addAngle(interactionState.pointIds[1], interactionState.pointIds[0], pointId);
            setInteractionState(null);
            toast({ title: 'Angle created.' });
          }
        }
        break;
      
      case 'roots': {
        const func = findClosestFunction(worldPos);
        if (func) {
            findPoints(func.compiled, viewBounds, 'Root');
        } else {
            toast({ variant: 'destructive', title: 'No function selected', description: 'Click closer to a function to find its roots.' });
        }
        break;
      }

      case 'intersect': {
        const func = findClosestFunction(worldPos);
        if (!func) { return; }

        if (selectedObjectIds.length === 0) {
            setSelectedObjectIds([func.id]);
            toast({ description: `Function y=${func.expression} selected. Select another to find intersections.` });
        } else if (selectedObjectIds.length === 1 && selectedObjectIds[0] !== func.id) {
            const func1 = objects.find(o => o.id === selectedObjectIds[0]) as Func;
            const func2 = func;
            
            try {
                const diffExpression = `(${func1.expression}) - (${func2.expression})`;
                const compiledDiff = math.parse(diffExpression).compile();
                findPoints(compiledDiff, viewBounds, 'Intersect', (x) => func1.compiled.evaluate({x}));
            } catch(e) {
                toast({ variant: 'destructive', title: 'Could not find intersections.' });
            }
            clearSelection();
        }
        break;
      }
      
      case 'extremum': {
        const func = findClosestFunction(worldPos);
        if (func) {
            try {
                const derivative = math.derivative(func.expression, 'x').compile();
                findPoints(derivative, viewBounds, 'Extremum', (x) => func.compiled.evaluate({x}));
            } catch(e) {
                toast({ variant: 'destructive', title: 'Could not compute derivative.' });
            }
        } else {
            toast({ variant: 'destructive', title: 'No function selected.' });
        }
        break;
      }

      case 'delete': {
        const objToDelete = findClosestObject(worldPos);
        if (objToDelete) {
            deleteObject(objToDelete.id);
            toast({ description: 'Object deleted.' });
        }
        break;
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = (Math.abs(e.clientX - lastMousePos.current.x) > 2 || Math.abs(e.clientY - lastMousePos.current.y) > 2);
    setIsDragging(false);
    if (activeTool === 'move' && wasDragging) return;
    
    handleCanvasClick(e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? viewTransform.zoom * zoomFactor : viewTransform.zoom / zoomFactor;
    setViewTransform(v => ({ ...v, zoom: Math.max(0.1, newZoom) }));
  };
  // #endregion

  // #region Object Management
  const addObject = (type: 'function' | 'slider') => {
    if (type === 'function') {
        const newFunc: Func = {
            id: crypto.randomUUID(), type: 'function', expression: 'x^2',
            compiled: math.parse('x^2').compile(), color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        };
        setObjects(prev => [...prev, newFunc]);
    } else if (type === 'slider') {
        const sliderName = String.fromCharCode(97 + objects.filter(o => o.type === 'slider').length);
        const newSlider = {
            id: crypto.randomUUID(), type: 'slider', name: sliderName,
            min: -5, max: 5, step: 0.1, value: 1,
        };
        setObjects(prev => [...prev, newSlider]);
    }
  };

  const addPoint = (x: number, y: number, returnId = false): string => {
    const newPoint: Point = {
        id: crypto.randomUUID(), type: 'point', x, y,
        label: `(${x.toFixed(2)}, ${y.toFixed(2)})`
    };
    setObjects(prev => [...prev, newPoint]);
    if (returnId) return newPoint.id;
    return '';
  };
  
  const addSegment = (point1Id: string, point2Id: string) => {
    const newSegment: Segment = {
        id: crypto.randomUUID(),
        type: 'segment',
        point1Id,
        point2Id,
        color: 'hsl(var(--primary))'
    };
    setObjects(prev => [...prev, newSegment]);
  };

  const addPolygon = (pointIds: string[]) => {
    const newPolygon: Polygon = {
        id: crypto.randomUUID(),
        type: 'polygon',
        pointIds,
        color: 'hsl(var(--primary))'
    };
    setObjects(prev => [...prev, newPolygon]);
  };

  const measureDistance = (point1Id: string, point2Id: string) => {
      const p1 = objects.find(o => o.id === point1Id) as Point;
      const p2 = objects.find(o => o.id === point2Id) as Point;
      if (!p1 || !p2) return;

      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      const newMeasurement: Measurement = {
          id: crypto.randomUUID(),
          type: 'measurement',
          label: dist.toFixed(3),
          x: midX,
          y: midY,
      };
      setObjects(prev => [...prev, newMeasurement]);
      toast({ title: `Distance: ${dist.toFixed(3)}` });
  };

  const addAngle = (arm1PointId: string, vertexPointId: string, arm2PointId: string) => {
    const newAngle: Angle = {
      id: crypto.randomUUID(),
      type: 'angle',
      arm1PointId,
      vertexPointId,
      arm2PointId,
      color: 'hsl(var(--accent))',
    };
    setObjects(prev => [...prev, newAngle]);
  };

  const updateObject = (id: string, updates: Partial<GraphObject>) => {
    setObjects(prev => prev.map(obj => {
      if (obj.id === id) {
        const updatedObj = { ...obj, ...updates };
        if (updatedObj.type === 'function' && 'expression' in updates) {
          try {
            (updatedObj as Func).compiled = math.parse((updatedObj as Func).expression).compile();
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
    setObjects(prev => {
        const objectToDelete = prev.find(o => o.id === id);
        let idsToDelete = new Set([id]);

        // If a point is deleted, also delete segments and polygons connected to it
        if (objectToDelete?.type === 'point') {
            prev.forEach(obj => {
                if (obj.type === 'segment' && (obj.point1Id === id || obj.point2Id === id)) {
                    idsToDelete.add(obj.id);
                }
                if (obj.type === 'polygon' && obj.pointIds.includes(id)) {
                    idsToDelete.add(obj.id);
                }
                if (obj.type === 'angle' && (obj.arm1PointId === id || obj.vertexPointId === id || obj.arm2PointId === id)) {
                    idsToDelete.add(obj.id);
                }
            });
        }
        // Also remove derived points that depend on a function being deleted
        if (objectToDelete?.type === 'function') {
            prev.forEach(obj => {
                if(obj.type === 'point' && obj.isDerived) {
                    idsToDelete.add(obj.id)
                }
            })
        }
        return prev.filter(obj => !idsToDelete.has(obj.id));
    });
  };
  
  const handleSave = () => {
    const dataToSave = {
        objects: objects.map(o => o.type === 'function' ? { ...o, compiled: undefined } : o),
        viewTransform,
    };
    addToHistory({ type: 'graph', data: dataToSave, name: `Saved Interactive Graph` });
    toast({ title: "Saved!", description: "Graph saved to history." });
  };
  // #endregion

  const objectManagementProps = { objects, updateObject, deleteObject, addObject };

  if (isMobile) {
    return (
      <div className="h-full w-full relative bg-background">
        <div className="w-full h-full">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setIsDragging(false)}
              onWheel={handleWheel}
            />
        </div>
        <div className="absolute top-4 left-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Open Tools and Objects</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
              <Tabs defaultValue="tools" className="w-full flex-grow flex flex-col overflow-y-hidden">
                <TabsList className="grid w-full grid-cols-2 rounded-none">
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="objects">Objects</TabsTrigger>
                </TabsList>
                <TabsContent value="tools" className="flex-grow overflow-y-auto">
                  <GraphToolsSidebar activeTool={activeTool} setActiveTool={setActiveTool} />
                </TabsContent>
                <TabsContent value="objects" className="flex-grow overflow-y-auto">
                  <GraphObjectsPanel {...objectManagementProps} />
                </TabsContent>
              </Tabs>
              <div className='p-4 border-t shrink-0'>
                 <Button onClick={handleSave} className="w-full"><Save className="h-4 w-4 mr-2" />Save Graph</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex">
      <div className='w-60 border-r shrink-0'>
        <GraphToolsSidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      </div>
      
      <Card className="w-80 h-full flex flex-col rounded-none border-0 border-r shrink-0">
        <CardHeader>
          <CardTitle>Objects</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
            <GraphObjectsPanel {...objectManagementProps} />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
           <Button onClick={handleSave} variant="outline"><Save className="h-4 w-4 mr-2" />Save Graph</Button>
        </CardFooter>
      </Card>
      
      <div className="flex-grow h-full relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          onWheel={handleWheel}
        />
      </div>
    </div>
  );
}
