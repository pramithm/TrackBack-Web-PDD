import React, { useState, useRef } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { aiService } from '../../../Backend/services/aiService';
import { itemService } from '../../../Backend/services/itemService';
import { Upload, X, Loader2, ShieldCheck, AlertCircle, Sparkles, HelpCircle, Check, ArrowRight } from 'lucide-react';
import { errorHelper } from '../services/errorHelper';
import './Wizard.css';

export default function ReportWizard({ onClose }) {
  const user = useAppStore((state) => state.user);
  const isOffline = useAppStore((state) => state.isOffline);
  const showToast = useAppStore((state) => state.showToast);
  
  const [step, setStep] = useState(1);
  const [type, setType] = useState('found'); // 'found' | 'lost'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  
  // Verification questions (Found only)
  const [questions, setQuestions] = useState([
    { q: '', a: '' },
    { q: '', a: '' },
    { q: '', a: '' }
  ]);

  // Status & loading flags
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationResult, setModerationResult] = useState(null); // { verified, reason }
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState('');

  const [fieldErrors, setFieldErrors] = useState({
    image: '',
    title: '',
    description: '',
    location: '',
    phone: '',
    questions: ''
  });

  const fileInputRef = useRef(null);
  const categories = ['Electronics', 'Wallets & Purses', 'Keys', 'Documents', 'Pets', 'Other'];

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
    setModerationResult(null);

    if (isOffline) {
      showToast('Network connection unavailable. Cannot perform AI image verification.', 'error');
      setModerationResult({ verified: false, reason: 'Offline mode.' });
      return;
    }

    setModerationLoading(true);
    try {
      const result = await aiService.moderateImage(file);
      setModerationResult(result);
      if (result.verified) {
        showToast('Image verification passed successfully!', 'success');
      } else {
        setError(`Image verification failed: ${result.reason || 'Rejected.'}`);
        showToast('Selected image failed AI moderation.', 'error');
      }
    } catch (err) {
      console.error('Image moderation error:', err);
      setModerationResult({ verified: false, reason: 'Failed to verify image. Please try again.' });
      setError('Failed to analyze image with AI moderation.');
    } finally {
      setModerationLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setModerationResult(null);
    setError('');
    setQuestions([
      { q: '', a: '' },
      { q: '', a: '' },
      { q: '', a: '' }
    ]);
  };

  const handleNext = () => {
    setFieldErrors({ image: '', title: '', description: '', location: '', phone: '', questions: '' });
    setError('');
    let hasErrors = false;

    if (step === 1) {
      if (type === 'found' && !imageFile) {
        setFieldErrors(prev => ({ ...prev, image: 'Please upload an image of the found item.' }));
        hasErrors = true;
      }
      if (imageFile && moderationLoading) {
        setError('Please wait for image verification to complete.');
        hasErrors = true;
      }
      if (imageFile && moderationResult && !moderationResult.verified) {
        setFieldErrors(prev => ({ ...prev, image: `Image validation failed: ${moderationResult.reason || 'Please upload a clear, safe, and relevant item image.'}` }));
        hasErrors = true;
      }
      if (!hasErrors) setStep(2);
    } else if (step === 2) {
      const errors = {};
      if (!title.trim()) {
        errors.title = 'Item Title is required.';
        hasErrors = true;
      }
      if (!description.trim()) {
        errors.description = 'Description is required.';
        hasErrors = true;
      }
      if (hasErrors) {
        setFieldErrors(prev => ({ ...prev, ...errors }));
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      const errors = {};
      if (!location.trim()) {
        errors.location = 'Location / Address is required.';
        hasErrors = true;
      }
      if (!phone.trim()) {
        errors.phone = 'Contact Mobile Number is required.';
        hasErrors = true;
      } else if (phone.length < 10 || !/^\d+$/.test(phone)) {
        errors.phone = 'Please enter a valid 10-digit mobile number.';
        hasErrors = true;
      }
      if (hasErrors) {
        setFieldErrors(prev => ({ ...prev, ...errors }));
      } else {
        setError('');
        if (type === 'found') {
          setStep(4);
        } else {
          setStep(5); // Skip questions for lost items
        }
      }
    } else if (step === 4) {
      // Validate questions
      const emptyQuestion = questions.some(q => !q.q.trim() || !q.a.trim());
      if (emptyQuestion) {
        setFieldErrors(prev => ({ ...prev, questions: 'Please complete all 3 verification questions and answers.' }));
        hasErrors = true;
      }
      if (!hasErrors) setStep(5);
    }
  };

  const handleBack = () => {
    setFieldErrors({ image: '', title: '', description: '', location: '', phone: '', questions: '' });
    setError('');
    if (step === 5 && type === 'lost') {
      setStep(3);
    } else {
      setStep(step - 1);
    }
  };

  const handlePublish = async () => {
    if (isOffline) {
      showToast('Network connection unavailable. Please check your connection.', 'error');
      return;
    }
    setPublishLoading(true);
    setError('');
    
    try {
      const itemData = {
        title: title.trim(),
        type,
        category,
        description: description.trim(),
        location: location.trim(),
        phoneNumber: phone.trim(),
        userId: user.uid,
        user: user.name,
        image: imageFile, // This will be handled inside itemService.addItem
      };

      if (type === 'found') {
        itemData.verificationQuestions = questions;
        itemData.questions = questions;
      }

      const result = await itemService.addItem(itemData);

      if (result.success) {
        showToast('Your report has been successfully published!', 'success');
        onClose();
      } else {
        setError(errorHelper.getFriendlyMessage(result.error));
      }
    } catch (err) {
      console.error(err);
      setError(errorHelper.getFriendlyMessage(err));
    } finally {
      setPublishLoading(false);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleAutoGenerateQuestions = async () => {
    if (isOffline) {
      showToast('Network connection unavailable. Cannot generate questions.', 'error');
      return;
    }
    if (!imageFile) {
      showToast('Please upload an item image first.', 'warning');
      return;
    }

    setQuestionsLoading(true);
    setError('');
    try {
      const generated = await aiService.generateQuestions(imageFile);
      if (Array.isArray(generated) && generated.length === 3) {
        setQuestions(generated.map(item => ({ q: item.q || '', a: item.a || '' })));
        showToast('Questions generated successfully!', 'success');
      } else {
        throw new Error('Failed to generate 3 valid questions.');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to auto-generate questions: ' + err.message, 'error');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-color)' }}>Step 1: What type of report?</h3>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className="glass-interactive"
          style={{
            flex: 1,
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: type === 'found' ? '2px solid var(--success-color)' : '1px solid var(--card-border)',
            background: type === 'found' ? 'rgba(16, 185, 129, 0.05)' : '#FFFFFF'
          }}
          onClick={() => { setType('found'); handleRemoveImage(); }}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success-color)' }}>I Found an Item</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--light-text)' }}>I want to verify the owner and return it</span>
        </button>

        <button
          className="glass-interactive"
          style={{
            flex: 1,
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: type === 'lost' ? '2px solid var(--accent-color)' : '1px solid var(--card-border)',
            background: type === 'lost' ? 'rgba(150, 71, 52, 0.05)' : '#FFFFFF'
          }}
          onClick={() => { setType('lost'); handleRemoveImage(); }}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-color)' }}>I Lost an Item</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--light-text)' }}>I want to search and matching list</span>
        </button>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-color)' }}>
        Upload Image {type === 'lost' && <span style={{ fontSize: '0.9rem', color: 'var(--light-text)', fontWeight: 400 }}>(Optional)</span>}
      </h3>

      {!imagePreview ? (
        <div className="upload-dropzone" onClick={() => fileInputRef.current.click()}>
          <Upload size={36} style={{ color: 'var(--cyan-accent)' }} />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Click to upload an image</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--light-text)' }}>PNG, JPG or WEBP up to 5MB</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="avatar-file-input"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>
      ) : (
        <div>
          <div className="preview-container">
            <img src={imagePreview} alt="Upload Preview" className="preview-image" />
            <button className="remove-image-btn" onClick={handleRemoveImage}>
              <X size={18} />
            </button>
          </div>

          {moderationLoading && (
            <div className="ai-status-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F1F5F9', border: '1px dashed #94A3B8', borderRadius: '12px', padding: '12px', marginTop: '12px', color: '#475569' }}>
              <Loader2 className="spinner" size={16} style={{ width: 16, height: 16 }} />
              <span>AI verifying image... Please wait.</span>
            </div>
          )}

          {!moderationLoading && moderationResult && (
            <div className={`ai-status-card ${moderationResult.verified ? 'ai-status-success' : 'ai-status-error'}`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '12px',
              padding: '12px',
              marginTop: '12px',
              background: moderationResult.verified ? '#ECFDF5' : '#FEF2F2',
              border: moderationResult.verified ? '1px solid #10B981' : '1px solid #EF4444',
              color: moderationResult.verified ? '#065F46' : '#991B1B'
            }}>
              {moderationResult.verified ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
              <span>{moderationResult.verified ? 'Image verification passed successfully. Please proceed.' : `Verification failed: ${moderationResult.reason}`}</span>
            </div>
          )}
        </div>
      )}
      {fieldErrors.image && <span className="inline-field-error" style={{ textAlign: 'center', marginTop: '12px' }}>{fieldErrors.image}</span>}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Step 2: Tell us about the item</h3>

      <div className="form-group">
        <label className="form-label">Item Title</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Black iPhone 13 Pro Max"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); setFieldErrors(prev => ({ ...prev, title: '' })); }}
          required
        />
        {fieldErrors.title && <span className="inline-field-error">{fieldErrors.title}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-textarea"
          rows="4"
          placeholder="Describe key details. (Keep specifics secret if it is a found item so that the verification questions remain useful!)"
          value={description}
          onChange={(e) => { setDescription(e.target.value); setError(''); setFieldErrors(prev => ({ ...prev, description: '' })); }}
          required
        />
        {fieldErrors.description && <span className="inline-field-error">{fieldErrors.description}</span>}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Step 3: Where and how to reach?</h3>

      <div className="form-group">
        <label className="form-label">Location / Address</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Near CCD Cafe, Terminal 2 Airport"
          value={location}
          onChange={(e) => { setLocation(e.target.value); setError(''); setFieldErrors(prev => ({ ...prev, location: '' })); }}
          required
        />
        <button
          type="button"
          className="btn btn-secondary"
          style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.8rem', marginTop: '0.5rem', borderRadius: '10px' }}
          onClick={() => {
            if (isOffline) {
              showToast('Network connection unavailable. Cannot detect location.', 'error');
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setLocation(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
                setFieldErrors(prev => ({ ...prev, location: '' }));
              },
              (err) => showToast('Could not access current location.', 'warning')
            );
          }}
        >
          Detect My Location
        </button>
        {fieldErrors.location && <span className="inline-field-error">{fieldErrors.location}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Contact Mobile Number</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="form-input" style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', border: '1px solid #E5E7EB', borderRadius: '12px', fontWeight: 'bold' }}>
            +91
          </div>
          <input
            type="tel"
            className="form-input"
            placeholder="00000 00000"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); setFieldErrors(prev => ({ ...prev, phone: '' })); }}
            maxLength={10}
            required
          />
        </div>
        {fieldErrors.phone && <span className="inline-field-error">{fieldErrors.phone}</span>}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary-color)' }}>Step 4: Owner Verification Questions</h3>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          onClick={handleAutoGenerateQuestions}
          disabled={questionsLoading || !imageFile}
        >
          {questionsLoading ? (
            <Loader2 className="spinner" size={14} style={{ width: 14, height: 14 }} />
          ) : (
            <Sparkles size={14} style={{ color: 'var(--cyan-accent)' }} />
          )}
          <span>Auto Generate Questions</span>
        </button>
      </div>
      
      <p style={{ color: 'var(--light-text)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        To prevent fraudulent claims, please manually enter 3 specific verification questions and expected answers that only the true owner would know.
      </p>

      {questions.map((q, idx) => (
        <div key={idx} className="question-item">
          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--cyan-accent)' }}>Question {idx + 1}</span>
          <input
            type="text"
            className="form-input"
            style={{ fontWeight: 500 }}
            placeholder={`Question ${idx + 1}`}
            value={q.q}
            onChange={(e) => { handleQuestionChange(idx, 'q', e.target.value); setFieldErrors(prev => ({ ...prev, questions: '' })); }}
          />
          <input
            type="text"
            className="form-input"
            placeholder={`Expected Answer for Question ${idx + 1}`}
            value={q.a}
            onChange={(e) => { handleQuestionChange(idx, 'a', e.target.value); setFieldErrors(prev => ({ ...prev, questions: '' })); }}
          />
        </div>
      ))}
      {fieldErrors.questions && <span className="inline-field-error" style={{ textAlign: 'center', marginTop: '12px' }}>{fieldErrors.questions}</span>}
    </div>
  );

  const renderStep5 = () => (
    <div style={{ textAlign: 'left' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Step 5: Review & Publish</h3>
      
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #E5E7EB', borderRadius: '14px', background: '#F8FAFC' }}>
        {imagePreview && (
          <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px' }} />
        )}
        
        <div>
          <span className={`item-badge ${type === 'found' ? 'badge-found' : 'badge-lost'}`}>{type}</span>
          <h4 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.5rem 0 0.2rem', color: 'var(--primary-color)' }}>{title}</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--light-text)', fontWeight: 600 }}>Category: {category}</p>
        </div>

        <p style={{ color: 'var(--dark-text)', fontSize: '0.95rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem' }}>
          {description}
        </p>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--light-text)' }}>
          <div><strong>Location:</strong> {location}</div>
          <div><strong>Contact:</strong> +91 {phone}</div>
        </div>

        {type === 'found' && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Verification Questions:</span>
            {questions.map((q, idx) => (
              <div key={idx} style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <strong>Q:</strong> {q.q}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        
        <div className="wizard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--cyan-accent)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Report Lost/Found</h2>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text)' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="wizard-steps-indicator">
          <div className={`step-indicator ${step === 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span>Type</span>
          </div>
          <div className={`step-indicator ${step === 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span>Details</span>
          </div>
          <div className={`step-indicator ${step === 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span>Location</span>
          </div>
          {type === 'found' && (
            <div className={`step-indicator ${step === 4 ? 'active' : ''}`}>
              <span className="step-number">4</span>
              <span>Questions</span>
            </div>
          )}
          <div className={`step-indicator ${step === 5 ? 'active' : ''}`}>
            <span className="step-number">{type === 'found' ? 5 : 4}</span>
            <span>Submit</span>
          </div>
        </div>

        <div className="wizard-body">
          {error && (
            <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && type === 'found' && renderStep4()}
          {step === 5 && renderStep5()}
        </div>

        <div className="wizard-footer">
          {step > 1 ? (
            <button className="btn btn-secondary" style={{ borderRadius: '10px' }} onClick={handleBack} disabled={publishLoading}>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button 
              className="btn btn-primary" 
              style={{ borderRadius: '10px' }}
              onClick={handleNext} 
              disabled={type === 'found' && step === 1 && moderationLoading}
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handlePublish} disabled={publishLoading} style={{ background: 'var(--success-color)', borderRadius: '10px' }}>
              {publishLoading ? (
                <Loader2 className="spinner" size={16} style={{ width: 16, height: 16 }} />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={16} /> Publish Report
                </span>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
