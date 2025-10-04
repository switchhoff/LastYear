
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  PlusCircle,
  Pencil,
  Save,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getAllSentences } from '@/lib/daily-content';
import { getMemorableDate, type MemorableDate } from '@/lib/memorable-dates';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  saveReaction,
  addChatMessage,
  ensureMemoryDocuments,
  saveUserSentence,
  getMemoryDocId,
  type UserReaction,
  type Memory,
  type UserMemoryChatMessage,
} from '@/lib/firebase-service';
import { useUser, useAuth, useMemoFirebase, useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

type DailyContent = {
  displayDate: Date;
  memoryDate: Date;
  dateString: string;
  memorableDate: MemorableDate | undefined;
  isToday: boolean;
};

type HistoricalEntryWithReactions = { 
  date: Date,
  sentence: string,
  reactions: UserReaction[]; 
  chatMessages: UserMemoryChatMessage[] 
};

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

  const displayDate = new Date(entry.date);
  displayDate.setUTCFullYear(displayDate.getUTCFullYear() + 1);

  return (
    <div
      className="grid grid-cols-4 items-center gap-4 p-2 rounded-md hover:bg-muted cursor-pointer"
      onClick={() => onSelect(entry.date)}
    >
      <div className="flex-grow col-span-1">
        <div className="flex items-center gap-2">
            <span className="font-semibold">
            {displayDate.toLocaleDateString('en-GB', {
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

function ChatSection({ content, memoryData }: { content: DailyContent, memoryData: Memory | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => memoryData?.chatMessages || [], [memoryData]);
  
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !firestore) return;
    setIsSending(true);
    await addChatMessage(firestore, user, content.memoryDate, newMessage);
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="w-full max-w-2xl mt-8">
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
    const combinedEntries: HistoricalEntryWithReactions[] = [];

    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    memoriesMap.forEach((memory, id) => {
        const dateParts = id.split('-').map(Number);
        const memoryDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        
        const displayDate = new Date(memoryDate);
        displayDate.setUTCFullYear(displayDate.getUTCFullYear() + 1);

        if (displayDate <= todayUTC) {
            // Fallback for old data structure
            const sentence = Object.values(memory.userSentences || {})[0] || (memory as any).sentence || "No sentence found.";
            
            combinedEntries.push({
                date: memoryDate,
                sentence,
                reactions: memory.reactions || [],
                chatMessages: memory.chatMessages || [],
            });
        }
    });

    return combinedEntries.sort((a, b) => b.date.getTime() - a.date.getTime());

  }, [memories]);


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

type MainContentMode = 'view' | 'add';

function MainContent({ historicalSentences }: { historicalSentences: HistoricalEntryWithReactions[] }) {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [spoilerAlert, setSpoilerAlert] = useState(true);
  const [isViewingHistorical, setIsViewingHistorical] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
  const [mode, setMode] = useState<MainContentMode>('view');
  const [newUserSentence, setNewUserSentence] = useState('');
  
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isSending, setIsSending] = useState(false);
  const [displayedEmojis, setDisplayedEmojis] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const memoryDocRef = useMemoFirebase(() => {
    if (!firestore || !content) return null;
    const memoryId = getMemoryDocId(content.memoryDate);
    return doc(firestore, 'memories', memoryId);
  }, [firestore, content]);

  const { data: memoryData } = useDoc<Memory>(memoryDocRef);
  
  const todayDocId = useMemo(() => getMemoryDocId(new Date()), []);
  const todayMemoryDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'memories', todayDocId);
  }, [firestore, todayDocId]);
  const { data: todayMemory } = useDoc<Memory>(todayMemoryDocRef);

  const userSentenceFromToday = useMemo(() => {
    if (!todayMemory || !user) return '';
    return todayMemory.userSentences?.[user.uid] || '';
  }, [todayMemory, user]);

  useEffect(() => {
    if (mode === 'add') {
      setNewUserSentence(userSentenceFromToday);
    }
  }, [mode, userSentenceFromToday]);

  const reactions = useMemo(() => memoryData?.reactions || [], [memoryData]);
  const userReaction = useMemo(() => {
    return reactions.find((r) => r.userId === user?.uid)?.reaction || null;
  }, [reactions, user?.uid]);

  const alexReaction = useMemo(() => memoryData?.reactions.find(r => r.userId === ALEX_USER_ID)?.reaction, [memoryData]);
  const amalieReaction = useMemo(() => memoryData?.reactions.find(r => r.userId === AMALIE_USER_ID)?.reaction, [memoryData]);
  
  const effectiveSentence = useMemo(() => {
    if (!memoryData) return null;
    // New structure: check userSentences map first
    if (memoryData.userSentences && Object.keys(memoryData.userSentences).length > 0) {
      // Simple logic to get the first available sentence. Can be improved.
      return Object.values(memoryData.userSentences)[0];
    }
    // Fallback to old structure
    if ((memoryData as any).sentence) {
      return (memoryData as any).sentence;
    }
    return null;
  }, [memoryData]);


  const generateEmojis = useCallback((currentReaction: string | null, preserveSpot: boolean = false) => {
    const emojiPool = allEmojis.filter(e => e !== currentReaction);
    const shuffled = [...emojiPool].sort(() => 0.5 - Math.random());
    
    let newEmojis = shuffled.slice(0, 5);

    if (preserveSpot && currentReaction) {
        // Try to keep the current reaction in the same spot if it exists in the old list
        const currentReactionIndex = displayedEmojis.indexOf(currentReaction);
        if (currentReactionIndex !== -1) {
            newEmojis = newEmojis.filter(e => e !== currentReaction); // remove duplicates
            newEmojis.splice(currentReactionIndex, 0, currentReaction);
            setDisplayedEmojis(newEmojis.slice(0,5)); // ensure it's still 5
        } else {
             // If not in old list, just replace a random one
             if (!newEmojis.includes(currentReaction)) {
                newEmojis[Math.floor(Math.random() * newEmojis.length)] = currentReaction;
             }
             setDisplayedEmojis(newEmojis);
        }
    } else {
        if (currentReaction && !newEmojis.includes(currentReaction)) {
          newEmojis[Math.floor(Math.random() * newEmojis.length)] = currentReaction;
        }
        setDisplayedEmojis(newEmojis);
    }
  }, [displayedEmojis]);


  useEffect(() => {
    if (content) { // Generate emojis when content is loaded
      generateEmojis(userReaction, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, userReaction]);

  const handleReact = async (emoji: string) => {
    if (!user || !firestore || !content) return;
    setIsSending(true);
    const newEmoji = userReaction === emoji ? null : emoji;
    await saveReaction(firestore, user, content.memoryDate, newEmoji);
    setIsSending(false);
    setIsPopoverOpen(false);
  };
  
  const handleRefreshEmojis = () => {
    generateEmojis(userReaction, true);
  }

  const fetchContent = useCallback((targetDate: Date) => {
    try {
      setLoading(true);
      setShowContent(false);
      setContent(null);
      
      const displayDate = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
      const memoryDate = new Date(displayDate);
      memoryDate.setUTCFullYear(displayDate.getUTCFullYear() - 1);
      
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const isToday = displayDate.getTime() === todayUTC.getTime();

      const dateString = displayDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC',
      });
      
      const memorableDate = getMemorableDate(displayDate);

      setContent({
        displayDate,
        memoryDate,
        dateString,
        memorableDate,
        isToday,
      });

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: "Could not fetch today's memory. Please try again later.",
      });
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTodaysContent = useCallback(() => {
    fetchContent(new Date());
    setIsViewingHistorical(false);
    setMode('view');
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

  const handleHistoricalSelect = (memoryDate: Date) => {
    setIsDialogOpen(false);
    setMode('view');
    const displayDate = new Date(memoryDate);
    displayDate.setUTCFullYear(memoryDate.getUTCFullYear() + 1);
    fetchContent(displayDate);
    setIsViewingHistorical(true);
  };

  const handleRandomSelect = () => {
    if (historicalSentences.length > 0) {
      const randomIndex = Math.floor(Math.random() * historicalSentences.length);
      const randomEntry = historicalSentences[randomIndex];
      handleHistoricalSelect(randomEntry.date);
    }
  };

  const handleSaveSentence = async () => {
    if (!user || !firestore || !newUserSentence.trim()) return;
    setIsSending(true);
    // Always save for *today's* date
    await saveUserSentence(firestore, user, new Date(), newUserSentence);
    setIsSending(false);
    setMode('view');
    toast({ title: "Memory saved!" });
  };
  

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
       <div className="absolute top-6 left-6 flex items-center gap-2">
        {content?.isToday && (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12"
            onClick={() => {
              if (mode === 'add') {
                setMode('view');
              } else {
                setMode('add');
                setNewUserSentence(userSentenceFromToday);
              }
            }}
          >
            {mode === 'add' ? <Eye className="h-8 w-8" /> : <Pencil className="h-7 w-7" />}
            <span className="sr-only">{mode === 'add' ? 'View Memory' : 'Add Memory'}</span>
          </Button>
        )}
      </div>

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
        ) : content && mode === 'view' ? (
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
            
            <div className="relative bg-card border rounded-lg shadow-sm p-12 max-w-2xl min-h-[250px] flex items-center justify-center">
                 <span className="absolute top-4 left-4 text-6xl text-primary/10 font-serif">“</span>
                 <span className="absolute bottom-4 right-4 text-6xl text-primary/10 font-serif">”</span>
                <div className="absolute top-0 right-0 -mt-4 -mr-2 flex gap-1 items-center">
                    {alexReaction && <Badge className="text-lg p-1.5 bg-yellow-200 text-black shadow-md">{alexReaction}</Badge>}
                    {amalieReaction && <Badge className="text-lg p-1.5 bg-pink-200 text-black shadow-md">{amalieReaction}</Badge>}
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                         <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-background hover:bg-muted"
                          disabled={isSending || !user}
                        >
                          <PlusCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="flex justify-center items-center gap-2">
                          {displayedEmojis.map((emoji) => (
                            <Button
                              key={emoji}
                              variant={userReaction === emoji ? 'default' : 'outline'}
                              size="icon"
                              className="text-2xl rounded-full h-12 w-12"
                              onClick={() => handleReact(emoji)}
                              disabled={isSending}
                            >
                              {emoji}
                            </Button>
                          ))}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={handleRefreshEmojis}
                            disabled={isSending}
                          >
                            <RefreshCcw className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                </div>
                <blockquote className="relative">
                  {effectiveSentence ? (
                    <p className="text-2xl md:text-3xl text-primary italic text-balance">
                      {effectiveSentence}
                    </p>
                  ) : (
                    <p className="text-lg text-muted-foreground">No memory recorded for one year ago today.</p>
                  )}
                </blockquote>
            </div>

            {showFeedback && memoryData && <ChatSection content={content} memoryData={memoryData} />}
          </div>
        ) : content && mode === 'add' ? (
           <div className={cn(
              'flex flex-col items-center justify-center opacity-0 w-full max-w-2xl',
              showContent && 'animate-fade-in'
            )}>
              <div className="flex flex-col gap-2 mb-8 w-full">
                <p className="text-lg text-foreground/80 text-center">
                  {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })}
                </p>
                <h1 className="text-2xl font-bold text-foreground tracking-wider text-center">
                  What's on your mind today?
                </h1>
              </div>
              <Textarea
                value={newUserSentence}
                onChange={(e) => setNewUserSentence(e.target.value)}
                placeholder="Write your memory for today..."
                className="w-full min-h-[200px] text-lg p-4"
              />
              <Button onClick={handleSaveSentence} disabled={isSending || !newUserSentence.trim()} className="mt-4">
                {isSending ? <LoadingSpinner className="mr-2"/> : <Save className="mr-2"/>}
                Save Memory
              </Button>
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
              We couldn't load the memory for today. Please check back later.
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
