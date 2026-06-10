import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { requestService } from '../services/requestService';
import { chatService } from '../services/chatService';
import { Check, X, Loader2, Inbox, ArrowUpRight, ArrowDownLeft, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';

export default function ClaimsCenter() {
  const user = useAppStore((state) => state.user);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  
  const [activeSubTab, setActiveSubTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID of request being accepted/rejected

  useEffect(() => {
    let unsubscribe = () => {};
    
    if (user) {
      setLoading(true);
      unsubscribe = requestService.listenToRequests(activeSubTab, (data) => {
        setRequests(data);
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
      // 1. Accept request
      await requestService.updateRequestStatus(request.id, 'accepted');
      
      // 2. Automatically create a chat room between the finder and claimer
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
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--dark-text)' }}>Claims Center</h1>
        <p style={{ color: 'var(--light-text)' }}>Manage ownership claim requests and verify claimants via AI analysis</p>
      </div>

      {/* Sub tabs selector */}
      <div className="glass" style={{ display: 'flex', padding: '0.4rem', gap: '0.4rem', marginBottom: '2rem', maxWidth: '400px' }}>
        <button
          className={`btn ${activeSubTab === 'incoming' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.6rem 1rem' }}
          onClick={() => setActiveSubTab('incoming')}
        >
          <ArrowDownLeft size={16} />
          <span>Received ({activeSubTab === 'incoming' ? requests.length : '...'})</span>
        </button>
        <button
          className={`btn ${activeSubTab === 'outgoing' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.6rem 1rem' }}
          onClick={() => setActiveSubTab('outgoing')}
        >
          <ArrowUpRight size={16} />
          <span>My Claims ({activeSubTab === 'outgoing' ? requests.length : '...'})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="spinner" size={32} />
        </div>
      ) : requests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {requests.map((req) => (
            <div key={req.id} className="glass" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {req.itemImage && (
                <img 
                  src={req.itemImage} 
                  alt={req.itemTitle} 
                  style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)' }} 
                />
              )}
              
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '250px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{req.itemTitle}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--light-text)' }}>
                      {activeSubTab === 'incoming' ? `Claimant: ${req.claimerName}` : `Finder UID: ${req.finderId}`}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--light-text)', fontWeight: 500 }}>
                    {formatDate(req.createdAt)}
                  </span>
                </div>

                <div 
                  className="glass" 
                  style={{ 
                    padding: '1rem', 
                    background: 'rgba(0,0,0,0.02)', 
                    fontSize: '0.9rem', 
                    whiteSpace: 'pre-line',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                >
                  {req.message}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Status:</span>
                    <span 
                      className="item-badge" 
                      style={{ 
                        background: req.status === 'accepted' ? 'rgba(85, 239, 196, 0.15)' : req.status === 'rejected' ? 'rgba(255, 118, 117, 0.15)' : 'rgba(255, 234, 167, 0.25)',
                        color: req.status === 'accepted' ? 'var(--success-text)' : req.status === 'rejected' ? 'var(--accent-color)' : '#d6a000'
                      }}
                    >
                      {req.status}
                    </span>
                  </div>

                  {activeSubTab === 'incoming' && req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem', background: 'rgba(255,118,117,0.1)', color: 'var(--accent-color)' }}
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === req.id ? <Loader2 className="spinner" size={14} /> : <X size={14} />}
                        <span>Reject</span>
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.5rem 1rem', background: '#00b894' }}
                        onClick={() => handleAccept(req)}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === req.id ? <Loader2 className="spinner" size={14} /> : <Check size={14} />}
                        <span>Approve</span>
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1rem', gap: '0.4rem' }}
                      onClick={() => setActiveTab('chats')}
                    >
                      <MessageSquare size={14} />
                      <span>Open Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--light-text)' }}>
          <Inbox size={48} style={{ color: 'var(--primary-color)', opacity: 0.5, marginBottom: '1rem' }} />
          <h3>No claim requests</h3>
          <p style={{ marginTop: '0.5rem' }}>You don't have any incoming or outgoing claims at this time.</p>
        </div>
      )}
    </div>
  );
}
