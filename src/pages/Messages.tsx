import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../pages/Navbar';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  other_user: Profile | null;
  last_message: string | null;
  last_message_at: string | null;
  has_unread: boolean;
}

interface Message {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

const SUGGESTED_QUESTIONS = [
  "What else is included with the sale?",
  "Any mechanical issues, even minor ones?",
  "Can I schedule a time to see it in person?",
];

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const hasAutoSelected = useRef(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const sendErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();
  const [showSuggestions, setShowSuggestions] = useState(true);
  // On mobile: 'list' shows the sidebar, 'chat' shows the conversation
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const navigate = useNavigate();

  const formatTime = (iso: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const convoItemStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #111',
    backgroundColor: isSelected ? '#01a3fc22' : 'transparent',
    borderLeft: isSelected ? '3px solid #01a3fc' : '3px solid transparent',
    transition: 'background 0.15s',
    // Larger tap target on mobile
    minHeight: isMobile ? 72 : 'auto',
  });

  const messageBubbleStyle = (isMine: boolean): React.CSSProperties => ({
    maxWidth: isMobile ? '80%' : '65%',
    alignSelf: isMine ? 'flex-end' : 'flex-start',
    backgroundColor: isMine ? '#01a3fc' : '#1a1a1a',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    fontSize: isMobile ? 15 : 14,
    lineHeight: 1.5,
    wordBreak: 'break-word' as const,
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = '/login';
      } else {
        setCurrentUser(data.user);
      }
    });
  }, []);

  useEffect(() => {
    const convoId = searchParams.get('conversation');
    if (convoId && conversations.length > 0 && !hasAutoSelected.current) {
      const match = conversations.find((c) => c.id === convoId);
      if (match) {
        setSelectedConvo(match);
        hasAutoSelected.current = true;
        if (isMobile) setMobileView('chat');
      }
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchConversations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error || !data) { setLoading(false); return; }

      const enriched = await Promise.all(
        data.map(async (convo: any) => {
          const otherId = convo.buyer_id === currentUser.id ? convo.seller_id : convo.buyer_id;
          const { data: profile } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', otherId).single();
          const { data: lastMsg } = await supabase.from('messages').select('content, created_at, is_read, sender_id').eq('conversation_id', convo.id).order('created_at', { ascending: false }).limit(1).single();
          const { count: unreadCount } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convo.id).eq('is_read', false).neq('sender_id', currentUser.id);
          return {
            ...convo,
            other_user: profile ?? null,
            last_message: lastMsg?.content ?? null,
            last_message_at: lastMsg?.created_at ?? convo.created_at,
            has_unread: (unreadCount ?? 0) > 0,
          };
        })
      );

      const sorted = enriched.sort((a, b) => {
        if (a.has_unread && !b.has_unread) return -1;
        if (!a.has_unread && b.has_unread) return 1;
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(sorted);
      setLoading(false);
    };
    fetchConversations();
  }, [currentUser]);

  const markConvoAsRead = (convoId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === convoId ? { ...c, has_unread: false } : c)));
  };

  useEffect(() => {
    if (!selectedConvo?.id) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*, profiles:sender_id (username, avatar_url)').eq('conversation_id', selectedConvo.id).order('created_at', { ascending: true });
      setMessages(data ?? []);
      await supabase.from('messages').update({ is_read: true }).eq('conversation_id', selectedConvo.id).neq('sender_id', currentUser.id);
      markConvoAsRead(selectedConvo.id);
    };
    fetchMessages();
    setShowSuggestions(true);

    const channel = supabase
      .channel(`messages:${selectedConvo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvo.id}` }, async (payload) => {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', (payload.new as Message).sender_id).single();
        const newMsg: Message = { ...(payload.new as Message), profiles: profile ?? null };
        setMessages((prev) => {
          const optimisticIndex = prev.findIndex((m) => m.id.startsWith('temp-') && m.content === newMsg.content && m.sender_id === newMsg.sender_id);
          if (optimisticIndex !== -1) { const updated = [...prev]; updated[optimisticIndex] = newMsg; return updated; }
          const exists = prev.some((m) => m.id === newMsg.id);
          if (exists) return prev;
          return [...prev, newMsg];
        });
        if ((payload.new as Message).sender_id !== currentUser?.id) {
          await supabase.from('messages').update({ is_read: true }).eq('id', (payload.new as Message).id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvo.id}` }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === (payload.new as Message).id ? { ...m, is_read: (payload.new as Message).is_read } : m));
      })
      .subscribe();

    const typingChannel = supabase
      .channel(`typing:${selectedConvo.id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== currentUser?.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [selectedConvo?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function showSendError(msg: string) {
    setSendError(msg);
    if (sendErrorTimeout.current) clearTimeout(sendErrorTimeout.current);
    sendErrorTimeout.current = setTimeout(() => setSendError(null), 4000);
  }

  const sendMessage = async (overrideContent?: string) => {
    const content = (overrideContent ?? newMessage).trim();
    if (!content || !selectedConvo || !currentUser) return;
    setNewMessage('');
    setShowSuggestions(false);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = { id: tempId, created_at: new Date().toISOString(), conversation_id: selectedConvo.id, sender_id: currentUser.id, content, is_read: false, profiles: null };
    setMessages((prev) => [...prev, optimistic]);
    const { error } = await supabase.from('messages').insert({ conversation_id: selectedConvo.id, sender_id: currentUser.id, content });
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (error.message.includes('Rate limit exceeded')) {
        showSendError("You're sending messages too fast. Please wait a few seconds.");
      } else {
        showSendError('Failed to send message. Please try again.');
        setNewMessage(content);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const AvatarCircle = ({ avatarUrl, username, size = 28 }: { avatarUrl?: string | null; username?: string | null; size?: number }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: '#01a3fc', flexShrink: 0, overflow: 'hidden' }}>
      {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : username?.[0]?.toUpperCase() ?? '?'}
    </div>
  );

  function handleSelectConvo(convo: Conversation) {
    setSelectedConvo(convo);
    if (isMobile) setMobileView('chat');
  }

  function handleBackToList() {
    setMobileView('list');
  }

  const lastMyMessageIndex = messages.reduce((lastIdx, msg, idx) => msg.sender_id === currentUser?.id ? idx : lastIdx, -1);

  // --- SIDEBAR ---
  const Sidebar = (
    <div style={{ width: isMobile ? '100%' : 320, borderRight: isMobile ? 'none' : '1px solid #222', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%' }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #222', fontSize: 18, fontWeight: 900, letterSpacing: 1, color: '#fff' }}>
        MESSAGES
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && <div style={{ padding: 20, color: '#555', fontSize: 14 }}>Loading...</div>}
        {!loading && conversations.length === 0 && <div style={{ padding: 20, color: '#555', fontSize: 14 }}>No conversations yet.</div>}
        {conversations.map((convo) => (
          <div
            key={convo.id}
            style={convoItemStyle(!isMobile && selectedConvo?.id === convo.id)}
            onClick={() => handleSelectConvo(convo)}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <AvatarCircle avatarUrl={convo.other_user?.avatar_url} username={convo.other_user?.username} size={44} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: convo.has_unread ? 800 : 700, fontSize: 14, color: '#fff' }}>
                  {convo.other_user?.username ?? 'Unknown User'}
                </span>
                <span style={{ fontSize: 11, color: convo.has_unread ? '#01a3fc' : '#444', fontWeight: convo.has_unread ? 600 : 400, flexShrink: 0, marginLeft: 8 }}>
                  {formatTime(convo.last_message_at)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 12, color: convo.has_unread ? '#bbb' : '#666', fontWeight: convo.has_unread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                  {convo.last_message ?? 'No messages yet'}
                </span>
                {convo.has_unread && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#01a3fc', flexShrink: 0 }} />}
              </div>
            </div>
            {/* Chevron on mobile to indicate tap action */}
            {isMobile && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>}
          </div>
        ))}
      </div>
    </div>
  );

  // --- CHAT PANEL ---
  const ChatPanel = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: isMobile ? '100%' : 'auto' }}>
      {!selectedConvo ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444', gap: 12 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontSize: 14 }}>Select a conversation</span>
        </div>
      ) : (
        <>
          {/* CHAT HEADER */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 15, minHeight: 56 }}>
            {/* Back button on mobile */}
            {isMobile && (
              <button onClick={handleBackToList} style={{ background: 'none', border: 'none', color: '#01a3fc', cursor: 'pointer', padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#01a3fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div onClick={() => navigate(`/profile/${selectedConvo.other_user?.username}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
              <AvatarCircle avatarUrl={selectedConvo.other_user?.avatar_url} username={selectedConvo.other_user?.username} size={34} />
              <span style={{ color: '#fff' }}>{selectedConvo.other_user?.username ?? 'Unknown User'}</span>
            </div>
          </div>

          {/* MESSAGE LIST */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.length === 0 && (
              <div style={{ color: '#444', fontSize: 13, textAlign: 'center', marginTop: 20 }}>No messages yet. Say hello!</div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUser?.id;
              const nextMsg = messages[i + 1];
              const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
              const isLastMyMsg = i === lastMyMessageIndex;
              return (
                <div key={msg.id}>
                  <div style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ width: 28, flexShrink: 0 }}>
                      {!isMine && isLastInGroup && <AvatarCircle avatarUrl={msg.profiles?.avatar_url} username={msg.profiles?.username} size={28} />}
                    </div>
                    <div style={messageBubbleStyle(isMine)}>{msg.content}</div>
                  </div>
                  {isMine && isLastMyMsg && (
                    <div style={{ textAlign: 'right', fontSize: 11, color: msg.is_read ? '#01a3fc' : '#444', marginTop: 3, marginRight: 36, letterSpacing: 0.2 }}>
                      {msg.is_read ? 'Seen' : 'Sent'}
                    </div>
                  )}
                </div>
              );
            })}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 28, flexShrink: 0 }}>
                  <AvatarCircle avatarUrl={selectedConvo.other_user?.avatar_url} username={selectedConvo.other_user?.username} size={28} />
                </div>
                <div style={{ backgroundColor: '#1a1a1a', borderRadius: '18px 18px 18px 4px', padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#555', animation: 'typing-dot 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* SUGGESTED QUESTIONS - only shown before the first message in a chat */}
          {showSuggestions && messages.length === 0 && (
            <div style={{ padding: isMobile ? '0 12px 10px' : '0 24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 0.5 }}>SUGGESTED QUESTIONS</span>
                <button
                  onClick={() => setShowSuggestions(false)}
                  style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}
                  aria-label="Dismiss suggestions"
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      backgroundColor: '#111',
                      border: '1px solid #333',
                      borderRadius: 18,
                      padding: '8px 14px',
                      color: '#01a3fc',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGE INPUT */}
          <div style={{ padding: isMobile ? '10px 12px' : '16px 24px', borderTop: '1px solid #222', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sendError && <div style={{ fontSize: 12, color: '#ff6b6b', padding: '0 4px' }}>{sendError}</div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => {
                  setNewMessage(e.target.value);
                  supabase.channel(`typing:${selectedConvo.id}`).send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUser?.id } });
                }}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, backgroundColor: '#111', border: '1px solid #333', borderRadius: 24, padding: '11px 16px', color: '#fff', fontSize: isMobile ? 16 : 14, resize: 'none' as const, outline: 'none', maxHeight: 120 }}
              />
              <button onClick={() => sendMessage()} style={{ backgroundColor: '#01a3fc', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translate(-1px, -0.25px)' }}>
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
      <Navbar />

      <div style={{ display: 'flex', height: 'calc(100vh - 73px)', backgroundColor: '#000', color: '#fff', overflow: 'hidden' }}>
        {isMobile ? (
          // MOBILE: show either list or chat, never both
          mobileView === 'list' ? Sidebar : ChatPanel
        ) : (
          // DESKTOP: side-by-side layout
          <>
            {Sidebar}
            {ChatPanel}
          </>
        )}
      </div>
    </div>
  );
}