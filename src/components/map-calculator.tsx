"use client";

import React, { useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Save } from 'lucide-react';
import { type Coordinate, calculateDistance, calculateArea } from '@/lib/geo';
import { addToHistory } from '@/lib/history';
import { useToast } from '@/hooks/use-toast';

export function MapCalculator() {
  const [pins, setPins] = useState<Coordinate[]>([]);
  const { toast } = useToast();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const totalDistance = useMemo(() => {
    if (pins.length < 2) return 0;
    let distance = 0;
    for (let i = 0; i < pins.length - 1; i++) {
      distance += calculateDistance(pins[i], pins[i + 1]);
    }
    return distance;
  }, [pins]);

  const area = useMemo(() => {
    return calculateArea(pins);
  }, [pins]);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.detail.latLng) {
      const { lat, lng } = event.detail.latLng;
      setPins([...pins, { lat: lat(), lng: lng() }]);
    }
  };

  const clearPins = () => {
    setPins([]);
  };

  const handleSave = () => {
    if (pins.length > 0) {
      addToHistory({
        type: 'map',
        data: { pins, totalDistance, area },
        name: 'Saved Map Calculation',
      });
      toast({
        title: "Saved!",
        description: "Map calculation saved to history.",
      });
    }
  };

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-4">
        <p className="text-destructive">Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-full relative">
        <Map
          defaultCenter={{ lat: 51.5072, lng: -0.1276 }}
          defaultZoom={10}
          mapId="geocalc-map"
          onClick={handleMapClick}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
        >
          {pins.map((pin, index) => (
            <AdvancedMarker key={index} position={pin}>
              <Pin background={'#4285F4'} glyphColor={'#fff'} borderColor={'#fff'} />
            </AdvancedMarker>
          ))}
        </Map>
        <Card className="absolute top-4 left-4 w-80 shadow-lg">
          <CardHeader>
            <CardTitle>Map Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Click on the map to drop pins.</p>
            <div className='space-y-2'>
              <p><strong>Pins dropped:</strong> {pins.length}</p>
              {pins.length >= 2 && <p><strong>Total Distance:</strong> {totalDistance.toFixed(2)} km</p>}
              {pins.length >= 3 && <p><strong>Area:</strong> {(area / 1000000).toFixed(2)} km²</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" disabled={pins.length === 0}><Save className="h-4 w-4 mr-2" /> Save</Button>
              <Button onClick={clearPins} variant="destructive" size="sm" disabled={pins.length === 0}><Trash2 className="h-4 w-4 mr-2" /> Clear</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </APIProvider>
  );
}
