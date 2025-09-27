
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDailyContent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  getAllSentences,
  type DatedSentence,
} from '@/lib/daily-content';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type DailyContent = {
  dateString: string;
  sentence: string;
};

function HistoricalEntry({
  entry,
  onSelect,
  showSentence,
}: {
  entry: DatedSentence;
  onSelect: (date: Date) => void;
  showSentence: boolean;
}) {
  return (
    <div
      className="flex items-center gap-4 p-2 rounded-md hover:bg-muted cursor-pointer"
      onClick={() => onSelect(entry.date)}
    >
      <div className="flex flex-col">
        <span className="font-semibold">
          {entry.date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC',
          })}
        </span>
        {showSentence && (
          <p className="text-sm text-muted-foreground text-balance">
            {entry.sentence}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [spoilerAlert, setSpoilerAlert] = useState(true);
  const { toast } = useToast();
  
  const allSentences = useMemo(() => getAllSentences(), []);

  const fetchContent = async (date: Date) => {
    try {
      setLoading(true);
      setShowContent(false);
      setContent(null);

      const yearAgo = new Date(Date.UTC(date.getUTCFullYear() - 1, date.getUTCMonth(), date.getUTCDate()));
      
      const dateString = date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC',
      });

      const result = await getDailyContent(yearAgo);
      if (result.success && result.sentence) {
        setContent({
          dateString,
          sentence: result.sentence,
        });
      } else {
        setContent({
          dateString,
          sentence: "No memory found for this day.",
        });
        if (result.error) {
           throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          "Could not fetch today's memory. Please try again later.",
      });
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    fetchContent(todayUTC);
  }, []);

  const historicalSentences = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate()));

    return allSentences.filter(entry => {
       const entryDate = new Date(entry.date);
       return entryDate.getTime() <= oneYearAgo.getTime();
    });
  }, [allSentences]);


  useEffect(() => {
    if (!loading && content) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, content]);

  const handleHistoricalSelect = (date: Date) => {
    setIsDialogOpen(false);
    const futureDate = new Date(date);
    futureDate.setUTCFullYear(date.getUTCFullYear() + 1);
    fetchContent(futureDate);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 h-12 w-12"
          >
            <History className="h-8 w-8" />
            <span className="sr-only">View History</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="h-screen w-screen max-w-full flex flex-col">
          <DialogHeader>
            <DialogTitle>Historical Memories</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 px-1 py-4">
            <Switch
              id="spoiler-alert"
              checked={spoilerAlert}
              onCheckedChange={setSpoilerAlert}
            />
            <Label htmlFor="spoiler-alert">Spoiler Alert</Label>
          </div>
          <ScrollArea className="flex-grow">
            <div className="mt-4 flex flex-col gap-2 pr-4">
              {historicalSentences.length > 0 ? (
                historicalSentences.map((entry) => (
                  <HistoricalEntry
                    key={entry.date.toISOString()}
                    entry={entry}
                    onSelect={handleHistoricalSelect}
                    showSentence={!spoilerAlert}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  No memories found.
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner className="h-12 w-12 text-primary" />
          <p className="text-muted-foreground">Recalling today's memory...</p>
        </div>
      ) : content ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center opacity-0',
            showContent && 'animate-fade-in'
          )}
        >
          <div className="flex flex-col gap-2 mb-24">
            <p className="text-md md:text-lg text-foreground/80">
              {content.dateString}
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-wider">
              One year ago today...
            </h1>
          </div>
          <blockquote className="relative max-w-2xl">
            <p className="text-2xl md:text-3xl text-primary italic text-balance">
              <span className="absolute -left-4 -top-2 text-6xl text-primary/20 font-serif">“</span>
              {content.sentence}
              <span className="absolute -right-4 -bottom-4 text-6xl text-primary/20 font-serif">”</span>
            </p>
          </blockquote>

        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
            <path d="M6 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2" />
            <path d="M6 6h.01" />
            <path d="M6 18h.01" />
            <path d="m13 6-4 6h6l-4 6" />
          </svg>
          <h2 className="text-2xl font-semibold">Something went wrong</h2>
          <p>
            We couldn't create your memory for today. Please check back later.
          </p>
        </div>
      )}
    </main>
  );
}
