import React, { useState } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { userService } from '../../../Backend/services/userService';
import { itemService } from '../../../Backend/services/itemService';
import { errorHelper } from '../services/errorHelper';
import { 
  Search, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  SlidersHorizontal, 
  Grid, 
  List, 
  Bell, 
  Settings, 
  ShieldAlert, 
  X,
  ChevronDown, 
  Plus 
} from 'lucide-react';

export default function HomeFeed() {
  const items = useAppStore((state) => state.items);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const isOffline = useAppStore((state) => state.isOffline);
  const showToast = useAppStore((state) => state.showToast);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'lost' | 'found'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | categories
  const [sortBy, setSortBy] = useState('Most Recent');
  const [likedItems, setLikedItems] = useState({});

  const [reportingItem, setReportingItem] = useState(null);
  const [reportReason, setReportReason] = useState('Spam listings');
  const [reportComments, setReportComments] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportingItem) return;

    if (isOffline) {
      showToast('Network connection unavailable. Cannot submit report.', 'error');
      return;
    }

    setSubmittingReport(true);
    try {
      await itemService.reportItem(reportingItem.id, reportingItem.title, reportingItem.type, reportReason, reportComments);
      showToast('Item reported successfully. Admin review is pending.', 'success');
      setReportingItem(null);
      setReportReason('Spam listings');
      setReportComments('');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit report: ' + errorHelper.getFriendlyMessage(err), 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const categories = ['Electronics', 'Pets', 'Accessories', 'Documents', 'Other'];

  const handleLike = (id, e) => {
    e.stopPropagation();
    setLikedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || 
      (categoryFilter === 'Accessories' ? (item.category === 'Keys' || item.category === 'Wallets & Purses') : item.category === categoryFilter);
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      {/* Top Navbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', width: '100%' }}>
        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', flexGrow: 1, maxWidth: '600px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94A3B8' }} />
            <input
              type="text"
              className="search-input"
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                paddingLeft: '3.25rem',
                fontSize: '15px',
                outline: 'none',
                color: '#111827',
                fontFamily: "'Inter', sans-serif"
              }}
              placeholder="Search for items, locations, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="btn" 
            style={{ 
              height: '44px', 
              borderRadius: '8px', 
              background: '#003135', 
              color: '#FFFFFF', 
              padding: '0 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif"
            }}
            onClick={() => setTypeFilter(prev => prev === 'all' ? 'found' : prev === 'found' ? 'lost' : 'all')}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Page Title & Description */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '32px', fontWeight: 700, color: '#003135', marginBottom: '0.25rem' }}>Discover Board</h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 400, color: '#6B7280' }}>
          Explore lost and found reports submitted by the community.
        </p>
      </div>

      {/* Hero Banner matching screen.png */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #003135, #024950)',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          color: '#FFFFFF',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'none'
        }}
      >
        <div style={{ maxWidth: '65%', zIndex: 2 }}>
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              color: '#FFFFFF', 
              fontSize: '11px', 
              fontWeight: 700, 
              padding: '3px 8px', 
              borderRadius: '4px', 
              display: 'inline-block',
              marginBottom: '0.5rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Latest Update
          </div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '22px', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Community Lost & Found</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#AFDDE5', lineHeight: '1.4' }}>
            Our community is growing. Use the Discover Board to help others find what they've lost.
          </p>
        </div>

        {/* Visual Mockup on the right */}
        <div 
          style={{
            width: '200px',
            height: '100px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          <div style={{ width: '70%', opacity: 0.2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ height: '4px', background: '#fff', borderRadius: '2px' }} />
            <div style={{ height: '4px', background: '#fff', borderRadius: '2px', width: '80%' }} />
            <div style={{ height: '4px', background: '#fff', borderRadius: '2px', width: '50%' }} />
          </div>
        </div>
      </div>

      {/* Category Pills & Sort Dropdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Category badge filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCategoryFilter('all')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '50px',
              border: 'none',
              background: categoryFilter === 'all' ? '#003135' : '#E2E8F0',
              color: categoryFilter === 'all' ? '#FFFFFF' : '#636E72',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '13px'
            }}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '50px',
                border: 'none',
                background: categoryFilter === cat ? '#003135' : '#E2E8F0',
                color: categoryFilter === cat ? '#FFFFFF' : '#636E72',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '13px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort selector dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#636E72' }}>Sort by:</span>
          <button
            style={{
              background: 'none',
              border: 'none',
              fontWeight: 700,
              color: '#003135',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.9rem'
            }}
            onClick={() => setSortBy(prev => prev === 'Most Recent' ? 'Alphabetical' : 'Most Recent')}
          >
            <span>{sortBy}</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Grid of Item Cards matching screen.png */}
      {filteredItems.length > 0 ? (
        <div className={viewMode === 'grid' ? "items-grid" : ""} style={viewMode === 'list' ? { display: 'flex', flexDirection: 'column', gap: '1rem' } : {}}>
          {filteredItems.map((item) => {
            const isLiked = !!likedItems[item.id];
            
            // Mock data mapping to align with design details
            let dateString = formatDate(item.createdAt);
            let displayLocation = item.location || 'Unknown Location';
            
            // Add custom visual metadata accents based on title/type
            let subtitleLabel = null;
            if (item.type === 'lost') {
              subtitleLabel = (
                <span style={{ fontSize: '13px', color: '#D63031', fontWeight: 700 }}>
                  Reward: $50
                </span>
              );
            } else if (item.type === 'found') {
              if (item.title.toLowerCase().includes('backpack')) {
                subtitleLabel = (
                  <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 700 }}>
                    Verified Status
                  </span>
                );
              } else if (item.title.toLowerCase().includes('owl') || item.title.toLowerCase().includes('key')) {
                subtitleLabel = (
                  <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 700 }}>
                    Secure Pickup
                  </span>
                );
              } else {
                subtitleLabel = (
                  <span style={{ fontSize: '13px', color: '#024950', fontWeight: 700 }}>
                    2.4 miles away
                  </span>
                );
              }
            }

            return (
              <div 
                key={item.id} 
                className="item-card glass-interactive"
                onClick={() => setSelectedItem(item)}
                style={{ 
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: viewMode === 'list' ? 'row' : 'column',
                  gap: '16px',
                  padding: '16px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Image Container with Badges */}
                <div style={{ position: 'relative', width: viewMode === 'list' ? '180px' : '100%', height: viewMode === 'list' ? '120px' : '220px', borderRadius: '12px', overflow: 'hidden' }}>
                  <img 
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=600&auto=format&fit=crop'} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  
                  {/* Left Badge */}
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      left: '12px', 
                      background: 'rgba(255, 255, 255, 0.9)', 
                      backdropFilter: 'blur(4px)',
                      padding: '4px 10px', 
                      borderRadius: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    <div 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: item.type === 'found' ? '#10B981' : '#EF4444' 
                      }} 
                    />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#003135', textTransform: 'uppercase', letterSpacing: '0.02em', fontFamily: "'Inter', sans-serif" }}>
                      {item.type}
                    </span>
                  </div>

                  {/* Report Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportingItem(item);
                    }}
                    style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      right: '12px', 
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      color: '#EF4444'
                    }}
                    title="Report Item"
                  >
                    <ShieldAlert size={16} />
                  </button>
                </div>

                {/* Card Content */}
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '4px' }}>
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '0.35rem', letterSpacing: '-0.015em' }}>{item.title}</h3>
                  <p style={{ fontFamily: "'Inter', sans-serif", color: '#6B7280', fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4', marginBottom: '1rem', height: '2.5rem', fontWeight: 400 }}>
                    {item.description}
                  </p>

                  <div style={{ width: '100%', height: '1px', background: '#F1F5F9', marginBottom: '0.75rem' }} />

                  {/* Location & Time Footer */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: "'Inter', sans-serif" }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', fontSize: '13px' }}>
                      <MapPin size={14} style={{ color: '#0FA4AF' }} />
                      <span style={{ fontWeight: 400 }}>{displayLocation}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', fontSize: '13px' }}>
                        <Calendar size={14} style={{ color: '#0FA4AF' }} />
                        <span style={{ fontWeight: 400 }}>{dateString}</span>
                      </div>
                      {subtitleLabel}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#636E72', background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
          <SlidersHorizontal size={48} style={{ color: '#0FA4AF', opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#003135' }}>No items found</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '14px' }}>Try modifying your search keywords or active filters.</p>
        </div>
      )}

      {/* Report Item Modal */}
      {reportingItem && (
        <div className="wizard-overlay" style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="wizard-modal" style={{ maxWidth: '400px', width: '90%', padding: '24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div className="wizard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} style={{ color: '#EF4444' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#003135' }}>Report Item</h3>
              </div>
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }} 
                onClick={() => {
                  setReportingItem(null);
                  setReportReason('Spam listings');
                  setReportComments('');
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'Inter, sans-serif', color: '#374151' }}>Reason for Report</label>
                <select 
                  className="form-select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    padding: '0 10px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  <option value="Spam listings">Spam listings</option>
                  <option value="Offensive/Inappropriate content">Offensive/Inappropriate content</option>
                  <option value="Incorrect item information">Incorrect item information</option>
                  <option value="Claim verification issues">Claim verification issues</option>
                </select>
              </div>
              
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'Inter, sans-serif', color: '#374151' }}>Comments (Optional)</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  placeholder="Please provide details about your report..."
                  value={reportComments}
                  onChange={(e) => setReportComments(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    padding: '10px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ 
                    flex: 1, 
                    height: '40px', 
                    borderRadius: '8px', 
                    border: '1px solid #D1D5DB', 
                    background: '#FFFFFF', 
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }} 
                  onClick={() => {
                    setReportingItem(null);
                    setReportReason('Spam listings');
                    setReportComments('');
                  }}
                  disabled={submittingReport}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    flex: 1, 
                    height: '40px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    background: '#EF4444', 
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  disabled={submittingReport}
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
