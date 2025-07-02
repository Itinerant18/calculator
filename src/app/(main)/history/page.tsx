"use client";

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { HistoryItem, getHistory, deleteHistoryItem, clearHistory } from '@/lib/history';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Map as MapIcon, MessageSquare, Share2, Trash2, AlertTriangle } from 'lucide-react';
import Latex from 'react-latex-next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const HistoryCard = ({ item, onShare, onDelete }: { item: HistoryItem, onShare: (id: string) => void, onDelete: (id: string) => void }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const icons = {
    calculator: <Calculator className="h-6 w-6 text-primary" />,
    chat: <MessageSquare className="h-6 w-6 text-primary" />,
    map: <MapIcon className="h-6 w-6 text-primary" />,
  };

  const renderContent = () => {
    switch (item.type) {
      case 'calculator':
        return <p className="text-2xl font-mono">{item.data.calculation}</p>;
      case 'chat':
        return (
          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
            {item.data.messages.slice(0, 4).map((msg: any, index: number) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Latex>{msg.content.substring(0, 100)}{msg.content.length > 100 ? '...' : ''}</Latex>
                </p>
              </div>
            ))}
            {item.data.messages.length > 4 && <p className='text-center text-muted-foreground'>...</p>}
          </div>
        );
      case 'map':
        return (
          <div className="text-sm space-y-1">
            <p><strong>Pins:</strong> {item.data.pins.length}</p>
            <p><strong>Distance:</strong> {item.data.totalDistance.toFixed(2)} km</p>
            {item.data.area > 0 && <p><strong>Area:</strong> {(item.data.area / 1000000).toFixed(2)} km²</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card ref={cardRef} id={`history-card-${item.id}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className='flex items-center gap-3'>
                {icons[item.type]}
                <div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{new Date(item.timestamp).toLocaleString()}</CardDescription>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onShare(item.id)}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
      </CardFooter>
    </Card>
  );
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setHistory(getHistory());
  }, []);

  const handleShare = (id: string) => {
    const cardElement = document.getElementById(`history-card-${id}`);
    if (cardElement) {
      html2canvas(cardElement, {
        useCORS: true,
        backgroundColor: window.getComputedStyle(document.body).getPropertyValue('background-color'),
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `geocalc-history-${id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  const handleDelete = (id: string) => {
    setHistory(deleteHistoryItem(id));
  };

  const handleClearAll = () => {
    clearHistory();
    setHistory([]);
  }

  if (!isClient) {
    return null; // or a loading skeleton
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">History</h1>
            {history.length > 0 && (
                 <AlertDialog>
                 <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2"/>Clear All</Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                   <AlertDialogHeader>
                     <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                     <AlertDialogDescription>
                       This will permanently delete all your saved history. This action cannot be undone.
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                     <AlertDialogAction onClick={handleClearAll}>Continue</AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
            )}
        </div>
      
      {history.length === 0 ? (
        <Card className="text-center p-8">
            <CardHeader>
                <div className='mx-auto bg-muted rounded-full p-3 w-fit'>
                    <AlertTriangle className='h-8 w-8 text-muted-foreground'/>
                </div>
                <CardTitle>No History Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Your saved calculations, chats, and map data will appear here.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {history.map(item => (
            <HistoryCard key={item.id} item={item} onShare={handleShare} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
