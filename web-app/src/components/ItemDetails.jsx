import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { aiService } from '../services/aiService';
import { requestService } from '../services/requestService';
import { chatService } from '../services/chatService';
import { X, Calendar, MapPin, Phone, User, ShieldCheck, HelpCircle, Loader2, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

export default function ItemDetails({ onClose }) {
  const user = useAppStore((state) => state.user);
  const item = useAppStore((state) => state.selectedItem);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const [claimStatus, setClaimStatus] = useState(null); // null | 'pending' | 'accepted' | 'rejected'
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [answers, setAnswers] = useState(['', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { score, reason }
  const [error, setError] = useState('');

  const isOwner = item?.userId === user?.uid;

  useEffect(() => {
    if (item && !isOwner) {
      checkClaimStatus();
    }
  }, [item]);

  const checkClaimStatus = async () => {
    try {
      const status = await requestService.getClaimStatus(item.id);
      setClaimStatus(status);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    const emptyAnswer = answers.some(ans => !ans.trim());
    if (emptyAnswer) {
      setError('Please answer all verification questions.');
      return;
    }

    setVerifying(true);
    setError('');
    setFeedback(null);

    try {
      // 1. Call Gemini AI to verify ownership answers
      const qaList = item.verificationQuestions;
      const result = await aiService.verifyAnswers(qaList, answers);
      
      setFeedback(result);

      if (result.score >= 70) {
        // 2. Score is high enough, send Claim Request to the database
        setSubmitting(true);
        const claimMessage = qaList.map((q, i) => `Q: ${q.q}\nA: ${answers[i]}`).join('\n\n') + 
          `\n\nAI Verification Score: ${result.score}%\nAI Reasoning: ${result.reason}`;

        const claimResult = await requestService.sendClaimRequest(item, claimMessage);
        
        if (claimResult.success) {
          setClaimStatus('pending');
        } else {
          setError('Failed to send claim request: ' + claimResult.error);
        }
      } else {
        setError('Answer not matched. Please try again or maybe this is not your item.');
      }
    } catch (err) {
      console.error(err);
      setError('Verification failed: ' + err.message);
    } finally {
      setVerifying(false);
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const chatId = await chatService.getOrCreateChat(item.userId, item);
      setActiveTab('chats');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to start chat: ' + err.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (!item) return null;

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal glass" style={{ maxWidth: '600px' }}>
        
        <div className="wizard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--primary-color)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Item Details</h2>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text)' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="wizard-body">
          {!showClaimForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <img 
                src={item.imageUrl || 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=600&auto=format&fit=crop'} 
                alt={item.title} 
                style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }} 
              />
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`item-badge ${item.type === 'found' ? 'badge-found' : 'badge-lost'}`}>
                    {item.type}
                  </span>
                  {item.type === 'found' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', color: 'var(--success-text)', fontWeight: 600 }}>
                      <ShieldCheck size={14} /> AI Verified
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--dark-text)', marginTop: '0.5rem' }}>
                  {item.title}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--light-text)', fontWeight: 600 }}>Category: {item.category}</span>
              </div>

              <div className="glass" style={{ padding: '1rem', background: 'rgba(255,255,255,0.4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                  <MapPin size={16} style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>LOCATION</span>
                    <span style={{ color: 'var(--dark-text)' }}>{item.location}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                  <Calendar size={16} style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>REPORTED ON</span>
                    <span style={{ color: 'var(--dark-text)' }}>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                  <User size={16} style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>REPORTED BY</span>
                    <span style={{ color: 'var(--dark-text)' }}>{isOwner ? 'You' : item.user || 'Anonymous'}</span>
                  </div>
                </div>

                {!isOwner && (claimStatus === 'accepted' || item.type === 'lost') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                    <Phone size={16} style={{ color: 'var(--primary-color)' }} />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>PHONE NUMBER</span>
                      <span style={{ color: 'var(--dark-text)' }}>+91 {item.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--light-text)', display: 'block', marginBottom: '0.25rem' }}>DESCRIPTION</span>
                <p style={{ color: 'var(--dark-text)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  {item.description}
                </p>
              </div>

              {/* Claims button layout */}
              {!isOwner && item.type === 'found' && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.25rem' }}>
                  {claimStatus === null && (
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowClaimForm(true)}>
                      Claim This Item
                    </button>
                  )}
                  {claimStatus === 'pending' && (
                    <div className="ai-status-card ai-status-pending" style={{ justifyContent: 'center', width: '100%' }}>
                      <Loader2 className="spinner" size={16} style={{ width: 16, height: 16 }} />
                      <span>Verification Pending: Finder is reviewing your request.</span>
                    </div>
                  )}
                  {claimStatus === 'accepted' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="ai-status-card ai-status-success" style={{ justifyContent: 'center' }}>
                        <ShieldCheck size={16} />
                        <span>Claim Approved! Contact information unlocked.</span>
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', gap: '0.5rem' }} onClick={handleStartChat}>
                        <MessageSquare size={16} />
                        <span>Start Chat with Finder</span>
                      </button>
                    </div>
                  )}
                  {claimStatus === 'rejected' && (
                    <div className="ai-status-card ai-status-error" style={{ justifyContent: 'center', width: '100%' }}>
                      <AlertCircle size={16} />
                      <span>Claim Rejected. If this is yours, please contact support.</span>
                    </div>
                  )}
                </div>
              )}

              {!isOwner && item.type === 'lost' && (
                <button className="btn btn-primary" style={{ width: '100%', gap: '0.5rem', marginTop: '1rem' }} onClick={handleStartChat}>
                  <MessageSquare size={16} />
                  <span>Contact Owner</span>
                </button>
              )}
            </div>
          ) : (
            /* CLAIM VERIFICATION FORM */
            <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="ai-status-card ai-status-pending">
                <HelpCircle size={16} />
                <span>Verification Check: Please answer the questions precisely. Gemini AI will match details.</span>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {item.verificationQuestions && item.verificationQuestions.map((q, idx) => (
                <div className="form-group" key={idx}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Q{idx + 1}: {q.q}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your answer"
                    value={answers[idx]}
                    onChange={(e) => {
                      const updated = [...answers];
                      updated[idx] = e.target.value;
                      setAnswers(updated);
                      setError('');
                    }}
                    disabled={verifying}
                    required
                  />
                </div>
              ))}

              {feedback && (
                <div className={`ai-status-card ${feedback.score >= 70 ? 'ai-status-success' : 'ai-status-error'}`}>
                  {feedback.score >= 70 ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                  <div>
                    <strong>Match Score: {feedback.score}%</strong>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{feedback.reason}</p>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowClaimForm(false)} disabled={verifying}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={verifying}>
                  {verifying ? (
                    <>
                      <Loader2 className="spinner" size={16} style={{ width: 16, height: 16 }} />
                      <span>{submitting ? 'Submitting Claim...' : 'AI Verifying Answers...'}</span>
                    </>
                  ) : (
                    <span>Submit Claim Answers</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
