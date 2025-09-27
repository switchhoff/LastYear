'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getDailyArt } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { History, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  getAllSentences,
  getSentenceForDay,
  type DatedSentence,
} from '@/lib/daily-content';

type DailyContent = {
  dateString: string;
  sentence: string;
  imageUrl: string;
};

function HistoricalEntry({
  entry,
  onSelect,
}: {
  entry: DatedSentence;
  onSelect: (date: Date) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchArt = async () => {
    setLoading(true);
    try {
      const result = await getDailyArt(entry.date);
      if (result.success && result.imageUrl) {
        setImage(result.imageUrl);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center gap-4 p-2 rounded-md hover:bg-muted cursor-pointer"
      onClick={() => onSelect(entry.date)}
    >
      <div className="w-16 h-16 bg-muted rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={entry.sentence}
            width={64}
            height={64}
            className="object-cover"
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={fetchArt} disabled={loading}>
            {loading ? <LoadingSpinner className="h-4 w-4"/> : 'Load'}
          </Button>
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-semibold">
          {entry.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
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
  const [historicalSentences, setHistoricalSentences] = useState<
    DatedSentence[]
  >([]);

  const fetchContent = async (date: Date) => {
    try {
      setLoading(true);
      setShowContent(false);
      setContent(null);

      const yearAgo = new Date(date);
      yearAgo.setFullYear(date.getFullYear() - 1);
      const dateString = yearAgo.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const result = await getDailyArt(date);
      if (result.success && result.sentence && result.imageUrl) {
        setContent({
          dateString,
          sentence: result.sentence,
          imageUrl: result.imageUrl,
        });
      } else {
        throw new Error(result.error || 'Failed to fetch daily content.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          "Could not generate today's memory. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent(new Date());
    setHistoricalSentences(getAllSentences());
  }, [toast]);

  useEffect(() => {
    if (!loading && content) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, content]);

  const handleHistoricalSelect = (date: Date) => {
    setIsSheetOpen(false);
    fetchContent(date);
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
          <div className="mt-4 flex flex-col gap-2">
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
        </SheetContent>
      </Sheet>

      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner className="h-12 w-12 text-primary" />
          <p className="text-muted-foreground">Creating today's memory...</p>
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
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden shadow-2xl shadow-black/30">
            <Image
              src={content.imageUrl}
              alt={content.sentence}
              fill
              className="object-contain p-4 bg-gray-900/50"
              priority
              sizes="(max-width: 768px) 256px, 320px"
              data-ai-hint="stick figure"
            />
          </div>
          <p className="text-lg md:text-xl text-foreground/80 max-w-md italic">
            "{content.sentence}"
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
