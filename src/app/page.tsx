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
  Heart,
  ChevronLeft,
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
import { initNotifications, sendNewMessageNotification, sendNewReactionNotification } from '@/lib/notifications';


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
  const totalMessageCount = entry.chatMessages.length;

  const displayDate = new Date(entry.date);
  displayDate.setFullYear(displayDate.getFullYear() + 1);

  return (
    <div
      className="grid grid-cols-4 items-center gap-4 p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
      onClick={() => onSelect(entry.date)}
    >
      <div className="flex-grow col-span-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {displayDate.toLocaleDateString('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </span>
        </div>
        {showSentence && (
          <blockquote className="relative mt-1 pl-3">
            <p className="text-xs text-muted-foreground italic text-balance">
              <span className="absolute -left-0 -top-1 text-3xl text-primary/20 font-serif">"</span>
              {entry.sentence}
            </p>
          </blockquote>
        )}
      </div>
      <div className="text-center text-2xl col-span-1">
        {alexReaction || <span className="text-muted-foreground/30 text-sm">—</span>}
      </div>
      <div className="text-center text-2xl col-span-1">
        {amalieReaction || <span className="text-muted-foreground/30 text-sm">—</span>}
      </div>
      <div className="col-span-1 flex justify-center">
        {totalMessageCount > 0 && (
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <Badge
              variant={entry.unreadCount > 0 ? 'destructive' : 'secondary'}
              className="absolute -top-2 -right-3 px-1 h-4 min-w-[16px] text-[10px] flex items-center justify-center"
            >
              {totalMessageCount > 9 ? '9+' : totalMessageCount}
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

  const messages = useMemo(() => {
    if (!memoryData?.chatMessages) return [];
    return [...memoryData.chatMessages].sort((a, b) => {
      const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [memoryData]);

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
    sendNewMessageNotification(user.displayName || 'Someone', newMessage, user.uid);
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="w-full h-full flex flex-col p-3">
      <ScrollArea className="flex-grow mb-3" ref={scrollAreaRef}>
        <div className="flex flex-col gap-3 px-1">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation.</p>
          )}
          {messages.map((msg, index) => {
            const isCurrentUser = msg.userId === user?.uid;
            const isAlex = msg.userId === ALEX_USER_ID;
            const isAmalie = msg.userId === AMALIE_USER_ID;

            return (
              <div
                key={index}
                className={cn(
                  'flex flex-col max-w-[78%] rounded-2xl px-4 py-2.5',
                  isCurrentUser
                    ? 'self-end items-end rounded-br-sm bg-primary text-primary-foreground'
                    : 'self-start items-start rounded-bl-sm',
                  !isCurrentUser && isAlex && 'bg-amber-100 text-amber-900',
                  !isCurrentUser && isAmalie && 'bg-rose-100 text-rose-900',
                  !isCurrentUser && !isAlex && !isAmalie && 'bg-muted text-foreground',
                )}
              >
                <span className="text-[10px] font-medium opacity-60 mb-0.5">{msg.userName}</span>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="flex items-end gap-2">
        <Textarea
          placeholder="Write something..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="bg-background text-sm resize-none rounded-2xl border-border/60 focus-visible:ring-primary/30"
          rows={1}
          disabled={isSending || !user}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button
          onClick={handleSendMessage}
          disabled={isSending || !user || !newMessage.trim()}
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
        >
          {isSending ? <LoadingSpinner /> : <Send className="h-4 w-4" />}
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
    if (!firestore || !user) return null;
    return collection(firestore, 'memories');
  }, [firestore, user]);

  const { data: memories, isLoading: memoriesLoading } = useCollection<Memory>(memoriesCollectionRef);

  const historicalSentences = useMemo((): HistoricalEntryWithReactions[] => {
    if (!memories || !user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return memories
      .map(memory => {
        const dateParts = memory.id.split('-').map(Number);
        const memoryDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        memoryDate.setHours(0, 0, 0, 0);

        const displayDate = new Date(memoryDate);
        displayDate.setFullYear(displayDate.getFullYear() + 1);

        if (displayDate > today) return null;

        const sentence = (memory.userSentences && Object.values(memory.userSentences)[0]) || 'No sentence found.';

        const lastReadTimestamp = memory.lastRead?.[user.uid] as Timestamp | undefined;
        let unreadCount = 0;
        if (memory.chatMessages && memory.chatMessages.length > 0) {
          if (lastReadTimestamp) {
            unreadCount = memory.chatMessages.filter(
              msg => msg.timestamp && ((msg.timestamp as Timestamp).toMillis() > lastReadTimestamp.toMillis()) && msg.userId !== user.uid
            ).length;
          } else {
            unreadCount = memory.chatMessages.filter(msg => msg.userId !== user.uid).length;
          }
        }

        return { date: memoryDate, sentence, reactions: memory.reactions || [], chatMessages: memory.chatMessages || [], unreadCount };
      })
      .filter((entry): entry is HistoricalEntryWithReactions => entry !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [memories, user]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Init notifications when user is authenticated
  useEffect(() => {
    if (user) {
      initNotifications(user.uid).catch(() => {/* permission denied is fine */});
    }
  }, [user]);

  const isLoading = isUserLoading || (user && memoriesLoading);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Heart className="h-8 w-8 text-accent animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">Loading your memories...</p>
        </div>
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
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
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

  const { unreadCount, totalMessageCount } = useMemo(() => {
    if (!memoryData || !user || !memoryData.chatMessages || memoryData.chatMessages.length === 0) {
      return { unreadCount: 0, totalMessageCount: 0 };
    }

    const totalMessages = memoryData.chatMessages.length;
    const lastReadTimestamp = memoryData.lastRead?.[user.uid] as Timestamp | undefined;

    let unread = 0;
    if (lastReadTimestamp) {
      unread = memoryData.chatMessages.filter(msg => {
        if (!msg.timestamp) return false;
        const msgTime = msg.timestamp instanceof Timestamp ? msg.timestamp.toMillis() : new Date(msg.timestamp).getTime();
        return msgTime > lastReadTimestamp.toMillis() && msg.userId !== user.uid;
      }).length;
    } else {
      unread = memoryData.chatMessages.filter(msg => msg.userId !== user.uid).length;
    }

    return { unreadCount: unread, totalMessageCount: totalMessages };
  }, [memoryData, user]);

  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      const selectedSnap = carouselApi.selectedScrollSnap();
      setActiveSlide(selectedSnap);
      if (selectedSnap === 1 && user && firestore && content) {
        markChatAsRead(firestore, user, content.memoryDate);
      }
    };
    carouselApi.on('select', onSelect);
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi, user, firestore, content]);

  const generateEmojis = useCallback((currentReaction: string | null, preserveSpot: boolean = false) => {
    const emojiPool = allEmojis.filter(e => e !== currentReaction);
    const shuffled = [...emojiPool].sort(() => 0.5 - Math.random());

    let newEmojis = shuffled.slice(0, 5);

    if (preserveSpot && currentReaction) {
      const currentReactionIndex = displayedEmojis.indexOf(currentReaction);
      if (currentReactionIndex !== -1) {
        newEmojis = newEmojis.filter(e => e !== currentReaction);
        newEmojis.splice(currentReactionIndex, 0, currentReaction);
        setDisplayedEmojis(newEmojis.slice(0, 5));
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
    if (newEmoji) sendNewReactionNotification(user.displayName || 'Someone', newEmoji, user.uid);
    setIsSending(false);
    setIsPopoverOpen(false);
  };

  const handleRefreshEmojis = () => {
    generateEmojis(userReaction, true);
  };

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
        month: 'long',
        day: 'numeric',
      });

      const memorableDate = getMemorableDate(displayDate);

      setContent({ displayDate, memoryDate, dateString, memorableDate, isToday });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: "Could not load today's memory." });
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTodaysContent = useCallback(() => {
    fetchContent(new Date());
    setIsViewingHistorical(false);
    setMode('view');
  }, [fetchContent]);

  useEffect(() => { fetchTodaysContent(); }, [fetchTodaysContent]);

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
    if (user && firestore) {
      markChatAsRead(firestore, user, memoryDate);
    }
  };

  const handleRandomSelect = () => {
    if (historicalSentences.length > 0) {
      const randomIndex = Math.floor(Math.random() * historicalSentences.length);
      handleHistoricalSelect(historicalSentences[randomIndex].date);
    }
  };

  const handleSaveSentence = () => {
    if (!user || !firestore || !newUserSentence.trim() || !selectedDateForEditing) return;
    setIsSending(true);
    saveUserSentence(firestore, user, selectedDateForEditing, newUserSentence);
    setIsSending(false);
    setMode('view');
    toast({ title: 'Memory saved ❤️' });
    setSelectedDateForEditing(undefined);
  };

  const handleDateSelectForEditing = (date: Date | undefined) => {
    if (date) {
      setSelectedDateForEditing(date);
      setIsAddMemoryDialogOpen(false);
      setMode('add');
    }
  };

  const handleExitAddMode = () => {
    setMode('view');
    setSelectedDateForEditing(undefined);
    setNewUserSentence('');
  };

  const handleToggleChat = () => {
    const targetSlide = activeSlide === 0 ? 1 : 0;
    carouselApi?.scrollTo(targetSlide);
  };

  const isEditingDateToday = useMemo(() => {
    if (!selectedDateForEditing) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const editingDate = new Date(selectedDateForEditing);
    editingDate.setHours(0, 0, 0, 0);
    return today.getTime() === editingDate.getTime();
  }, [selectedDateForEditing]);

  const showLockForPastMemory = mode === 'add' && !!userSentenceForEditingDate && !isEditingDateToday;

  return (
    <main className="flex h-screen flex-col items-center bg-background text-foreground overflow-hidden select-none">

      {/* ── Content area ─────────────────────────────────── */}
      <div className="flex-grow flex flex-col items-center w-full overflow-hidden">

        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Heart className="h-7 w-7 text-accent animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Recalling the moment...</p>
          </div>
        ) : content && mode === 'view' ? (
          <div className={cn('flex flex-col w-full h-full opacity-0', showContent && 'animate-fade-in')}>

            {/* Header */}
            <div className="px-5 pt-10 pb-3 text-center shrink-0">
              {isViewingHistorical && (
                <button
                  onClick={fetchTodaysContent}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back to today
                </button>
              )}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-medium text-muted-foreground tracking-wide">
                  {content.dateString}
                </p>
                {content.memorableDate && (
                  <Badge
                    variant="outline"
                    className="text-xs border-accent/30 text-accent bg-accent/5 font-normal"
                  >
                    {content.memorableDate.emoji} {content.memorableDate.description}
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
                One year ago today
              </h1>
            </div>

            {/* Carousel */}
            <Carousel setApi={setCarouselApi} className="flex-grow w-full min-h-0 px-4 pb-2">
              <CarouselContent className="h-full">

                {/* Slide 1: Memory */}
                <CarouselItem className="h-full">
                  <div className="relative bg-card border border-border/60 rounded-3xl shadow-sm w-full h-full flex flex-col overflow-hidden">

                    {/* Reaction badges — top right */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {/* Show other user's reaction as a badge; own reaction lives in the button only */}
                      {user?.uid !== ALEX_USER_ID && alexReaction && (
                        <span className="text-xl bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shadow-sm">
                          {alexReaction}
                        </span>
                      )}
                      {user?.uid !== AMALIE_USER_ID && amalieReaction && (
                        <span className="text-xl bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 shadow-sm">
                          {amalieReaction}
                        </span>
                      )}
                      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                              'h-9 w-9 rounded-full border-border/60 bg-background hover:bg-muted shadow-sm text-lg',
                              userReaction && 'border-accent/40 bg-accent/5'
                            )}
                            disabled={isSending || !user}
                          >
                            {userReaction
                              ? <span>{userReaction}</span>
                              : <PlusCircle className="h-4 w-4 text-muted-foreground" />
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2.5 rounded-2xl shadow-lg border-border/60" align="end">
                          <div className="flex items-center gap-1.5">
                            {displayedEmojis.map((emoji) => (
                              <Button
                                key={emoji}
                                variant={userReaction === emoji ? 'default' : 'ghost'}
                                size="icon"
                                className={cn(
                                  'text-xl rounded-full h-10 w-10 hover:scale-110 transition-transform',
                                  userReaction === emoji && 'ring-2 ring-primary ring-offset-1'
                                )}
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
                              <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Memory text */}
                    <div className="flex-grow flex items-center justify-center p-8 pt-14">
                      {effectiveSentence ? (
                        <blockquote className="text-center">
                          <span className="block text-6xl text-primary/10 font-serif leading-none mb-2 -ml-2">"</span>
                          <p className="font-serif text-xl italic text-foreground/90 leading-relaxed text-balance">
                            {effectiveSentence}
                          </p>
                          <span className="block text-6xl text-primary/10 font-serif leading-none mt-1 text-right -mr-2">"</span>
                        </blockquote>
                      ) : (
                        <div className="text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <Heart className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                          <p className="text-sm text-muted-foreground">No memory recorded for this day yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 2: Chat */}
                <CarouselItem className="h-full">
                  <div className="bg-card border border-border/60 rounded-3xl shadow-sm w-full h-full overflow-hidden">
                    {memoryData
                      ? <ChatSection content={content} memoryData={memoryData} />
                      : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-muted-foreground">No memory to chat about yet.</p>
                        </div>
                      )
                    }
                  </div>
                </CarouselItem>

              </CarouselContent>
            </Carousel>

          </div>

        ) : content && mode === 'add' && selectedDateForEditing ? (
          <div className={cn('flex flex-col items-center w-full h-full px-5 pt-12 pb-4 opacity-0', showContent && 'animate-fade-in')}>
            <div className="text-center mb-6 shrink-0">
              <p className="text-sm text-muted-foreground mb-1">
                {selectedDateForEditing.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="font-display text-2xl font-semibold text-foreground">What happened today?</h1>
            </div>

            {showLockForPastMemory ? (
              <div className="flex flex-col items-center justify-center gap-4 text-center border border-border/60 rounded-3xl p-10 w-full flex-grow bg-card">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Lock className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Memory recorded</p>
                  <p className="text-sm text-muted-foreground mt-1">It'll be revealed to you in a year ✨</p>
                </div>
              </div>
            ) : (
              <div className="w-full flex-grow flex flex-col gap-3">
                <Textarea
                  value={newUserSentence}
                  onChange={(e) => setNewUserSentence(e.target.value)}
                  placeholder="Write a memory for this day..."
                  className="flex-grow text-base font-serif italic p-5 rounded-2xl border-border/60 resize-none leading-relaxed focus-visible:ring-primary/30"
                />
                <Button
                  onClick={handleSaveSentence}
                  disabled={isSending || !newUserSentence.trim()}
                  className="rounded-2xl h-12 text-base font-medium"
                >
                  {isSending ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Memory
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Heart className="h-10 w-10 opacity-20" />
            <p className="text-sm">Something went wrong. Please reload.</p>
          </div>
        )}

      </div>

      {/* ── Bottom Navigation ─────────────────────────────── */}
      <div className="shrink-0 w-full px-6 pb-8 pt-2">
        <div className="flex items-center justify-around bg-card border border-border/60 rounded-2xl shadow-sm py-2 px-2">

          {mode === 'add' ? (
            <NavButton onClick={handleExitAddMode} label="Back">
              <ArrowLeft className="h-5 w-5" />
            </NavButton>
          ) : (
            <Dialog open={isAddMemoryDialogOpen} onOpenChange={setIsAddMemoryDialogOpen}>
              <DialogTrigger asChild>
                <NavButton label="Write">
                  <Pencil className="h-5 w-5" />
                </NavButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Add a Memory</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">Pick a date — you can go back to September 23, 2024.</p>
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
              <NavButton label="History">
                <History className="h-5 w-5" />
              </NavButton>
            </DialogTrigger>
            <DialogContent className="h-screen w-screen max-w-full flex flex-col rounded-none sm:rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">All Memories</DialogTitle>
              </DialogHeader>
              <div className="flex items-center space-x-4 px-1 py-2">
                <div className="flex items-center space-x-2">
                  <Switch id="spoiler-alert" checked={spoilerAlert} onCheckedChange={setSpoilerAlert} />
                  <Label htmlFor="spoiler-alert" className="text-sm">Spoiler Alert</Label>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={handleRandomSelect}>
                  Random ✨
                </Button>
              </div>
              <div className="relative flex-grow">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
                  <div className="grid grid-cols-4 items-center gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-1">Date</div>
                    <div className="text-center col-span-1">Alex</div>
                    <div className="text-center col-span-1">Amalie</div>
                    <div className="col-span-1" />
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="mt-1 flex flex-col pr-4">
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
                      <p className="text-muted-foreground text-center text-sm pt-10">No memories yet.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <NavButton
            label="Chat"
            onClick={handleToggleChat}
            active={activeSlide === 1}
            badge={unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : undefined}
          >
            <MessageSquare className="h-5 w-5" />
          </NavButton>

          <NavButton onClick={() => auth.signOut()} label="Sign out">
            <LogOut className="h-5 w-5" />
          </NavButton>

        </div>
      </div>

    </main>
  );
}

function NavButton({
  children,
  onClick,
  label,
  active,
  badge,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-colors',
        active
          ? 'text-primary bg-primary/8'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
      aria-label={label}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold px-1">
          {badge}
        </span>
      )}
    </button>
  );
}
