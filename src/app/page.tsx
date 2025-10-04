
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDailyContent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  History,
  Eye,
  EyeOff,
  Send,
  LogOut,
  MessageSquare,
  RefreshCcw,
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
  ensureMemoryDocuments,
  type UserReaction,
  type Memory,
  type UserMemoryChatMessage,
} from '@/lib/firebase-service';
import { useUser, useAuth, useMemoFirebase, useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

type DailyContent = {
  date: Date;
  yearAgoDate: Date;
  dateString: string;
  sentence: string;
  memorableDate: MemorableDate | undefined;
};

type HistoricalEntryWithReactions = DatedSentence & { reactions: UserReaction[]; chatMessages: UserMemoryChatMessage[] };

const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
const AMALIE_USER_ID = 'SFsKmCQM9NZi7Drmsb4pNBtLJ6m1';

function HistoricalEntry({
  entry,
  onSelect,
  showSentence,
}: {
  entry: HistoricalEntryWithReactions;
  onSelect: (date: Date) => void;
  showSentence: boolean;
}) {
  const alexReaction = useMemo(() => entry.reactions.find(r => r.userId === ALEX_USER_ID)?.reaction, [entry.reactions]);
  const amalieReaction = useMemo(() => entry.reactions.find(r => r.userId === AMALIE_USER_ID)?.reaction, [entry.reactions]);
  const chatCount = entry.chatMessages?.length || 0;

  return (
    <div
      className="grid grid-cols-4 items-center gap-4 p-2 rounded-md hover:bg-muted cursor-pointer"
      onClick={() => onSelect(entry.date)}
    >
      <div className="flex-grow col-span-1">
        <div className="flex items-center gap-2">
            <span className="font-semibold">
            {entry.date.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'UTC',
            })}
            </span>
        </div>
        {showSentence && (
          <blockquote className="relative mt-1 pl-3">
            <p className="text-sm text-muted-foreground italic text-balance">
              <span className="absolute -left-0 -top-1 text-4xl text-primary/20 font-serif">
                “
              </span>
              {entry.sentence}
            </p>
          </blockquote>
        )}
      </div>
      <div className="text-center text-2xl col-span-1">
        {alexReaction || <span className="text-muted-foreground/50">-</span>}
      </div>
      <div className="text-center text-2xl col-span-1">
        {amalieReaction || <span className="text-muted-foreground/50">-</span>}
      </div>
       <div className="col-span-1 flex justify-center">
        {chatCount > 0 && (
          <div className="relative">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
            <Badge variant="destructive" className="absolute -top-2 -right-3 px-1.5 h-5 min-w-[20px] flex items-center justify-center">
              {chatCount > 9 ? '9+' : chatCount}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

const allEmojis = [
  '😊', '😂', '❤️', '😍', '👍', '🙏', '🎉', '🤩', '🤔', '😢', '🔥', '💯',
  '✨', '🌟', '💫', '🌸', '😂', '😎', '😜', '🥰', '🥹', '🥺', '😏', '😬',
  '😴', '😇', '😈', '🤡', '👻', '👽', '🤖', '👋', '🤝', '🙌', '🙏', '💪',
  '🧠', '👀', '🗣️', '👣', '👑', '💎', '💍', '💖', '💘', '💝', '💞', '💓',
  '💔', '❤️‍🔥', '💌', '💐', '🌹', '🥀', '🌷', '🌺', '🌻', '🌞', '🌕', '🌜',
  '⭐', '🌈', '🌊', '🌲', '🌳', '🌴', '🌿', '☘️', '🍁', '🍂', '🍄', '🌵',
  '🌍', '🏔️', '🌋', '🏞️', '🏜️', '🏝️', '🌅', '🌄', '🌇', '🏙️', '🌉', '⛺',
  '🏠', '🏰', '🗼', '🗽', '🗿', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸',
  '🎻', '🎺', '🥁', '🎯', '🎳', '🎱', '🎮', '🧩', '♟️', '🎲', '🚀', '✈️',
  '🚗', '🚲', '🚶', '🏃', '💃', '🕺', '🥳', '🎈', '🎁', '🎂', '🍻', '🥂',
  '🍾', '🍿', '🍕', '🍔', '🍟', '🍣', '🍩', '🍪', '🍫', '🍭', '🍦', '☕',
  '🍵', '🍷', '🍹', '💯', '🔥', '✅', '✔️', '☑️', '➕', '➖', '➗', '✖️',
  '🔚', '🔙', '🔛', '🔝', '🔜', '⏳', '⏰', '💡', '💤', '💥', '💦', '💨',
];


function FeedbackSection({ content, memoryData }: { content: DailyContent; memoryData: Memory | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSending, setIsSending] = useState(false);

  const reactions = useMemo(() => memoryData?.reactions || [], [memoryData]);
  const userReaction = useMemo(() => {
    return reactions.find((r) => r.userId === user?.uid)?.reaction || null;
  }, [reactions, user?.uid]);

  const [displayedEmojis, setDisplayedEmojis] = useState<string[]>([]);

  const generateEmojis = useCallback((currentReaction: string | null, preserveSpot: boolean = false) => {
    // Filter out the current selection to avoid duplicates in the random pool
    const emojiPool = allEmojis.filter(e => e !== currentReaction);
    const shuffled = [...emojiPool].sort(() => 0.5 - Math.random());
    
    // Determine how many new emojis to pick
    const emojisToPick = preserveSpot && currentReaction ? 4 : 5;
    const newEmojis = shuffled.slice(0, emojisToPick);

    if (preserveSpot && currentReaction) {
        // If preserving spot, we rebuild the array around the current reaction
        const currentReactionIndex = displayedEmojis.indexOf(currentReaction);
        if (currentReactionIndex !== -1) {
            const finalEmojis = [...newEmojis];
            finalEmojis.splice(currentReactionIndex, 0, currentReaction);
            // Ensure we still only have 5 emojis, removing any extra if needed
            const finalDisplay = finalEmojis.slice(0,5);
            // Check if the current reaction is still there after slicing, if not, put it back in.
            if(!finalDisplay.includes(currentReaction)) {
              finalDisplay[currentReactionIndex] = currentReaction;
            }
            setDisplayedEmojis(finalDisplay);
        } else {
             // currentReaction was not in displayedEmojis, so we fallback to non-preserving logic
            if (!newEmojis.includes(currentReaction)) {
              newEmojis[Math.floor(Math.random() * newEmojis.length)] = currentReaction;
            }
            setDisplayedEmojis(newEmojis);
        }

    } else {
        // Standard logic: just pick 5 new ones
        // If there's a current reaction, ensure it's included in the new set
        if (currentReaction && !newEmojis.includes(currentReaction)) {
          // Replace a random emoji with the current one
          newEmojis[Math.floor(Math.random() * newEmojis.length)] = currentReaction;
        }
        setDisplayedEmojis(newEmojis);
    }
  }, [displayedEmojis]);

  useEffect(() => {
    // Initial emoji generation when the component mounts or content changes
    generateEmojis(userReaction);
  // We only want to run this effect once to set the initial emojis.
  // userReaction is intentionally left out to prevent re-shuffling when the user clicks a reaction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);


  const handleReact = async (emoji: string) => {
    if (!user || !firestore) return;
    setIsSending(true);
    const newEmoji = userReaction === emoji ? null : emoji;
    await saveReaction(firestore, user, content.yearAgoDate, newEmoji);
    setIsSending(false);
  };
  
  const handleRefreshEmojis = () => {
    generateEmojis(userReaction, true);
  }

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
             <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={handleRefreshEmojis}
              disabled={isSending || !user}
            >
              <RefreshCcw className="h-6 w-6 text-muted-foreground" />
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="journal">
          <ChatSection content={content} memoryData={memoryData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatSection({ content, memoryData }: { content: DailyContent, memoryData: Memory | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => memoryData?.chatMessages || [], [memoryData]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !firestore) return;
    setIsSending(true);
    await addChatMessage(firestore, user, content.yearAgoDate, newMessage);
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-[400px] bg-muted/50 rounded-lg p-4">
      <ScrollArea className="flex-grow mb-4 pr-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-4">
          {messages?.map((msg, index) => {
            const isCurrentUser = msg.userId === user?.uid;
            const isAlex = msg.userId === ALEX_USER_ID;
            const isAmalie = msg.userId === AMALIE_USER_ID;

            return (
              <div
                key={index}
                className={cn(
                  'flex flex-col max-w-[75%] p-2 px-3 rounded-lg',
                  isCurrentUser
                    ? 'self-end items-end'
                    : 'self-start items-start',
                  isAlex && !isCurrentUser && 'bg-yellow-200 text-black',
                  isAmalie && !isCurrentUser && 'bg-pink-200 text-black',
                  isCurrentUser && 'bg-primary text-primary-foreground',
                  !isCurrentUser && !isAlex && !isAmalie && 'bg-background'
                )}
              >
                <span className="text-xs text-muted-foreground">{msg.userName}</span>
                <p>{msg.text}</p>
              </div>
            );
          })}
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
  const firestore = useFirestore();
  const router = useRouter();
  const [dataReady, setDataReady] = useState(false);
  const allSentences = useMemo(() => getAllSentences(), []);
  
  const memoriesCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'memories');
  }, [firestore]);

  const { data: memories, isLoading: memoriesLoading } = useCollection<Memory>(memoriesCollectionRef);

  const historicalSentences = useMemo((): HistoricalEntryWithReactions[] => {
    if (!memories) return [];

    const memoriesMap = new Map(memories.map(m => [m.id, m]));
    const today = new Date();
    const oneYearAgo = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate()));

    return allSentences
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getTime() <= oneYearAgo.getTime();
      })
      .map(entry => {
        const memoryId = `${entry.date.getUTCFullYear()}-${String(entry.date.getUTCMonth() + 1).padStart(2, '0')}-${String(entry.date.getUTCDate()).padStart(2, '0')}`;
        const memory = memoriesMap.get(memoryId);
        return {
          ...entry,
          reactions: memory?.reactions || [],
          chatMessages: memory?.chatMessages || []
        };
      });

  }, [allSentences, memories]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    async function setupData() {
        if (!user || !firestore) return;
        await ensureMemoryDocuments(firestore, allSentences);
        setDataReady(true);
    }
    if (user && firestore) {
      setupData();
    }
  }, [allSentences, user, firestore]);


  if (isUserLoading || !user || !dataReady || memoriesLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="text-muted-foreground mt-4">Loading user data and memories...</p>
      </main>
    );
  }

  return React.cloneElement(children as React.ReactElement, { historicalSentences });
}


export default function Home() {
  return (
    <AuthWrapper>
      <MainContent historicalSentences={[]} />
    </AuthWrapper>
  );
}

function MainContent({ historicalSentences }: { historicalSentences: HistoricalEntryWithReactions[] }) {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [spoilerAlert, setSpoilerAlert] = useState(true);
  const [isViewingHistorical, setIsViewingHistorical] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const getMemoryDocId = (date: Date): string => {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${year}-${month}-${day}`;
  };

  const memoryDocRef = useMemoFirebase(() => {
    if (!firestore || !content) return null;
    const memoryId = getMemoryDocId(content.yearAgoDate);
    return doc(firestore, 'memories', memoryId);
  }, [firestore, content]);

  const { data: memoryData } = useDoc<Memory>(memoryDocRef);

  const alexReaction = useMemo(() => memoryData?.reactions.find(r => r.userId === ALEX_USER_ID)?.reaction, [memoryData]);
  const amalieReaction = useMemo(() => memoryData?.reactions.find(r => r.userId === AMALIE_USER_ID)?.reaction, [memoryData]);

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
            <div className="relative flex-grow">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                <div className="grid grid-cols-4 items-center gap-4 p-2 font-semibold text-muted-foreground border-b">
                  <div className="col-span-1">Date</div>
                  <div className="text-center col-span-1">Alex</div>
                  <div className="text-center col-span-1">Amalie</div>
                  <div className="col-span-1"></div>
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="mt-2 flex flex-col gap-1 pr-4">
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
                    <p className="text-muted-foreground text-center pt-8">
                      No memories found.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
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
            
            <div className="relative bg-card border rounded-lg shadow-sm p-8 max-w-2xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-2 flex gap-1">
                    {alexReaction && <Badge className="text-lg p-1.5 bg-yellow-200 text-black shadow-md">{alexReaction}</Badge>}
                    {amalieReaction && <Badge className="text-lg p-1.5 bg-pink-200 text-black shadow-md">{amalieReaction}</Badge>}
                </div>
                <blockquote className="relative">
                  <p className="text-2xl md:text-3xl text-primary italic text-balance">
                    <span className="absolute -left-4 -top-2 text-6xl text-primary/20 font-serif">“</span>
                    {content.sentence}
                    <span className="absolute -right-4 -bottom-4 text-6xl text-primary/20 font-serif">”</span>
                  </p>
                </blockquote>
            </div>

            {showFeedback && <FeedbackSection content={content} memoryData={memoryData} />}
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
  );
}




    