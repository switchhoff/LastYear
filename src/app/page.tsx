'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getDailyArt } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';

type DailyContent = {
  dateString: string;
  sentence: string;
  imageUrl: string;
};

export default function Home() {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        // Calculate date
        const today = new Date();
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        const dateString = yearAgo.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const result = await getDailyArt();
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
          description: "Could not generate today's memory. Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [toast]);
  
  // Effect to trigger animation after content is loaded
  useEffect(() => {
    if (!loading && content) {
      // Use a short timeout to allow the DOM to update before adding the animation class
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, content]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner className="h-12 w-12 text-primary" />
          <p className="text-muted-foreground">Creating today's memory...</p>
        </div>
      ) : content ? (
        <div 
          className={cn(
            "flex flex-col items-center justify-center gap-8 opacity-0",
            showContent && "animate-fade-in"
          )}
        >
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
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-wider">
              {content.dateString}
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 max-w-md">
              "{content.sentence}"
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-destructive">
           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2"/><path d="M6 6h.01"/><path d="M6 18h.01"/><path d="m13 6-4 6h6l-4 6"/></svg>
          <h2 className="text-2xl font-semibold">Something went wrong</h2>
          <p>We couldn't create your memory for today. Please check back later.</p>
        </div>
      )}
    </main>
  );
}
