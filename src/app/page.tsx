
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDailyContent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  History,
  Save,
  Eye,
  EyeOff,
  Send,
  LogOut,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getAllSentences, type DatedSentence } from '@/lib/daily-content';
import { getMemorableDate, type MemorableDate } from '@/lib/memorable-dates';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  saveReaction,
  addChatMessage,
  getChatMessagesQuery,
  type ChatMessage,
  type UserReaction,
  getMemoryReactionsForDate,
} from '@/lib/firebase-service';
import { useUser, useCollection, useAuth, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';


type DailyContent = {
  date: Date;
  yearAgoDate: Date;
  dateString: string;
  sentence: string;
  memorableDate: MemorableDate | undefined;
};

type HistoricalEntryWithReactions = DatedSentence & { reactions: UserReaction[] };

function HistoricalEntry({
  entry,
  onSelect,
  showSentence,
}: {
  entry: HistoricalEntryWithReactions;
  onSelect: (date: Date) => void;
  showSentence: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 p-2 rounded-md hover:bg-muted cursor-pointer"
      onClick={() => onSelect(entry.date)}
    >
      <div className="flex flex-col text-left">
        <span className="font-semibold">
          {entry.date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC',
          })}
        </span>
        {showSentence && (
          <blockquote className="relative mt-1">
            <p className="text-sm text-muted-foreground italic text-balance">
              <span className="absolute -left-3 -top-1 text-4xl text-primary/20 font-serif">
                “
              </span>
              {entry.sentence}
              <span className="absolute -right-3 -bottom-2 text-4xl text-primary/20 font-serif">
                ”
              </span>
            </p>
          </blockquote>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center gap-1">
        {entry.reactions.map((r, index) => (
          <span key={index} className="text-lg">
            {r.reaction}
          </span>
        ))}
      </div>
    </div>
  );
}

const positiveEmojis = ['😊', '❤️', '😂', '😍', '👍', '🥹', '🥰', '🎉', '🤩'];

const getMemoryDocId = (date: Date): string => {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${year}-${month}-${day}`;
};

function FeedbackSection({ content }: { content: DailyContent }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSending, setIsSending] = useState(false);
  
  const memoryReactionsQuery = useMemoFirebase(() => {
    if (!firestore || !content.yearAgoDate) return null;
    const memoryId = getMemoryDocId(content.yearAgoDate);
    return collection(firestore, 'memories', memoryId, 'reactions');
  }, [firestore, content.yearAgoDate]);

  const { data: reactionsData } = useCollection<UserReaction>(memoryReactionsQuery);

  const userReaction = useMemo(() => {
    return reactionsData?.find((r) => r.userId === user?.uid)?.reaction || null;
  }, [reactionsData, user?.uid]);

  const displayedEmojis = useMemo(() => {
    if (userReaction) {
      const otherEmojis = positiveEmojis.filter((e) => e !== userReaction);
      const shuffled = otherEmojis.sort(() => 0.5 - Math.random());
      return [userReaction, ...shuffled.slice(0, 4)];
    }
    const shuffled = [...positiveEmojis].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [userReaction]);

  const handleReact = (emoji: string) => {
    if (!user) return;
    const newEmoji = userReaction === emoji ? null : emoji;
    // Non-blocking update
    saveReaction(user.uid, content.yearAgoDate, newEmoji);
  };

  return (
    <div className="w-full max-w-2xl mt-12 animate-fade-in">
      <Tabs defaultValue="react" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="react">React Mode</TabsTrigger>
          <TabsTrigger value="journal">Journal Mode</TabsTrigger>
        </TabsList>
        <TabsContent value="react">
          <div className="flex justify-center items-center gap-2 p-4">
            {displayedEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant={userReaction === emoji ? 'default' : 'outline'}
                size="icon"
                className="text-2xl rounded-full h-14 w-14"
                onClick={() => handleReact(emoji)}
                disabled={isSending || !user}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="journal">
          <ChatSection content={content} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatSection({ content }: { content: DailyContent }) {
  const { user } = useUser();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(
    () => getChatMessagesQuery(content.yearAgoDate),
    [content.yearAgoDate]
  );
  const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;
    setIsSending(true);
    addChatMessage(user.uid, user.email || 'anonymous', content.yearAgoDate, newMessage);
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-[400px] bg-muted/50 rounded-lg p-4">
      <ScrollArea className="flex-grow mb-4 pr-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-4">
          {isLoading && <LoadingSpinner />}
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col max-w-[75%] p-2 px-3 rounded-lg',
                msg.userId === user?.uid
                  ? 'bg-primary text-primary-foreground self-end items-end'
                  : 'bg-background self-start items-start'
              )}
            >
              <span className="text-xs text-foreground/50">{msg.userEmail}</span>
              <p>{msg.text}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2">
        <Textarea
          placeholder="Your thoughts on this memory..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="bg-background"
          disabled={isSending || !user}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button onClick={handleSendMessage} disabled={isSending || !user}>
          {isSending ? <LoadingSpinner /> : <Send />}
        </Button>
      </div>
    </div>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </main>
    );
  }

  return <>{children}</>;
}


export default function Home() {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [spoilerAlert, setSpoilerAlert] = useState(true);
  const [isViewingHistorical, setIsViewingHistorical] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
  const [historicalSentences, setHistoricalSentences] = useState<HistoricalEntryWithReactions[]>([]);
  const { toast } = useToast();
  const auth = useAuth();
  
  const allSentences = useMemo(() => getAllSentences(), []);

  const fetchContent = useCallback(async (date: Date) => {
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
      
      const memorableDate = getMemorableDate(date);

      const result = await getDailyContent(yearAgo);
      if (result.success && result.sentence) {
        setContent({
          date,
          yearAgoDate: yearAgo,
          dateString,
          sentence: result.sentence,
          memorableDate,
        });
      } else {
        setContent({
          date,
          yearAgoDate: yearAgo,
          dateString,
          sentence: "No memory found for this day.",
          memorableDate,
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
  }, [toast]);

  const fetchTodaysContent = useCallback(() => {
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    fetchContent(todayUTC);
    setIsViewingHistorical(false);
  },[fetchContent]);

  useEffect(() => {
    fetchTodaysContent();
  }, [fetchTodaysContent]);


  useEffect(() => {
    async function fetchHistoricalData() {
        const today = new Date();
        const oneYearAgo = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate()));
        
        const relevantSentences = allSentences.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getTime() <= oneYearAgo.getTime();
        });

        const sentencesWithReactions = await Promise.all(
            relevantSentences.map(async (entry) => {
                const reactions = await getMemoryReactionsForDate(entry.date);
                return { ...entry, reactions };
            })
        );
        setHistoricalSentences(sentencesWithReactions);
    }
    fetchHistoricalData();
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
    setIsViewingHistorical(true);
  };

  const handleRandomSelect = () => {
    if (historicalSentences.length > 0) {
      const randomIndex = Math.floor(Math.random() * historicalSentences.length);
      const randomEntry = historicalSentences[randomIndex];
      handleHistoricalSelect(randomEntry.date);
    }
  };

  return (
    <AuthWrapper>
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => auth.signOut()}>
            <LogOut className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12"
            onClick={() => setShowFeedback(!showFeedback)}
          >
            {showFeedback ? <EyeOff className="h-8 w-8" /> : <Eye className="h-8 w-8" />}
            <span className="sr-only">
              {showFeedback ? 'Hide feedback section' : 'Show feedback section'}
            </span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
              >
                <History className="h-8 w-8" />
                <span className="sr-only">View History</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="h-screen w-screen max-w-full flex flex-col">
              <DialogHeader>
                <DialogTitle>Historical Memories</DialogTitle>
              </DialogHeader>
              <div className="flex items-center space-x-4 px-1 py-4">
                <div className='flex items-center space-x-2'>
                  <Switch
                    id="spoiler-alert"
                    checked={spoilerAlert}
                    onCheckedChange={setSpoilerAlert}
                  />
                  <Label htmlFor="spoiler-alert">Spoiler Alert</Label>
                </div>
                <Button variant="outline" onClick={handleRandomSelect}>Random</Button>
              </div>
              <ScrollArea className="flex-grow">
                <div className="mt-4 flex flex-col gap-4 pr-4">
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
        </div>

        <div className="flex-grow flex flex-col items-center justify-center w-full">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner className="h-12 w-12 text-primary" />
              <p className="text-muted-foreground">Recalling today's memory...</p>
            </div>
          ) : content ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center opacity-0 w-full',
                showContent && 'animate-fade-in'
              )}
            >
              <div className="flex flex-col gap-2 mb-24">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-md md:text-lg text-foreground/80">
                    {content.dateString}
                  </p>
                  {content.memorableDate && (
                    <Badge variant="outline">
                      {content.memorableDate.emoji} {content.memorableDate.description}
                    </Badge>
                  )}
                </div>
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
              {showFeedback && <FeedbackSection content={content} />}
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
        </div>
        {isViewingHistorical && !loading && (
          <Button
            variant="ghost"
            onClick={fetchTodaysContent}
            className="absolute bottom-8 animate-fade-in"
          >
            Back to today...
          </Button>
        )}
      </main>
    </AuthWrapper>
  );
}

