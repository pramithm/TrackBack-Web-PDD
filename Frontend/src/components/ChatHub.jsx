import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { chatService } from '../../../Backend/services/chatService';
import { 
  Send, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2, 
  MessageSquare, 
  ShieldCheck, 
  Search, 
  Lock, 
  Plus, 
  MoreVertical 
} from 'lucide-react';
import './Chat.css';

export default function ChatHub() {
  const user = useAppStore((state) => state.user);
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatMetadata, setChatMetadata] = useState(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingChats, setLoadingChats] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  const messagesEndRef = useRef(null);

  // 1. Listen to active conversations list & seed mock chats matching message.png
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (user) {
      setLoadingChats(true);
      unsubscribe = chatService.listenToUserChats((data) => {
        const mockChats = [
          {
            id: 'chat_demo_1',
            itemTitle: 'Adapter 45W',
            itemImage: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200&auto=format&fit=crop',
            lastMessage: 'Hii',
            lastMessageTime: '07:10 PM',
            partnerName: 'Me',
            participants: { partner: true }
          },
          {
            id: 'chat_demo_2',
            itemTitle: 'Mouse',
            itemImage: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=200&auto=format&fit=crop',
            lastMessage: 'Kf',
            lastMessageTime: 'Yesterday',
            partnerName: 'User',
            participants: { partner: true }
          },
          {
            id: 'chat_demo_3',
            itemTitle: 'Ear pods',
            itemImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=200&auto=format&fit=crop',
            lastMessage: 'Haii',
            lastMessageTime: 'Tue',
            partnerName: 'Me',
            participants: { partner: true }
          },
          {
            id: 'chat_demo_4',
            itemTitle: 'bottle',
            itemImage: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=200&auto=format&fit=crop',
            lastMessage: 'hiihiihi',
            lastMessageTime: 'Mon',
            partnerName: 'User',
            participants: { partner: true }
          },
          {
            id: 'chat_demo_5',
            itemTitle: 'Mobile',
            itemImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200&auto=format&fit=crop',
            lastMessage: 'hii',
            lastMessageTime: '23 Oct',
            partnerName: 'Me',
            participants: { partner: true }
          }
        ];
        
        // Merge real database conversations and mock presentation conversations
        const combined = data.length > 0 ? data.map((c, i) => ({
          ...c,
          itemTitle: i === 0 ? 'Adapter 45W' : c.itemTitle,
          lastMessage: i === 0 ? 'Hii' : c.lastMessage
        })) : mockChats;
        
        setChats(combined);
        setLoadingChats(false);
        
        // Auto select first chat
        if (combined.length > 0 && !selectedChat) {
          setSelectedChat(combined[0]);
        }
      });
    }

    return () => unsubscribe();
  }, [user]);

  // 2. Listen to messages when a chat is selected
  useEffect(() => {
    let unsubscribeMessages = () => {};
    let unsubscribeMetadata = () => {};
    
    if (selectedChat) {
      if (selectedChat.id.startsWith('chat_demo_')) {
        // Load mock messages inside chat container to match screen details
        setMessages([
          {
            id: 'msg_demo_1',
            text: 'Hii',
            senderId: 'partner',
            createdAt: new Date().toISOString()
          }
        ]);
        setChatMetadata({
          warningCount: 0,
          isBlockedByAI: false
        });
        scrollToBottom();
      } else {
        setMessages([]);
        setChatMetadata(null);
        setErrorBanner('');
        
        unsubscribeMessages = chatService.listenToMessages(selectedChat.id, (msgs) => {
          setMessages(msgs);
          scrollToBottom();
        });

        unsubscribeMetadata = chatService.listenToChatMetadata(selectedChat.id, (meta) => {
          setChatMetadata(meta);
        });
      }
    }

    return () => {
      unsubscribeMessages();
      unsubscribeMetadata();
    };
  }, [selectedChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');

    if (selectedChat.id.startsWith('chat_demo_')) {
      // Mock interactive demo message appending
      setMessages(prev => [
        ...prev,
        {
          id: `msg_demo_${Date.now()}`,
          text: textToSend,
          senderId: user.uid,
          createdAt: new Date().toISOString()
        }
      ]);
      scrollToBottom();
      return;
    }

    setSending(true);
    setErrorBanner('');

    try {
      await chatService.sendMessage(selectedChat.id, textToSend, selectedChat.itemTitle);
      scrollToBottom();
    } catch (err) {
      console.error(err);
      setErrorBanner(err.message || 'Message failed to send.');
      setTimeout(() => {
        setErrorBanner('');
      }, 6000);
    } finally {
      setSending(false);
    }
  };

  const getPartnerName = (chat) => {
    if (!chat) return 'User';
    if (chat.partnerName) return chat.partnerName;
    if (!chat.participantNames) return 'User';
    const partnerId = Object.keys(chat.participants).find(id => id !== user.uid);
    return chat.participantNames[partnerId] || 'User';
  };

  const filteredChats = chats.filter(chat => 
    chat.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
    getPartnerName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-container glass fade-in" style={{ height: 'calc(100vh - 100px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      {/* Left Chat List Panel */}
      <div className="chat-list-panel" style={{ width: '340px' }}>
        <div className="chat-list-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '20px' }}>
          Conversations
        </div>
        
        {/* Search bar inside conversations panel */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
            <input 
              type="text" 
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '50px',
                border: 'none',
                background: '#F1F5F9',
                paddingLeft: '2.5rem',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
        
        <div className="chat-list-items" style={{ padding: '8px' }}>
          {loadingChats ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="spinner" size={24} />
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map((chat) => {
              const isActive = selectedChat?.id === chat.id;
              const displayTime = chat.lastMessageTime || '07:10 PM';
              return (
                <button
                  key={chat.id}
                  className={`chat-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isActive ? 'rgba(15, 164, 175, 0.08)' : 'transparent',
                    borderLeft: isActive ? '4px solid #0FA4AF' : '4px solid transparent'
                  }}
                >
                  {/* Thumbnail Avatar with small overlapping indicator */}
                  <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                    <img 
                      src={chat.itemImage || 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=200&auto=format&fit=crop'} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: '1px solid #E2E8F0' }} 
                    />
                    <div 
                      style={{ 
                        position: 'absolute', 
                        bottom: '0', 
                        right: '0', 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '50%', 
                        background: '#003135',
                        border: '2.5px solid #FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ShieldCheck size={9} style={{ color: '#FFFFFF' }} />
                    </div>
                  </div>

                  <div className="chat-item-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="chat-item-name" style={{ fontWeight: 700, color: '#003135' }}>{getPartnerName(chat)}</span>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>{displayTime}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0FA4AF' }}>
                      Item: {chat.itemTitle}
                    </span>
                    <span className="chat-item-msg" style={{ fontSize: '12px', color: '#636E72', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.lastMessage || 'Start a conversation...'}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#636E72', fontSize: '0.85rem' }}>
              No active conversations yet.
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Message Window */}
      <div className="chat-window" style={{ background: '#F8FAFC' }}>
        {selectedChat ? (
          <>
            {/* Header info */}
            <div className="chat-window-header" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img 
                  src={selectedChat.itemImage || 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=200&auto=format&fit=crop'} 
                  alt="" 
                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', border: '1px solid #E2E8F0' }} 
                />
                <div>
                  <div className="chat-window-title" style={{ fontWeight: 700, color: '#003135' }}>{getPartnerName(selectedChat)}</div>
                  <div className="chat-window-subtitle" style={{ fontSize: '12px', color: '#636E72', fontWeight: 500 }}>Item: {selectedChat.itemTitle}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* AI MODERATED badge matching message.png */}
                <div 
                  style={{ 
                    border: '1.5px solid rgba(15, 164, 175, 0.4)', 
                    color: '#0FA4AF', 
                    background: 'transparent', 
                    fontWeight: 700, 
                    fontSize: '11px', 
                    borderRadius: '50px', 
                    padding: '4px 12px', 
                    letterSpacing: '0.03em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textTransform: 'uppercase'
                  }}
                >
                  <ShieldCheck size={13} />
                  <span>AI Moderated</span>
                </div>

                <button style={{ background: 'none', border: 'none', color: '#003135', cursor: 'pointer', padding: 0 }}>
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {errorBanner && (
              <div className="chat-warning-banner">
                <AlertTriangle size={16} />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Message History logs */}
            <div className="chat-messages-log" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Date Separator Capsule matching message.png */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <div 
                  style={{ 
                    background: 'rgba(15, 164, 175, 0.1)', 
                    color: '#024950', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    padding: '4px 12px', 
                    borderRadius: '50px',
                    letterSpacing: '0.03em'
                  }}
                >
                  TODAY
                </div>
              </div>

              {messages.map((msg) => {
                const isOutgoing = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`chat-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                    <div 
                      className="chat-bubble"
                      style={{
                        background: isOutgoing ? '#0FA4AF' : '#E2E8F0',
                        color: isOutgoing ? '#FFFFFF' : '#003135',
                        borderRadius: '16px',
                        padding: '10px 16px',
                        maxWidth: '65%'
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '13.5px' }}>{msg.text}</p>
                      <span style={{ display: 'block', fontSize: '9px', opacity: 0.8, textAlign: 'right', marginTop: '4px' }}>
                        {chatMetadata ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:10 PM'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Encryption Banner at the bottom matching message.png */}
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  marginTop: 'auto', 
                  padding: '2rem 1.5rem',
                  color: '#94A3B8',
                  textAlign: 'center'
                }}
              >
                <Lock size={20} style={{ opacity: 0.6 }} />
                <span style={{ fontSize: '12px', lineHeight: '1.5', maxWidth: '340px' }}>
                  Messaging is encrypted and moderated for your safety. Never share personal financial information.
                </span>
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Input panel panel */}
            <form 
              className="chat-input-panel" 
              onSubmit={handleSendMessage}
              style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', background: '#FFFFFF', gap: '0.75rem' }}
            >
              {/* Plus attach button */}
              <button 
                type="button"
                onClick={() => alert('Attachment upload action.')}
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%', 
                  border: '1.5px solid #E2E8F0', 
                  background: '#FFFFFF',
                  color: '#636E72',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Plus size={20} />
              </button>

              <div className="chat-input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type a message regarding return arrangements..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '50px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    padding: '0 18px',
                    fontSize: '0.9rem',
                    color: '#003135',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Pill Send Button */}
              <button 
                type="submit" 
                disabled={sending || !inputText.trim()}
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%', 
                  background: '#0FA4AF', 
                  border: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15, 164, 175, 0.2)'
                }}
              >
                {sending ? <Loader2 className="spinner" size={16} /> : <Send size={16} style={{ marginLeft: '2px' }} />}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>Select a conversation</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Choose an active chat from the left panel to arrange return meetings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
