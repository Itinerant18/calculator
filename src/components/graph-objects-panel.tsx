
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider as SliderComponent } from '@/components/ui/slider';
import { Trash2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { GraphObject, Func, Slider, Point, Segment, Polygon, Angle } from '@/lib/graph-types';

export function GraphObjectsPanel({ 
  objects, 
  updateObject, 
  deleteObject, 
  addObject 
}: { 
  objects: GraphObject[];
  updateObject: (id: string, updates: Partial<GraphObject>) => void;
  deleteObject: (id: string) => void;
  addObject: (type: 'function' | 'slider') => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
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
                          value={[slider.value]} min={slider.min} max={slider.max} step={slider.step}
                          onValueChange={([val]) => updateObject(slider.id, { value: val })}
                      />
                  </div>
              );
          })}
          <Button onClick={() => addObject('slider')} variant="outline" size="sm" className="mt-2"><Plus className="h-4 w-4 mr-2" />Add Slider</Button>
        </div>
         <Separator />
         <div>
          <Label className="text-lg font-semibold">Points</Label>
           <div className='space-y-1 mt-2 text-sm'>
           {objects.filter(o => o.type === 'point').map(obj => {
              const point = obj as Point;
              return (
                  <div key={point.id} className="flex justify-between items-center">
                     <span>{point.label}</span>
                     <Button variant="ghost" size="icon" onClick={() => deleteObject(point.id)} className='h-6 w-6'><Trash2 className="h-4 w-4" /></Button>
                  </div>
              );
          })}
           </div>
        </div>
        <Separator />
        <div>
          <Label className="text-lg font-semibold">Segments</Label>
           <div className='space-y-1 mt-2 text-sm'>
           {objects.filter(o => o.type === 'segment').map(obj => {
              const segment = obj as Segment;
              const p1 = objects.find(o => o.id === segment.point1Id) as Point;
              const p2 = objects.find(o => o.id === segment.point2Id) as Point;
              return (
                  <div key={segment.id} className="flex justify-between items-center">
                     <span>Segment {p1?.label} to {p2?.label}</span>
                     <Button variant="ghost" size="icon" onClick={() => deleteObject(segment.id)} className='h-6 w-6'><Trash2 className="h-4 w-4" /></Button>
                  </div>
              );
          })}
           </div>
        </div>
        <Separator />
        <div>
          <Label className="text-lg font-semibold">Polygons</Label>
           <div className='space-y-1 mt-2 text-sm'>
           {objects.filter(o => o.type === 'polygon').map(obj => {
              const polygon = obj as Polygon;
              return (
                  <div key={polygon.id} className="flex justify-between items-center">
                     <span>Polygon ({polygon.pointIds.length} vertices)</span>
                     <Button variant="ghost" size="icon" onClick={() => deleteObject(polygon.id)} className='h-6 w-6'><Trash2 className="h-4 w-4" /></Button>
                  </div>
              );
          })}
           </div>
        </div>
        <Separator />
        <div>
          <Label className="text-lg font-semibold">Angles</Label>
           <div className='space-y-1 mt-2 text-sm'>
           {objects.filter(o => o.type === 'angle').map(obj => {
              const angle = obj as Angle;
              const p1 = objects.find(o => o.id === angle.arm1PointId) as Point;
              const vertex = objects.find(o => o.id === angle.vertexPointId) as Point;
              const p2 = objects.find(o => o.id === angle.arm2PointId) as Point;

              if (!p1 || !vertex || !p2) return null;

              const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
              const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
              const dotProduct = v1.x * v2.x + v1.y * v2.y;
              const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
              const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
              const angleRad = Math.acos(dotProduct / (mag1 * mag2));
              const angleDeg = angleRad * (180 / Math.PI);

              return (
                  <div key={angle.id} className="flex justify-between items-center">
                     <span>Angle: {angleDeg.toFixed(1)}°</span>
                     <Button variant="ghost" size="icon" onClick={() => deleteObject(angle.id)} className='h-6 w-6'><Trash2 className="h-4 w-4" /></Button>
                  </div>
              );
          })}
           </div>
        </div>
      </div>
    </ScrollArea>
  );
}
