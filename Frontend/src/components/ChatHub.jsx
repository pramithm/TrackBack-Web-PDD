import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { chatService } from '../../../Backend/services/chatService';
import { userService } from '../../../Backend/services/userService';
import { aiService } from '../../../Backend/services/aiService';
import { errorHelper } from '../services/errorHelper';
import { rtdb } from '../../../Backend/config/firebase';
import { ref, onValue, set } from 'firebase/database';
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
  MoreVertical,
  Flag,
  UserX,
  UserCheck,
  X
} from 'lucide-react';
import './Chat.css';

export default function ChatHub() {
  const user = useAppStore((state) => state.user);
  const selectedChatId = useAppStore((state) => state.selectedChatId);
  const setSelectedChatId = useAppStore((state) => state.setSelectedChatId);
  const isOffline = useAppStore((state) => state.isOffline);
  const showToast = useAppStore((state) => state.showToast);
  const showConfirm = useAppStore((state) => state.showConfirm);
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatMetadata, setChatMetadata] = useState(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingChats, setLoadingChats] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Blocking & Reporting States
  const [isPartnerBlocked, setIsPartnerBlocked] = useState(false);
  const [amIBlocked, setAmIBlocked] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [blockedUids, setBlockedUids] = useState([]);

  const dropdownRef = useRef(null);

  const messagesEndRef = useRef(null);

  // Cleared Chats States
  const [clearedMap, setClearedMap] = useState({});
  const [isSelectingForClear, setIsSelectingForClear] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState([]);

  // Load cleared chats from localStorage on load
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`clearedChats_${user.uid}`);
      try {
        setClearedMap(stored ? JSON.parse(stored) : {});
      } catch (e) {
        setClearedMap({});
      }
    }
  }, [user]);

  // Remove chat from cleared map when opened/selected
  useEffect(() => {
    if (selectedChat && user) {
      const stored = localStorage.getItem(`clearedChats_${user.uid}`);
      let currentMap = {};
      try {
        currentMap = stored ? JSON.parse(stored) : {};
      } catch (e) {}

      if (currentMap[selectedChat.id]) {
        delete currentMap[selectedChat.id];
        setClearedMap(currentMap);
        localStorage.setItem(`clearedChats_${user.uid}`, JSON.stringify(currentMap));
      }
    }
  }, [selectedChat, user]);

  const handleClearAllChats = () => {
    if (!user) return;
    const now = Date.now();
    const updatedMap = { ...clearedMap };
    chats.forEach(chat => {
      updatedMap[chat.id] = now;
    });
    setClearedMap(updatedMap);
    localStorage.setItem(`clearedChats_${user.uid}`, JSON.stringify(updatedMap));
    setSelectedChat(null);
    showToast('All chats cleared successfully.', 'success');
  };

  const handleClearSelectedChats = (chatIdsToClear) => {
    if (!user || !chatIdsToClear || chatIdsToClear.length === 0) return;
    const now = Date.now();
    const updatedMap = { ...clearedMap };
    chatIdsToClear.forEach(id => {
      updatedMap[id] = now;
    });
    setClearedMap(updatedMap);
    localStorage.setItem(`clearedChats_${user.uid}`, JSON.stringify(updatedMap));
    
    if (selectedChat && chatIdsToClear.includes(selectedChat.id)) {
      setSelectedChat(null);
    }
    
    showToast('Selected chats cleared successfully.', 'success');
  };

  // 1. Listen to active conversations list, group them, and filter out system messages
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
            partnerName: 'Sarah',
            participants: { partner: true }
          },
          {
            id: 'chat_demo_2',
            itemTitle: 'Mouse',
            itemImage: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=200&auto=format&fit=crop',
            lastMessage: 'Kf',
            lastMessageTime: 'Yesterday',
            partnerName: 'John Doe',
            participants: { partner: true }
          },
          {
            id: 'chat_demo_3',
            itemTitle: 'Ear pods',
            itemImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=200&auto=format&fit=crop',
            lastMessage: 'Haii',
            lastMessageTime: 'Tue',
            partnerName: 'Alex',
            participants: { partner: true }
          }
        ];
        
        // Group and de-duplicate by partner ID
        const uniqueChatsMap = {};
        const chatsToProcess = data.length > 0 ? data : mockChats;

        chatsToProcess.forEach((chat) => {
          const partnerId = Object.keys(chat.participants || {}).find(id => id !== user.uid) || 'partner';
          
          // Filter out System messages, notifications, or system logs from appearing in conversations list
          if (
            chat.id === 'SYSTEM' || 
            partnerId === 'SYSTEM' || 
            chat.lastMessage?.includes('🚫 SYSTEM') || 
            chat.lastMessage?.includes('⚠️ SYSTEM') ||
            chat.isSystem
          ) {
            return;
          }
          
          const existing = uniqueChatsMap[partnerId];
          // Keep the one with the latest lastMessageTime
          if (!existing || chat.lastMessageTime > existing.lastMessageTime) {
            uniqueChatsMap[partnerId] = chat;
          }
        });

        const combined = Object.values(uniqueChatsMap).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        
        setChats(combined);
        setLoadingChats(false);
        
        // Auto select chat if selectedChatId is set in store
        if (selectedChatId) {
          const target = combined.find(c => c.id === selectedChatId);
          if (target) {
            setSelectedChat(target);
          } else {
            // Find by partner ID fallback
            const targetChat = data.find(c => c.id === selectedChatId);
            if (targetChat) {
              const partnerId = Object.keys(targetChat.participants || {}).find(id => id !== user.uid);
              const uniqueTarget = combined.find(c => Object.keys(c.participants || {}).includes(partnerId));
              if (uniqueTarget) {
                setSelectedChat(uniqueTarget);
              }
            }
          }
        } else if (combined.length > 0 && !selectedChat) {
          setSelectedChat(combined[0]);
        }
      });
    }

    return () => unsubscribe();
  }, [user, selectedChatId]);

  // Reset selectedChatId when selectedChat is successfully set
  useEffect(() => {
    if (selectedChat) {
      localStorage.setItem(`lastRead_${selectedChat.id}`, Date.now().toString());
      if (selectedChatId === selectedChat.id) {
        setSelectedChatId(null);
      }
    }
  }, [selectedChat, selectedChatId]);

  // 2. Listen to messages and block status when a chat is selected
  useEffect(() => {
    let unsubscribeMessages = () => {};
    let unsubscribeMetadata = () => {};
    let unsubscribeBlock1 = () => {};
    let unsubscribeBlock2 = () => {};
    
    setIsPartnerBlocked(false);
    setAmIBlocked(false);

    if (selectedChat) {
      if (selectedChat.id.startsWith('chat_demo_')) {
        // Load mock messages inside chat container
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

        // Listen to block status in real time
        const partnerId = Object.keys(selectedChat.participants || {}).find(id => id !== user?.uid);
        if (partnerId) {
          const blockRef1 = ref(rtdb, `blocks/${user.uid}/${partnerId}`);
          unsubscribeBlock1 = onValue(blockRef1, (snap) => {
            setIsPartnerBlocked(snap.val() === true);
          });
          
          const blockRef2 = ref(rtdb, `blocks/${partnerId}/${user.uid}`);
          unsubscribeBlock2 = onValue(blockRef2, (snap) => {
            setAmIBlocked(snap.val() === true);
          });
        }
      }
    }

    return () => {
      unsubscribeMessages();
      unsubscribeMetadata();
      unsubscribeBlock1();
      unsubscribeBlock2();
    };
  }, [selectedChat, user]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptionsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to blocked users UIDs for list tags
  useEffect(() => {
    if (user) {
      const blocksRef = ref(rtdb, `blocks/${user.uid}`);
      const unsubscribe = onValue(blocksRef, (snap) => {
        const val = snap.val();
        if (!val) {
          setBlockedUids([]);
          return;
        }
        setBlockedUids(Object.keys(val).filter(k => val[k] === true));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleBlockToggle = async () => {
    setShowOptionsDropdown(false);
    if (!selectedChat) return;

    if (isOffline) {
      showToast('Network connection unavailable. Cannot update block status.', 'error');
      return;
    }
    
    // Check if demo chat
    if (selectedChat.id.startsWith('chat_demo_')) {
      setIsPartnerBlocked(!isPartnerBlocked);
      showToast(isPartnerBlocked ? 'User unblocked successfully (Demo).' : 'User blocked successfully (Demo).', 'success');
      return;
    }

    const partnerId = Object.keys(selectedChat.participants || {}).find(id => id !== user?.uid);
    if (!partnerId) return;

    try {
      if (isPartnerBlocked) {
        await userService.unblockUser(partnerId);
        showToast('User unblocked successfully.', 'success');
      } else {
        showConfirm(
          'Block User',
          `Are you sure you want to block ${getPartnerName(selectedChat)}? You will not be able to send or receive messages from them.`,
          async () => {
            try {
              await userService.blockUser(partnerId);
              showToast('User blocked successfully.', 'success');
            } catch (err) {
              console.error(err);
              showToast('Failed to update block state: ' + errorHelper.getFriendlyMessage(err), 'error');
            }
          }
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update block state: ' + errorHelper.getFriendlyMessage(err), 'error');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChat) return;

    if (isOffline) {
      showToast('Network connection unavailable. Cannot submit report.', 'error');
      return;
    }

    // Check if demo chat
    if (selectedChat.id.startsWith('chat_demo_')) {
      showToast(`[DEMO REPORT SUCCESS] Reason: ${reportReason}`, 'success');
      setShowReportModal(false);
      setReportDetails('');
      return;
    }

    const partnerId = Object.keys(selectedChat.participants || {}).find(id => id !== user?.uid);
    if (!partnerId) return;

    setReporting(true);
    try {
      const partnerName = getPartnerName(selectedChat);
      await userService.reportUser(partnerId, partnerName, reportReason, reportDetails);
      showToast('User reported successfully. Administrators have been notified.', 'success');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit report: ' + errorHelper.getFriendlyMessage(err), 'error');
    } finally {
      setReporting(false);
    }
  };

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    if (isOffline) {
      showToast('Network connection unavailable. Cannot send messages.', 'error');
      return;
    }

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
      const errMsg = err.message || '';
      if (errMsg.includes('blocked by AI') || errMsg.includes('permanently locked')) {
        setErrorBanner('This chat is intended only for item recovery and verification. Unrelated or inappropriate messages are not allowed.');
        showToast('Message blocked by safety moderation rules.', 'error');
      } else {
        setErrorBanner(errorHelper.getFriendlyMessage(err));
        showToast('Failed to send message: ' + errorHelper.getFriendlyMessage(err), 'error');
      }
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

  const visibleChats = chats.filter(chat => {
    const clearedAt = clearedMap[chat.id];
    if (!clearedAt) return true;
    return chat.lastMessageTime > clearedAt;
  });

  const filteredChats = visibleChats.filter(chat => 
    chat.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
    getPartnerName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-container glass fade-in" style={{ height: 'calc(100vh - 100px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      {/* Left Chat List Panel */}
      <div className="chat-list-panel" style={{ width: '340px' }}>
        <div className="chat-list-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Conversations</span>
          {chats.length > 0 && !isSelectingForClear && (
            <button 
              onClick={() => setIsSelectingForClear(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#FEF2F2'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              Clear Chats
            </button>
          )}
        </div>

        {isSelectingForClear && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Select chats to clear ({selectedChatIds.length} selected)
              </span>
              <button 
                onClick={() => {
                  setIsSelectingForClear(false);
                  setSelectedChatIds([]);
                }}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  showConfirm(
                    'Clear All Chats',
                    'Are you sure you want to clear all conversations?',
                    () => {
                      handleClearAllChats();
                      setIsSelectingForClear(false);
                      setSelectedChatIds([]);
                    }
                  );
                }}
                style={{ flex: 1, padding: '6px 12px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', color: '#475569', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear All
              </button>
              <button 
                onClick={() => {
                  if (selectedChatIds.length === 0) {
                    showToast('Please select at least one chat to clear.', 'warning');
                    return;
                  }
                  showConfirm(
                    'Clear Selected Chats',
                    `Are you sure you want to clear the ${selectedChatIds.length} selected conversation(s)?`,
                    () => {
                      handleClearSelectedChats(selectedChatIds);
                      setIsSelectingForClear(false);
                      setSelectedChatIds([]);
                    }
                  );
                }}
                style={{ flex: 1, padding: '6px 12px', background: '#EF4444', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                disabled={selectedChatIds.length === 0}
              >
                Clear Selected
              </button>
            </div>
          </div>
        )}
        
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
              const isChecked = selectedChatIds.includes(chat.id);
              
              return (
                <div
                  key={chat.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginBottom: '4px' }}
                >
                  {isSelectingForClear && (
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedChatIds(selectedChatIds.filter(id => id !== chat.id));
                        } else {
                          setSelectedChatIds([...selectedChatIds, chat.id]);
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#EF4444', marginLeft: '8px', flexShrink: 0 }}
                    />
                  )}
                  <button
                    className={`chat-list-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (isSelectingForClear) {
                        if (isChecked) {
                          setSelectedChatIds(selectedChatIds.filter(id => id !== chat.id));
                        } else {
                          setSelectedChatIds([...selectedChatIds, chat.id]);
                        }
                      } else {
                        setSelectedChat(chat);
                      }
                    }}
                    style={{
                      flexGrow: 1,
                      padding: '12px 16px',
                      borderRadius: '16px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: isActive ? 'rgba(15, 164, 175, 0.08)' : 'transparent',
                      borderLeft: isActive ? '4px solid #0FA4AF' : '4px solid transparent',
                      textAlign: 'left'
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

                    <div className="chat-item-info" style={{ fontFamily: "'Inter', sans-serif", flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="chat-item-name" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '15px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {chat.itemTitle || getPartnerName(chat)}
                          {blockedUids.includes(Object.keys(chat.participants || {}).find(id => id !== user?.uid)) && (
                            <span style={{ fontSize: '11px', color: '#EF4444', marginLeft: '6px', fontWeight: 700 }}>(Blocked)</span>
                          )}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>{displayTime}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#0FA4AF', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Discussing recovery
                      </span>
                      <span className="chat-item-msg" style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 400, display: 'block' }}>
                        {chat.lastMessage || 'Start a conversation...'}
                      </span>
                    </div>
                  </button>
                </div>
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
                  <div className="chat-window-title" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '16px', fontWeight: 600, color: '#111827' }}>{selectedChat.itemTitle || getPartnerName(selectedChat)}</div>
                  <div className="chat-window-subtitle" style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#6B7280', fontWeight: 400 }}>Item: {selectedChat.itemTitle}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* AI MODERATED badge matching message.png */}
                <div 
                  style={{ 
                    border: '1.5px solid rgba(15, 164, 175, 0.4)', 
                    color: '#0FA4AF', 
                    background: 'transparent', 
                    fontWeight: 600, 
                    fontSize: '11px', 
                    borderRadius: '50px', 
                    padding: '4px 12px', 
                    letterSpacing: '0.03em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textTransform: 'uppercase',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  <ShieldCheck size={13} />
                  <span>AI Moderated</span>
                </div>

                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button 
                    onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                    style={{ background: 'none', border: 'none', color: '#003135', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <MoreVertical size={20} />
                  </button>
                  {showOptionsDropdown && (
                    <div 
                      className="glass"
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        right: '0', 
                        background: '#FFFFFF', 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '8px', 
                        padding: '4px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        zIndex: 150,
                        width: '150px',
                        marginTop: '8px'
                      }}
                    >
                      <button 
                        onClick={handleBlockToggle}
                        style={{ 
                          width: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          padding: '8px 12px', 
                          background: 'none', 
                          border: 'none', 
                          color: '#374151', 
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {isPartnerBlocked ? (
                          <>
                            <UserCheck size={14} style={{ color: '#059669' }} /> Unblock User
                          </>
                        ) : (
                          <>
                            <UserX size={14} style={{ color: '#EF4444' }} /> Block User
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => { setShowReportModal(true); setShowOptionsDropdown(false); }}
                        style={{ 
                          width: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          padding: '8px 12px', 
                          background: 'none', 
                          border: 'none', 
                          color: '#EF4444', 
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Flag size={14} /> Report User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorBanner && (
              <div className="chat-warning-banner" style={{ fontFamily: "'Inter', sans-serif" }}>
                <AlertTriangle size={16} />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Blocked User / AI Moderation Warning Banner */}
            {chatMetadata?.isBlockedByAI ? (
              <div 
                className="chat-warning-banner" 
                style={{ 
                  fontFamily: "'Inter', sans-serif", 
                  background: '#FEF2F2', 
                  color: '#EF4444', 
                  borderBottom: '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                  padding: '10px 16px'
                }}
              >
                <AlertTriangle size={16} />
                <span>This chat is permanently locked due to moderation violations.</span>
              </div>
            ) : (isPartnerBlocked || amIBlocked) ? (
              <div 
                className="chat-warning-banner" 
                style={{ 
                  fontFamily: "'Inter', sans-serif", 
                  background: '#FEF2F2', 
                  color: '#EF4444', 
                  borderBottom: '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                  padding: '10px 16px'
                }}
              >
                <ShieldAlert size={16} />
                <span>
                  {isPartnerBlocked 
                    ? 'You have blocked this user. Unblock them from the options menu to send messages.' 
                    : 'This user has blocked you. You cannot reply to this conversation.'
                  }
                </span>
              </div>
            ) : null}

            {/* Message History logs */}
            <div className="chat-messages-log" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Date Separator Capsule matching message.png */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <div 
                  style={{ 
                    background: 'rgba(15, 164, 175, 0.1)', 
                    color: '#024950', 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    padding: '4px 12px', 
                    borderRadius: '50px',
                    letterSpacing: '0.03em',
                    fontFamily: "'Inter', sans-serif"
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
                        borderRadius: '12px',
                        padding: '10px 16px',
                        maxWidth: '65%'
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '14px', fontFamily: "'Inter', sans-serif", fontWeight: 400, lineHeight: 1.4 }}>{msg.text}</p>
                      <span style={{ display: 'block', fontSize: '9px', opacity: 0.8, textAlign: 'right', marginTop: '4px', fontFamily: "'Inter', sans-serif" }}>
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
                  color: '#6B7280',
                  textAlign: 'center',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <Lock size={20} style={{ opacity: 0.6 }} />
                <span style={{ fontSize: '12px', lineHeight: '1.5', maxWidth: '340px', fontWeight: 400 }}>
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
                onClick={() => {
                  if (isOffline) {
                    showToast('Network connection unavailable. Cannot upload attachment.', 'error');
                    return;
                  }
                  showToast('Attachment uploads are a demo action.', 'info');
                }}
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
                  placeholder={chatMetadata?.isBlockedByAI ? "This chat is permanently locked." : (isPartnerBlocked || amIBlocked) ? "Messaging is disabled for blocked users." : "Type a message regarding return arrangements..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending || isPartnerBlocked || amIBlocked || chatMetadata?.isBlockedByAI}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '50px',
                    border: '1px solid #E2E8F0',
                    background: (isPartnerBlocked || amIBlocked || chatMetadata?.isBlockedByAI) ? '#F1F5F9' : '#F8FAFC',
                    padding: '0 18px',
                    fontSize: '0.9rem',
                    color: '#003135',
                    outline: 'none'
                  }}
                  required={!chatMetadata?.isBlockedByAI}
                />
              </div>

              {/* Pill Send Button */}
              <button 
                type="submit" 
                disabled={sending || !inputText.trim() || isPartnerBlocked || amIBlocked || chatMetadata?.isBlockedByAI}
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%', 
                  background: (isPartnerBlocked || amIBlocked || chatMetadata?.isBlockedByAI) ? '#94A3B8' : '#0FA4AF', 
                  border: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: (isPartnerBlocked || amIBlocked || chatMetadata?.isBlockedByAI) ? 'default' : 'pointer',
                  boxShadow: (isPartnerBlocked || amIBlocked || chatMetadata?.isBlockedByAI) ? 'none' : '0 4px 12px rgba(15, 164, 175, 0.2)'
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

      {/* Report User Modal overlay */}
      {showReportModal && (
        <div className="wizard-overlay" style={{ zIndex: 1000 }}>
          <div className="wizard-modal" style={{ maxWidth: '400px', padding: '20px' }}>
            <div className="wizard-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} style={{ color: 'var(--accent-color)' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Report User</h3>
              </div>
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }} 
                onClick={() => setShowReportModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Reason for Report</label>
                <select 
                  className="form-select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                >
                  <option value="Spam">Spam</option>
                  <option value="Harassment">Harassment</option>
                  <option value="Fake Claim">Fake Claim</option>
                  <option value="Suspicious Activity">Suspicious Activity</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Description / Details</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  placeholder="Please provide details about the safety concern..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => setShowReportModal(false)}
                  disabled={reporting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, background: 'var(--accent-color)' }}
                  disabled={reporting}
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
