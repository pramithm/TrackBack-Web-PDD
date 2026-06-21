import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { aiService } from '../../../Backend/services/aiService';
import { requestService } from '../../../Backend/services/requestService';
import { chatService } from '../../../Backend/services/chatService';
import { rtdb } from '../../../Backend/config/firebase';
import { ref, get } from 'firebase/database';
import { X, Calendar, MapPin, Phone, User, ShieldCheck, HelpCircle, Loader2, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { errorHelper } from '../services/errorHelper';

export default function ItemDetails({ onClose }) {
  const user = useAppStore((state) => state.user);
  const item = useAppStore((state) => state.selectedItem);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const isOffline = useAppStore((state) => state.isOffline);
  const showToast = useAppStore((state) => state.showToast);

  const [claimStatus, setClaimStatus] = useState(null); // null | 'pending' | 'accepted' | 'rejected'
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [fieldErrors, setFieldErrors] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { score, reason }
  const [error, setError] = useState('');

  const isOwner = item?.userId === user?.uid;

  // Normalize verification questions from Firebase format (object or array)
  let questions = item?.questions || item?.verificationQuestions;
  if (questions && !Array.isArray(questions) && typeof questions === 'object') {
    questions = Object.keys(questions)
      .sort((a, b) => Number(a) - Number(b))
      .map(key => questions[key]);
  }
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    questions = [{ q: 'What is the brand or description of this item?', a: item?.title || '' }];
  }

  useEffect(() => {
    if (item) {
      setShowClaimForm(false);
      setFeedback(null);
      setError('');
      setVerifying(false);
      setSubmitting(false);
      setAnswers(new Array(questions.length).fill(''));
      setFieldErrors(new Array(questions.length).fill(''));

      if (!isOwner) {
        checkClaimStatus();
      }
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
    setError('');
    setFeedback(null);

    if (isOffline) {
      showToast('Network connection unavailable. Cannot submit claim request.', 'error');
      return;
    }

    const errors = new Array(questions.length).fill('');
    let hasErrors = false;
    answers.forEach((ans, idx) => {
      if (!ans.trim()) {
        errors[idx] = 'This answer is required.';
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setFieldErrors(errors);
      setError('Please answer all verification questions.');
      return;
    }

    setVerifying(true);

    try {
      const matches = questions.every((q, i) => {
        const userAns = (answers[i] || '').trim().toLowerCase();
        const expectedAns = (q.a || '').trim().toLowerCase();
        return userAns === expectedAns;
      });

      if (matches) {
        setFeedback({ score: 100, reason: 'Correctly matched finder\'s expected answers.' });
        setSubmitting(true);

        const claimMessage = questions.map((q, i) => `Q: ${q.q}\nA: ${answers[i]}`).join('\n\n') + 
          `\n\nVerification: Correctly matched finder's expected answers.`;

        const claimResult = await requestService.sendClaimRequest(item, claimMessage);
        
        if (claimResult.success) {
          setClaimStatus('pending');
          setShowClaimForm(false);
          showToast('Claim Request Sent successfully!', 'success');
        } else {
          setError(errorHelper.getFriendlyMessage(claimResult.error));
        }
      } else {
        setFeedback({ score: 0, reason: 'Verification failed. The provided answers do not match the item details.' });
        setError('Verification failed. The provided answers do not match the item details.');
      }
    } catch (err) {
      console.error(err);
      setError(errorHelper.getFriendlyMessage(err));
    } finally {
      setVerifying(false);
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (isOffline) {
      showToast('Network connection unavailable. Cannot start chat.', 'error');
      return;
    }
    try {
      // Check block status
      const blockRef1 = ref(rtdb, `blocks/${user.uid}/${item.userId}`);
      const blockSnap1 = await get(blockRef1);
      const blockRef2 = ref(rtdb, `blocks/${item.userId}/${user.uid}`);
      const blockSnap2 = await get(blockRef2);
      
      if (blockSnap1.exists() && blockSnap1.val() === true) {
        showToast('You have blocked this user. Please unblock them in settings to start a conversation.', 'warning');
        return;
      }
      if (blockSnap2.exists() && blockSnap2.val() === true) {
        showToast('This user has blocked you. Start chat is disabled.', 'error');
        return;
      }

      const chatId = await chatService.getOrCreateChat(item.userId, item);
      setActiveTab('chats');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to start chat: ' + errorHelper.getFriendlyMessage(err), 'error');
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
      <div className="wizard-modal" style={{ maxWidth: '600px' }}>
        
        <div className="wizard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--cyan-accent)' }} />
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
                style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '16px', border: '1px solid var(--card-border)' }} 
              />
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`item-badge ${item.type === 'found' ? 'badge-found' : 'badge-lost'}`}>
                    {item.type}
                  </span>
                  {item.type === 'found' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '12px', color: '#024950', background: 'rgba(15,164,175,0.12)', padding: '0.25rem 0.5rem', borderRadius: '50px', fontWeight: 600 }}>
                      <ShieldCheck size={14} style={{ color: 'var(--cyan-accent)' }} /> AI Verified
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-color)', marginTop: '0.5rem' }}>
                  {item.title}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--light-text)', fontWeight: 600 }}>Category: {item.category}</span>
              </div>

              <div style={{ padding: '1.25rem', background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                  <MapPin size={16} style={{ color: 'var(--cyan-accent)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--muted-text)' }}>LOCATION</span>
                    <span style={{ color: 'var(--dark-text)' }}>{item.location}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                  <Calendar size={16} style={{ color: 'var(--cyan-accent)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--muted-text)' }}>REPORTED ON</span>
                    <span style={{ color: 'var(--dark-text)' }}>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                  <User size={16} style={{ color: 'var(--cyan-accent)' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--muted-text)' }}>REPORTED BY</span>
                    <span style={{ color: 'var(--dark-text)' }}>{isOwner ? 'You' : item.user || 'Anonymous'}</span>
                  </div>
                </div>

                {!isOwner && (claimStatus === 'accepted' || item.type === 'lost') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)' }}>
                    <Phone size={16} style={{ color: 'var(--cyan-accent)' }} />
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--muted-text)' }}>PHONE NUMBER</span>
                      <span style={{ color: 'var(--dark-text)' }}>+91 {item.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-text)', display: 'block', marginBottom: '0.25rem' }}>DESCRIPTION</span>
                <p style={{ color: 'var(--dark-text)', lineHeight: '1.6', fontSize: '14px' }}>
                  {item.description}
                </p>
              </div>

              {/* Claims button layout */}
              {!isOwner && item.type === 'found' && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.25rem' }}>
                  {claimStatus === null && (
                    <button className="btn btn-primary" style={{ width: '100%', borderRadius: '12px', height: '48px' }} onClick={() => setShowClaimForm(true)}>
                      Claim This Item
                    </button>
                  )}
                  {claimStatus === 'pending' && (
                    <div className="ai-status-card ai-status-pending" style={{ justifyContent: 'center', width: '100%', borderRadius: '12px' }}>
                      <Loader2 className="spinner" size={16} style={{ width: 16, height: 16 }} />
                      <span>Verification Pending: Finder is reviewing your request.</span>
                    </div>
                  )}
                  {claimStatus === 'accepted' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="ai-status-card ai-status-success" style={{ justifyContent: 'center', borderRadius: '12px' }}>
                        <ShieldCheck size={16} />
                        <span>Claim Approved! Contact information unlocked.</span>
                      </div>
                      <button className="btn" style={{ width: '100%', gap: '0.5rem', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #024950, #0FA4AF)', color: '#FFFFFF', border: 'none', fontWeight: 600 }} onClick={handleStartChat}>
                        <MessageSquare size={16} />
                        <span>Start Chat with Finder</span>
                      </button>
                    </div>
                  )}
                  {claimStatus === 'rejected' && (
                    <div className="ai-status-card ai-status-error" style={{ justifyContent: 'center', width: '100%', borderRadius: '12px' }}>
                      <AlertCircle size={16} />
                      <span>Claim Rejected. If this is yours, please contact support.</span>
                    </div>
                  )}
                </div>
              )}

              {!isOwner && item.type === 'lost' && (
                <button className="btn" style={{ width: '100%', gap: '0.5rem', marginTop: '1rem', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #024950, #0FA4AF)', color: '#FFFFFF', border: 'none', fontWeight: 600 }} onClick={handleStartChat}>
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
                <span>Verification Check: Please answer the questions precisely to match details.</span>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {questions.map((q, idx) => (
                <div className="form-group" key={idx}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Q{idx + 1}: {q.q}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your answer"
                    value={answers[idx] || ''}
                    onChange={(e) => {
                      const updated = [...answers];
                      updated[idx] = e.target.value;
                      setAnswers(updated);
                      
                      const errs = [...fieldErrors];
                      errs[idx] = '';
                      setFieldErrors(errs);
                      
                      setError('');
                    }}
                    disabled={verifying}
                  />
                  {fieldErrors[idx] && <span className="inline-field-error">{fieldErrors[idx]}</span>}
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
                      <span>{submitting ? 'Submitting Claim...' : 'Verifying Answers...'}</span>
                    </>
                  ) : (
                    <span>Submit Claim Request</span>
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
