import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { chatService } from '../../../Backend/services/chatService';
import { Send, AlertTriangle, ShieldAlert, Loader2, MessageSquare, ShieldCheck } from 'lucide-react';
import './Chat.css';

export default function ChatHub() {
  const user = useAppStore((state) => state.user);
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatMetadata, setChatMetadata] = useState(null);
  const [inputText, setInputText] = useState('');
  
  const [loadingChats, setLoadingChats] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  const messagesEndRef = useRef(null);

  // 1. Listen to active conversations list
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (user) {
      setLoadingChats(true);
      unsubscribe = chatService.listenToUserChats((data) => {
        setChats(data);
        setLoadingChats(false);
        
        // If a chat was selected, update its reference in the list
        if (selectedChat) {
          const updated = data.find(c => c.id === selectedChat.id);
          if (updated) {
            setSelectedChat(updated);
          }
        }
      });
    }

    return () => unsubscribe();
  }, [user]);

  // 2. Listen to messages & metadata when a chat is selected
  useEffect(() => {
    let unsubscribeMessages = () => {};
    let unsubscribeMetadata = () => {};
    
    if (selectedChat) {
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
    setSending(true);
    setErrorBanner('');

    try {
      await chatService.sendMessage(selectedChat.id, textToSend, selectedChat.itemTitle);
      scrollToBottom();
    } catch (err) {
      console.error(err);
      setErrorBanner(err.message || 'Message failed to send.');
      // Auto dismiss warning after 6 seconds
      setTimeout(() => {
        setErrorBanner('');
      }, 6000);
    } finally {
      setSending(false);
    }
  };

  const getPartnerName = (chat) => {
    if (!chat || !chat.participantNames) return 'User';
    const partnerId = Object.keys(chat.participants).find(id => id !== user.uid);
    return chat.participantNames[partnerId] || 'User';
  };

  return (
    <div className="chat-container glass fade-in">
      {/* Left Chat List Panel */}
      <div className="chat-list-panel">
        <div className="chat-list-header">Conversations</div>
        
        <div className="chat-list-items">
          {loadingChats ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="spinner" size={24} />
            </div>
          ) : chats.length > 0 ? (
            chats.map((chat) => {
              const isActive = selectedChat?.id === chat.id;
              return (
                <button
                  key={chat.id}
                  className={`chat-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  {chat.itemImage ? (
                    <img src={chat.itemImage} alt="" className="chat-item-img" />
                  ) : (
                    <div className="chat-item-img" style={{ background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={20} style={{ color: '#aaa' }} />
                    </div>
                  )}
                  <div className="chat-item-info">
                    <span className="chat-item-name">{getPartnerName(chat)}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                      Item: {chat.itemTitle}
                    </span>
                    <span className="chat-item-msg">{chat.lastMessage || 'Start a conversation...'}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--light-text)', fontSize: '0.9rem' }}>
              No active conversations yet. Claims must be approved to start chatting.
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Message Window */}
      <div className="chat-window">
        {selectedChat ? (
          <>
            {/* Header info */}
            <div className="chat-window-header">
              {selectedChat.itemImage && (
                <img 
                  src={selectedChat.itemImage} 
                  alt="" 
                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                />
              )}
              <div>
                <div className="chat-window-title">{getPartnerName(selectedChat)}</div>
                <div className="chat-window-subtitle">Item: {selectedChat.itemTitle}</div>
              </div>
              
              {chatMetadata && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                  {chatMetadata.warningCount > 0 && !chatMetadata.isBlockedByAI && (
                    <span className="item-badge" style={{ background: 'rgba(255,234,167,0.25)', color: '#d6a000', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertTriangle size={12} /> {chatMetadata.warningCount}/5 Warnings
                    </span>
                  )}
                  
                  {chatMetadata.isBlockedByAI ? (
                    <span className="item-badge" style={{ background: 'rgba(255,118,117,0.15)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldAlert size={12} /> Locked by AI
                    </span>
                  ) : (
                    <span className="item-badge" style={{ background: 'rgba(85,239,196,0.15)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={12} /> AI Moderated
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Error Banner for blocked messages */}
            {errorBanner && (
              <div className="chat-warning-banner">
                <AlertTriangle size={16} />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Message History logs */}
            <div className="chat-messages-log">
              {messages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="chat-bubble-system">
                      <div className="system-pill">{msg.text}</div>
                    </div>
                  );
                }

                const isOutgoing = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`chat-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                    <div className="chat-bubble">
                      <p>{msg.text}</p>
                      <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.7, textAlign: 'right', marginTop: '0.25rem' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer sending inputs */}
            {chatMetadata?.isBlockedByAI ? (
              <div className="chat-locked-overlay">
                <ShieldAlert size={18} />
                <span>This conversation has been permanently locked by AI moderation due to guidelines violation.</span>
              </div>
            ) : (
              <form className="chat-input-panel" onSubmit={handleSendMessage}>
                <div className="chat-input-wrapper">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type a message regarding return arrangements..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={sending}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem' }} disabled={sending || !inputText.trim()}>
                  {sending ? <Loader2 className="spinner" size={16} style={{ width: 16, height: 16 }} /> : <Send size={16} />}
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--light-text)' }}>
            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>Select a conversation</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Choose an active chat from the left panel to arrange return meetings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
