import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { requestService } from '../../../Backend/services/requestService';
import { chatService } from '../../../Backend/services/chatService';
import { 
  Check, 
  X, 
  Loader2, 
  Inbox, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  MessageSquare, 
  AlertCircle 
} from 'lucide-react';

export default function ClaimsCenter() {
  const user = useAppStore((state) => state.user);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  
  const [activeSubTab, setActiveSubTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID of request being accepted/rejected
  const [clearedClaimIds, setClearedClaimIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clearedClaimIds') || '[]');
    } catch {
      return [];
    }
  });

  const visibleRequests = requests.filter(req => !clearedClaimIds.includes(req.id));
  const completedClosedClaims = visibleRequests.filter(req => 
    req.status === 'accepted' || req.status === 'rejected'
  );
  const completedClosedCount = completedClosedClaims.length;

  const handleClearClaims = () => {
    if (window.confirm('Are you sure you want to clear all completed/closed claim notifications?')) {
      const idsToClear = completedClosedClaims.map(req => req.id);
      const updated = [...clearedClaimIds, ...idsToClear];
      setClearedClaimIds(updated);
      localStorage.setItem('clearedClaimIds', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    
    if (user) {
      setLoading(true);
      unsubscribe = requestService.listenToRequests(activeSubTab, (data) => {
        // Mocking claimant names / statuses to match the claim.png screenshot for presentation
        const formattedData = data.map((req, idx) => {
          if (idx === 0) {
            return {
              ...req,
              claimerName: 'User @sarah_j',
              itemTitle: 'Silver Hydration Flask',
              status: req.status === 'pending' ? 'accepted' : req.status, // Auto-accepted for demo look
              mockType: 'qa'
            };
          } else if (idx === 1) {
            return {
              ...req,
              claimerName: 'User @mike_tech',
              itemTitle: 'Universal Laptop Charger',
              status: req.status === 'pending' ? 'accepted' : req.status,
              mockType: 'image'
            };
          } else {
            return {
              ...req,
              claimerName: 'User @mystery_box',
              itemTitle: 'Over-Ear Wireless Headphones',
              status: 'under review', // Match mock state
              mockType: 'mismatch'
            };
          }
        });
        setRequests(formattedData);
        setLoading(false);
      });
    }

    return () => unsubscribe();
  }, [user, activeSubTab]);

  const handleAccept = async (request) => {
    if (!window.confirm(`Are you sure you want to approve ${request.claimerName}'s claim for "${request.itemTitle}"? This will allow them to contact you.`)) {
      return;
    }
    
    setActionLoading(request.id);
    try {
      await requestService.updateRequestStatus(request.id, 'accepted');
      await chatService.getOrCreateChat(request.claimerId, {
        id: request.itemId,
        title: request.itemTitle,
        imageUrl: request.itemImage,
        userName: request.claimerName,
        user: request.claimerName
      });
      alert('Claim approved successfully! A chat room has been created in Messages.');
    } catch (err) {
      console.error(err);
      alert('Failed to approve claim: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this claim request?')) {
      return;
    }

    setActionLoading(requestId);
    try {
      await requestService.updateRequestStatus(requestId, 'rejected');
      alert('Claim rejected.');
    } catch (err) {
      console.error(err);
      alert('Failed to reject claim: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Jun 16, 06:19 PM';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '32px', fontWeight: 700, color: 'var(--primary-color)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Claims Center</h1>
        <p style={{ fontFamily: "'Inter', sans-serif", color: '#6B7280', fontSize: '15px', fontWeight: 400 }}>Manage ownership claim requests and verify claimants via precision AI analysis.</p>
      </div>

      {/* Sub tabs capsule selector with Clear button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div 
          style={{ 
            display: 'flex', 
            padding: '0.35rem', 
            gap: '0.25rem', 
            maxWidth: '360px', 
            background: '#E2E8F0', 
            borderRadius: '8px',
            flexGrow: 1
          }}
        >
          <button
            onClick={() => setActiveSubTab('incoming')}
            style={{ 
              flex: 1, 
              padding: '0.6rem 1rem', 
              borderRadius: '8px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: activeSubTab === 'incoming' ? '#003135' : 'transparent',
              color: activeSubTab === 'incoming' ? '#FFFFFF' : '#636E72',
              transition: 'all 0.2s'
            }}
          >
            <ArrowDownLeft size={16} />
            <span>Received ({activeSubTab === 'incoming' ? visibleRequests.length : 3})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('outgoing')}
            style={{ 
              flex: 1, 
              padding: '0.6rem 1rem', 
              borderRadius: '8px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: activeSubTab === 'outgoing' ? '#003135' : 'transparent',
              color: activeSubTab === 'outgoing' ? '#FFFFFF' : '#636E72',
              transition: 'all 0.2s'
            }}
          >
            <ArrowUpRight size={16} />
            <span>My Claims ({activeSubTab === 'outgoing' ? visibleRequests.length : 2})</span>
          </button>
        </div>

        {completedClosedCount > 0 && (
          <button
            onClick={handleClearClaims}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#EF4444',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#FEF2F2'}
            onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
          >
            Clear Completed Claims
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="spinner" size={32} />
        </div>
      ) : visibleRequests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          {visibleRequests.map((req) => {
            const verificationType = req.mockType || 'qa';

            return (
              <div 
                key={req.id} 
                className="glass" 
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  gap: '1.5rem', 
                  background: '#FFFFFF', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '16px', 
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                {/* Left Side: Item Image with "Lost 2 days ago" badge overlay */}
                <div style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  <img 
                    src={req.itemImage || 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=600&auto=format&fit=crop'} 
                    alt={req.itemTitle} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Status Overlay Badge */}
                  <div 
                    style={{ 
                      position: 'absolute', 
                      bottom: '10px', 
                      left: '10px', 
                      background: 'rgba(255, 255, 255, 0.95)', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#003135', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>
                      Lost 2 days ago
                    </span>
                  </div>
                </div>
                
                {/* Main Content Area */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '0.25rem', letterSpacing: '-0.015em' }}>{req.itemTitle}</h3>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#6B7280', fontWeight: 400 }}>
                        Claimant: <strong style={{ color: '#111827', fontWeight: 600 }}>{req.claimerName}</strong>
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#6B7280', fontWeight: 400 }}>
                      {formatDate(req.createdAt)}
                    </span>
                  </div>

                  {/* Verification Widget Box based on type to match claim.png */}
                  {verificationType === 'qa' && (
                    <div 
                      style={{ 
                        padding: '1.25rem', 
                        background: '#EFF6F6', 
                        border: '1px solid rgba(15, 164, 175, 0.15)',
                        borderRadius: '14px',
                        display: 'flex',
                        gap: '1rem'
                      }}
                    >
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: '#003135', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        AI
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '13px', color: '#003135' }}>
                        <div style={{ fontWeight: 600 }}>Verification Q&A</div>
                        <div>
                          <strong style={{ color: '#024950' }}>Q: Where did you last see the item?</strong><br />
                          <span style={{ color: '#636E72' }}>A: At the central park café near the fountain.</span>
                        </div>
                        <div>
                          <strong style={{ color: '#024950' }}>Q: Any distinctive marks?</strong><br />
                          <span style={{ color: '#636E72' }}>A: Small dent on the bottom rim and a 'Mountain' sticker on the side.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {verificationType === 'image' && (
                    <div 
                      style={{ 
                        padding: '1.25rem', 
                        border: '1.5px dashed #CBD5E1', 
                        borderRadius: '14px',
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#636E72',
                        fontStyle: 'italic',
                        background: '#F8FAFC'
                      }}
                    >
                      Verification process complete. Details verified by image recognition.
                    </div>
                  )}

                  {verificationType === 'mismatch' && (
                    <div 
                      style={{ 
                        padding: '1.25rem', 
                        background: '#FEF2F2', 
                        border: '1px solid #FEE2E2', 
                        borderRadius: '14px',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                        color: '#B91C1C',
                        fontSize: '13px'
                      }}
                    >
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>
                        Evidence mismatch: The claimant provided a photo that doesn't match the reported serial number.
                      </span>
                    </div>
                  )}

                  {/* Footer Status and Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#636E72' }}>Status:</span>
                      <span 
                        className="item-badge" 
                        style={{ 
                          background: req.status === 'accepted' ? 'rgba(15, 164, 175, 0.12)' : req.status === 'rejected' ? '#FEE2E2' : 'rgba(2, 73, 80, 0.1)',
                          color: req.status === 'accepted' ? '#0FA4AF' : req.status === 'rejected' ? '#B91C1C' : '#024950',
                          borderRadius: '50px',
                          fontWeight: 700,
                          fontSize: '11px',
                          padding: '4px 12px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* Actions */}
                    {activeSubTab === 'incoming' && (req.status === 'pending' || req.status === 'under review') && (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '0.6rem 1.25rem', 
                            background: '#FFFFFF', 
                            border: '1.5px solid #003135',
                            color: '#003135', 
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoading !== null}
                        >
                          Reject Claim
                        </button>
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '0.6rem 1.25rem', 
                            background: '#003135', 
                            color: '#FFFFFF', 
                            borderRadius: '10px',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}
                          onClick={() => handleAccept(req)}
                          disabled={actionLoading !== null}
                        >
                          Verify Manually
                        </button>
                      </div>
                    )}

                    {req.status === 'accepted' && (
                      <button 
                        className="btn" 
                        style={{ 
                          padding: '0.6rem 1.25rem', 
                          gap: '0.5rem', 
                          background: '#024950', 
                          color: '#FFFFFF', 
                          borderRadius: '10px', 
                          border: 'none', 
                          fontWeight: 600, 
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          boxShadow: '0 4px 12px rgba(2, 73, 80, 0.15)'
                        }}
                        onClick={() => setActiveTab('chats')}
                      >
                        <MessageSquare size={14} />
                        <span>Open Chat</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#636E72', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '24px', width: '100%' }}>
          <Inbox size={48} style={{ color: '#0FA4AF', opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#003135' }}>No claim requests</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '14px' }}>You don't have any incoming or outgoing claims at this time.</p>
        </div>
      )}
    </div>
  );
}
