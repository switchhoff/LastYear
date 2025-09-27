
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDailyContent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  getAllSentences,
  type DatedSentence,
} from '@/lib/daily-content';
import { ScrollArea } from '@/components/ui/scroll-area';

type DailyContent = {
  dateString: string;
  sentence: string;
};

function HistoricalEntry({
  entry,
  onSelect,
}: {
  entry: DatedSentence;
  onSelect: (date: Date) => void;
}) {
  return (
    <div
      className="flex items-center gap-4 p-2 rounded-md hover:bg-muted cursor-pointer"
      onClick={() => onSelect(entry.date)}
    >
      <div className="flex flex-col">
        <span className="font-semibold">
          {entry.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </span>
        <p className="text-sm text-muted-foreground">"{entry.sentence}"</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();
  
  const allSentences = useMemo(() => getAllSentences(), []);

  const fetchContent = async (date: Date) => {
    try {
      setLoading(true);
      setShowContent(false);
      setContent(null);

      const yearAgo = new Date(Date.UTC(date.getUTCFullYear() - 1, date.getUTCMonth(), date.getUTCDate()));
      
      const dateString = yearAgo.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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
    setIsSheetOpen(false);
    const futureDate = new Date(date);
    futureDate.setUTCFullYear(date.getUTCFullYear() + 1);
    fetchContent(futureDate);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6"
          >
            <History className="h-6 w-6" />
            <span className="sr-only">View History</span>
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Historical Memories</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="mt-4 flex flex-col gap-2 pr-4">
              {historicalSentences.length > 0 ? (
                historicalSentences.map((entry) => (
                  <HistoricalEntry
                    key={entry.date.toISOString()}
                    entry={entry}
                    onSelect={handleHistoricalSelect}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  No memories found.
                </p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner className="h-12 w-12 text-primary" />
          <p className="text-muted-foreground">Recalling today's memory...</p>
        </div>
      ) : content ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-8 opacity-0',
            showContent && 'animate-fade-in'
          )}
        >
          <div className="flex flex-col gap-2">
             <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-wider">
              One year ago today...
            </h1>
            <p className="text-lg md:text-xl text-foreground/80">
              {content.dateString}
            </p>
          </div>
          <p className="text-2xl md:text-3xl text-foreground/80 max-w-2xl italic">
           {content.sentence !== "No memory found for this day." 
              ? `we... "${content.sentence}"`
              : `"${content.sentence}"`
            }
          </p>
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
