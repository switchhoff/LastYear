'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  History,
  Send,
  LogOut,
  MessageSquare,
  RefreshCcw,
  PlusCircle,
  Pencil,
  Save,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getMemorableDate, type MemorableDate } from '@/lib/memorable-dates';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  saveReaction,
  addChatMessage,
  saveUserSentence,
  getMemoryDocId,
  markChatAsRead,
  type UserReaction,
  type Memory,
  type UserMemoryChatMessage,
  ALEX_USER_ID,
  AMALIE_USER_ID,
} from '@/lib/firebase-service';
import { useUser, useAuth, useMemoFirebase, useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { Calendar } from '@/components/ui/calendar';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';


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
  chatMessages: UserMemoryChatMessage[];
  unreadCount: number;
};

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

  const displayDate = new Date(entry.date);
  displayDate.setFullYear(displayDate.getFullYear() + 1);

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
        {entry.unreadCount > 0 && (
          <div className="relative">
            <MessageSquare className="h-6 w-6 text-primary" />
            <Badge variant="destructive" className="absolute -top-2 -right-3 px-1.5 h-5 min-w-[20px] flex items-center justify-center">
              {entry.unreadCount > 9 ? '9+' : entry.unreadCount}
            </Badge>
          </div>
        )}
         {entry.unreadCount === 0 && entry.chatMessages.length > 0 && (
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
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

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !firestore) return;
    setIsSending(true);
    addChatMessage(firestore, user, content.memoryDate, newMessage);
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="w-full h-full flex flex-col p-2">
      <ScrollArea className="flex-grow mb-2 pr-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-3">
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
                  !isCurrentUser && !isAlex && !isAmalie && 'bg-muted'
                )}
              >
                <span className="text-xs text-muted-foreground">{msg.userName}</span>
                <p className="text-sm">{msg.text}</p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2">
        <Textarea
          placeholder="Your thoughts..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="bg-background text-sm"
          rows={1}
          disabled={isSending || !user}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button onClick={handleSendMessage} disabled={isSending || !user} size="icon" className="h-9 w-9">
          {isSending ? <LoadingSpinner /> : <Send className="h-4 w-4"/>}
        </Button>
      </div>
    </div>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const memoriesCollectionRef = useMemoFirebase(() => {
    // Only fetch memories if the user is logged in
    if (!firestore || !user) return null;
    return collection(firestore, 'memories');
  }, [firestore, user]);

  const { data: memories, isLoading: memoriesLoading } = useCollection<Memory>(memoriesCollectionRef);
  
  const historicalSentences = useMemo((): HistoricalEntryWithReactions[] => {
    if (!memories || !user) return [];
    
    return memories.map(memory => {
        const dateParts = memory.id.split('-').map(Number);
        const memoryDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        memoryDate.setHours(0,0,0,0);
        
        const sentence = (memory.userSentences && Object.values(memory.userSentences)[0]) || "No sentence found.";
        
        const lastReadTimestamp = memory.lastRead?.[user.uid] as Timestamp | undefined;
        let unreadCount = 0;
        if (memory.chatMessages && memory.chatMessages.length > 0) {
            if (lastReadTimestamp) {
                unreadCount = memory.chatMessages.filter(
                    msg => msg.timestamp && (msg.timestamp as unknown as Timestamp).toMillis() > lastReadTimestamp.toMillis() && msg.userId !== user.uid
                ).length;
            } else {
                // If lastRead is not set, all messages from others are unread.
                unreadCount = memory.chatMessages.filter(msg => msg.userId !== user.uid).length;
            }
        }

        return {
            date: memoryDate,
            sentence,
            reactions: memory.reactions || [],
            chatMessages: memory.chatMessages || [],
            unreadCount: unreadCount
        };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());

  }, [memories, user]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Loading state should depend on auth check and, if authenticated, the memories fetch
  const isLoading = isUserLoading || (user && memoriesLoading);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 text-center bg-background text-foreground">
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
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isAddMemoryDialogOpen, setIsAddMemoryDialogOpen] = useState(false);
  const [selectedDateForEditing, setSelectedDateForEditing] = useState<Date | undefined>(undefined);
  const [spoilerAlert, setSpoilerAlert] = useState(true);
  const [isViewingHistorical, setIsViewingHistorical] = useState(false);
  const [mode, setMode] = useState<MainContentMode>('view');
  const [newUserSentence, setNewUserSentence] = useState('');
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeSlide, setActiveSlide] = useState(0);

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
  
  const editingMemoryDocId = useMemo(() => {
    if (!selectedDateForEditing) return null;
    return getMemoryDocId(selectedDateForEditing);
  }, [selectedDateForEditing]);

  const editingMemoryDocRef = useMemoFirebase(() => {
    if (!firestore || !editingMemoryDocId) return null;
    return doc(firestore, 'memories', editingMemoryDocId);
  }, [firestore, editingMemoryDocId]);

  const { data: editingMemory } = useDoc<Memory>(editingMemoryDocRef);
  
  const userSentenceForEditingDate = useMemo(() => {
    if (!editingMemory || !user) return '';
    return editingMemory.userSentences?.[user.uid] || '';
  }, [editingMemory, user]);

  useEffect(() => {
    if (mode === 'add' && selectedDateForEditing) {
      setNewUserSentence(userSentenceForEditingDate);
    }
  }, [mode, userSentenceForEditingDate, selectedDateForEditing]);


  const reactions = useMemo(() => memoryData?.reactions || [], [memoryData]);
  const userReaction = useMemo(() => {
    return reactions.find((r) => r.userId === user?.uid)?.reaction || null;
  }, [reactions, user?.uid]);

  const alexReaction = useMemo(() => memoryData?.reactions.find(r => r.userId === ALEX_USER_ID)?.reaction, [memoryData]);
  const amalieReaction = useMemo(() => memoryData?.reactions.find(r => r.userId === AMALIE_USER_ID)?.reaction, [memoryData]);
  
  const effectiveSentence = useMemo(() => {
    if (!memoryData) return null;
    if (memoryData.userSentences && Object.keys(memoryData.userSentences).length > 0) {
      return Object.values(memoryData.userSentences)[0];
    }
    return null;
  }, [memoryData]);
  
  const unreadMessagesCount = useMemo(() => {
      if (!memoryData || !user || !memoryData.chatMessages || memoryData.chatMessages.length === 0) return 0;
      
      const lastReadTimestamp = memoryData.lastRead?.[user.uid] as Timestamp | undefined;
      
      if (lastReadTimestamp) {
        return memoryData.chatMessages.filter(
          msg => msg.timestamp && (msg.timestamp as unknown as Timestamp).toMillis() > lastReadTimestamp.toMillis() && msg.userId !== user.uid
        ).length;
      }
      
      // If no lastRead timestamp, all messages from others are unread.
      return memoryData.chatMessages.filter(msg => msg.userId !== user.uid).length;
  }, [memoryData, user]);


  useEffect(() => {
    if (!carouselApi) {
      return
    }

    const onSelect = () => {
      const selectedSnap = carouselApi.selectedScrollSnap();
      setActiveSlide(selectedSnap);
      if (selectedSnap === 1 && user && firestore && content) {
        // User swiped to chat view, mark as read.
        markChatAsRead(firestore, user, content.memoryDate);
      }
    }
    carouselApi.on('select', onSelect)
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi, user, firestore, content])


  const generateEmojis = useCallback((currentReaction: string | null, preserveSpot: boolean = false) => {
    const emojiPool = allEmojis.filter(e => e !== currentReaction);
    const shuffled = [...emojiPool].sort(() => 0.5 - Math.random());
    
    let newEmojis = shuffled.slice(0, 5);

    if (preserveSpot && currentReaction) {
        const currentReactionIndex = displayedEmojis.indexOf(currentReaction);
        if (currentReactionIndex !== -1) {
            newEmojis = newEmojis.filter(e => e !== currentReaction); 
            newEmojis.splice(currentReactionIndex, 0, currentReaction);
            setDisplayedEmojis(newEmojis.slice(0,5)); 
        } else {
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
    if (content) {
      generateEmojis(userReaction, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, userReaction]);

  const handleReact = (emoji: string) => {
    if (!user || !firestore || !content) return;
    setIsSending(true);
    const newEmoji = userReaction === emoji ? null : emoji;
    saveReaction(firestore, user, content.memoryDate, newEmoji);
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

      const displayDate = new Date(targetDate);
      displayDate.setHours(0, 0, 0, 0);

      const memoryDate = new Date(displayDate);
      memoryDate.setFullYear(displayDate.getFullYear() - 1);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isToday = displayDate.getTime() === today.getTime();

      const dateString = displayDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
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
    setIsHistoryDialogOpen(false);
    setMode('view');
    const displayDate = new Date(memoryDate);
    displayDate.setFullYear(memoryDate.getFullYear() + 1);
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

  const handleSaveSentence = () => {
    if (!user || !firestore || !newUserSentence.trim() || !selectedDateForEditing) return;
    setIsSending(true);
    saveUserSentence(firestore, user, selectedDateForEditing, newUserSentence);
    setIsSending(false);
    setMode('view');
    toast({ title: "Memory saved!" });
    setSelectedDateForEditing(undefined);
  };

  const handleDateSelectForEditing = (date: Date | undefined) => {
    if (date) {
        setSelectedDateForEditing(date);
        setIsAddMemoryDialogOpen(false);
        setMode('add');
    }
  }
  
  const handleExitAddMode = () => {
    setMode('view');
    setSelectedDateForEditing(undefined);
    setNewUserSentence('');
  }
  
  const handleToggleChat = () => {
    const targetSlide = activeSlide === 0 ? 1 : 0;
    carouselApi?.scrollTo(targetSlide);
  }

  const isEditingDateToday = useMemo(() => {
      if (!selectedDateForEditing) return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      const editingDate = new Date(selectedDateForEditing);
      editingDate.setHours(0,0,0,0);
      return today.getTime() === editingDate.getTime();
  }, [selectedDateForEditing]);

  const showLockForPastMemory = mode === 'add' && !!userSentenceForEditingDate && !isEditingDateToday;

  return (
    <main className="flex h-screen flex-col items-center bg-background text-foreground overflow-hidden">
      <div className="flex-shrink-0 w-full p-2 flex items-center justify-around z-10 sticky top-0 bg-background/95 backdrop-blur-sm">
          {mode === 'add' ? (
             <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleExitAddMode}>
                <ArrowLeft className="h-6 w-6" />
                <span className="sr-only">Back</span>
             </Button>
          ) : (
            <Dialog open={isAddMemoryDialogOpen} onOpenChange={setIsAddMemoryDialogOpen}>
              <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                      <Pencil className="h-5 w-5" />
                      <span className="sr-only">Add or Edit Memory</span>
                  </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                      <DialogTitle>Add or Edit a Memory</DialogTitle>
                  </DialogHeader>
                  <p className="text-muted-foreground text-sm">Select a date to write your memory for that day. You can go back as far as September 23, 2024.</p>
                  <Calendar
                      mode="single"
                      selected={selectedDateForEditing}
                      onSelect={handleDateSelectForEditing}
                      disabled={{ before: new Date('2024-09-23'), after: new Date() }}
                      initialFocus
                  />
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <History className="h-6 w-6" />
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

          <Button variant="ghost" size="icon" className="h-10 w-10 relative" onClick={handleToggleChat}>
            <MessageSquare className="h-6 w-6" />
            {unreadMessagesCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 h-5 min-w-[20px] flex items-center justify-center">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </Badge>
            )}
            <span className="sr-only">Toggle Chat</span>
          </Button>

          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => auth.signOut()}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Log Out</span>
          </Button>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center w-full px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner className="h-12 w-12 text-primary" />
            <p className="text-muted-foreground">Recalling today's memory...</p>
          </div>
        ) : content && mode === 'view' ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center opacity-0 w-full h-full',
              showContent && 'animate-fade-in'
            )}
          >
            {isViewingHistorical && (
                <Button variant="link" onClick={fetchTodaysContent} className="mb-2 h-auto p-0">
                  Back to today...
                </Button>
            )}
            <div className="flex flex-col gap-1 mb-4 items-center text-center">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <p className="text-base text-foreground/80">
                  {content.dateString}
                </p>
                {content.memorableDate && (
                  <Badge variant="outline">
                    {content.memorableDate.emoji} {content.memorableDate.description}
                  </Badge>
                )}
              </div>
              <h1 className="text-lg font-bold text-foreground tracking-wider">
                One year ago today...
              </h1>
            </div>
            
            <Carousel setApi={setCarouselApi} className="w-full flex-grow h-full">
              <CarouselContent className="h-full">
                <CarouselItem className="h-full">
                  <div className="relative bg-card border rounded-lg shadow-sm p-6 w-full h-full flex items-center justify-center">
                       <span className="absolute top-2 left-3 text-6xl text-primary/10 font-serif">“</span>
                       <span className="absolute bottom-2 right-3 text-6xl text-primary/10 font-serif">”</span>
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
                                    className="text-xl rounded-full h-10 w-10"
                                    onClick={() => handleReact(emoji)}
                                    disabled={isSending}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-full"
                                  onClick={handleRefreshEmojis}
                                  disabled={isSending}
                                >
                                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                      </div>
                      <blockquote className="relative text-center">
                        {effectiveSentence ? (
                          <p className="text-xl text-primary italic text-balance">
                            {effectiveSentence}
                          </p>
                        ) : (
                          <p className="text-base text-muted-foreground">No memory recorded for one year ago today.</p>
                        )}
                      </blockquote>
                  </div>
                </CarouselItem>
                <CarouselItem className="h-full">
                  <div className="bg-muted/50 rounded-lg w-full h-full">
                    {memoryData && <ChatSection content={content} memoryData={memoryData} />}
                  </div>
                </CarouselItem>
              </CarouselContent>
            </Carousel>

          </div>
        ) : content && mode === 'add' && selectedDateForEditing ? (
           <div className={cn(
              'flex flex-col items-center justify-center opacity-0 w-full max-w-2xl h-full',
              showContent && 'animate-fade-in'
            )}>
              <div className="flex flex-col gap-2 mb-4 w-full text-center">
                <p className="text-lg text-foreground/80">
                  {selectedDateForEditing.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </p>
                <h1 className="text-2xl font-bold text-foreground tracking-wider">
                  What's on your mind today?
                </h1>
              </div>

              {showLockForPastMemory ? (
                 <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground border rounded-lg p-8 w-full flex-grow">
                    <Lock className="h-10 w-10"/>
                    <p className="text-lg font-medium">You have already recorded this memory.</p>
                    <p className="text-sm">It will be revealed to you in a year!</p>
                 </div>
              ) : (
                <div className="w-full flex-grow flex flex-col">
                  <Textarea
                    value={newUserSentence}
                    onChange={(e) => setNewUserSentence(e.target.value)}
                    placeholder="Write your memory for this day..."
                    className="w-full flex-grow text-lg p-4"
                  />
                  <Button onClick={handleSaveSentence} disabled={isSending || !newUserSentence.trim()} className="mt-4">
                    {isSending ? <LoadingSpinner className="mr-2"/> : <Save className="mr-2"/>}
                    Save Memory
                  </Button>
                </div>
              )}
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
    </main>
  );
}
