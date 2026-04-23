import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { useParams, Link } from 'react-router-dom';
import { Send, Image as ImageIcon, ArrowLeft, MailX } from 'lucide-react';
import { cn, formatRelativeTime } from '../lib/utils';
import { EmptyState } from '../components/UIStates';

export default function Inbox() {
  const { userId } = useParams<{ userId?: string }>();
  const { profile } = useAppStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  const [activePartner, setActivePartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to messages involving me
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
         const msg: any = payload.new;
         if (msg && profile) {
            // If it belongs to active chat, append it
            if (activePartner && (msg.sender_id === activePartner.id || msg.receiver_id === activePartner.id)) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }
            // Also refresh conversations list
            fetchConversations();
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, activePartner?.id]);

  useEffect(() => {
    if (userId) {
       fetchActivePartner(userId);
       fetchMessages(userId);
    } else {
       setActivePartner(null);
       setMessages([]);
    }
  }, [userId]);

  const fetchConversations = async () => {
    if (!profile) return;
    setLoadingChats(true);
    // Real implementation would use an RPC or group by queries depending on schema.
    // For now, let's fetch all follows and pretend they are potential conversations 
    // since Supabase SQL grouping is complex without a materialized view.
    // Let's actually fetch the latest messages:
    const { data: sentMessages } = await supabase.from('messages').select('*, receiver:receiver_id(id, username, display_name, profile_picture_url)').eq('sender_id', profile.id);
    const { data: receivedMessages } = await supabase.from('messages').select('*, sender:sender_id(id, username, display_name, profile_picture_url)').eq('receiver_id', profile.id);
    
    // Aggregate unique partners
    const partnersMap = new Map();
    [...(sentMessages||[]), ...(receivedMessages||[])].forEach(msg => {
       const isSent = msg.sender_id === profile.id;
       const partner = isSent ? msg.receiver : msg.sender;
       if (!partner) return;
       const existing = partnersMap.get(partner.id);
       if (!existing || new Date(msg.created_at).getTime() > new Date(existing.created_at).getTime()) {
           partnersMap.set(partner.id, { ...partner, lastMessage: msg.content, created_at: msg.created_at, seen: msg.seen });
       }
    });

    setConversations(Array.from(partnersMap.values()).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoadingChats(false);
  };

  const fetchActivePartner = async (uid: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', uid).single();
    if (data) setActivePartner(data);
  };

  const fetchMessages = async (uid: string) => {
    if (!profile) return;
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });
    
    if (data) {
       setMessages(data);
       scrollToBottom();
       // Mark as read
       await supabase.from('messages').update({ seen: true }).eq('sender_id', uid).eq('receiver_id', profile.id).eq('seen', false);
       
       // Re-update global store msg count since we read some
       const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', profile.id).eq('seen', false);
       useAppStore.getState().setUnreadMessages(count || 0);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !activePartner) return;
    
    setSending(true);
    try {
       await supabase.from('messages').insert({
         sender_id: profile.id,
         receiver_id: activePartner.id,
         content: newMessage.trim()
       });
       setNewMessage('');
    } catch(e) {
       console.error(e);
    } finally {
       setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
       bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-64px)] sm:h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 h-[53px]">
         <h1 className="text-xl font-bold">Messages</h1>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
         {/* Conversations List */}
         <div className={cn("w-full sm:w-[280px] border-r border-border flex flex-col overflow-y-auto", userId ? 'hidden sm:flex' : 'flex')}>
           {conversations.length === 0 && !loadingChats ? (
              <div className="p-4 text-center text-muted-foreground mt-4 text-sm">
                 No messages yet. Find friends to chat!
              </div>
           ) : (
             conversations.map(conv => (
               <Link to={`/messages/${conv.id}`} key={conv.id} className={cn("flex items-center gap-3 p-4 hover:bg-muted transition-colors border-b border-border/50", conv.id === userId && "bg-muted")}>
                 <div className="w-12 h-12 rounded-full bg-accent text-white overflow-hidden shrink-0 flex items-center justify-center font-bold relative">
                    {conv.profile_picture_url ? <img src={conv.profile_picture_url} className="w-full h-full object-cover"/> : conv.display_name?.charAt(0)}
                    {/* Add online status dot here later */}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-[15px] leading-tight">{conv.display_name}</div>
                    <div className={cn("text-[14px] truncate leading-tight mt-0.5", !conv.seen && conv.sender_id !== profile?.id ? "text-foreground font-bold" : "text-muted-foreground")}>
                       {conv.lastMessage}
                    </div>
                 </div>
               </Link>
             ))
           )}
         </div>

         {/* Chat Area */}
         <div className={cn("flex-1 flex flex-col relative", !userId ? 'hidden sm:flex items-center justify-center text-center p-8 bg-muted/10' : 'flex')}>
            {!userId ? (
              <EmptyState 
                icon={<MailX size={48} />}
                title="Select a message"
                description="Choose from your existing conversations, start a new one, or just keep swimming."
              />
            ) : (
              <>
                {/* Chat Header */}
                {activePartner && (
                  <div className="h-[60px] border-b border-border flex items-center px-4 bg-card/80 backdrop-blur-md sticky top-0 shrink-0 z-10 gap-3">
                     <Link to="/messages" className="sm:hidden p-2 -ml-2 hover:bg-muted rounded-full">
                       <ArrowLeft size={20} />
                     </Link>
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
                        {activePartner.profile_picture_url ? <img src={activePartner.profile_picture_url} className="w-full h-full object-cover"/> : activePartner.display_name?.charAt(0)}
                     </div>
                     <div>
                       <div className="font-bold text-[15px] hover:underline cursor-pointer"><Link to={`/profile/${activePartner.username}`}>{activePartner.display_name}</Link></div>
                     </div>
                  </div>
                )}
                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                   {messages.map((msg, i) => {
                     const isMe = msg.sender_id === profile?.id;
                     return (
                       <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%] px-4 py-2 text-[15px] rounded-2xl relative group", isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}>
                             {msg.content}
                             <div className={cn("text-[10px] absolute bottom-0 opacity-0 group-hover:opacity-100 transition-opacity -mb-4 whitespace-nowrap text-muted-foreground", isMe ? "right-0" : "left-0")}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </div>
                          </div>
                       </div>
                     )
                   })}
                   <div ref={bottomRef} />
                </div>
                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card shrink-0">
                   <form onSubmit={handleSend} className="flex items-center gap-2">
                     <button type="button" className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 rounded-full">
                       <ImageIcon size={20} />
                     </button>
                     <input 
                       type="text" 
                       value={newMessage}
                       onChange={e => setNewMessage(e.target.value)}
                       placeholder="Start a new message"
                       className="flex-1 bg-muted border border-border rounded-full px-4 py-2.5 outline-none focus:border-primary transition-colors text-[15px]"
                     />
                     <button 
                       type="submit" 
                       disabled={!newMessage.trim() || sending}
                       className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors"
                     >
                       <Send size={18} className="-ml-0.5" />
                     </button>
                   </form>
                </div>
              </>
            )}
         </div>
      </div>
    </div>
  );
}
