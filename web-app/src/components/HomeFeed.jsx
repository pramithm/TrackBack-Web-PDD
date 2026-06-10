import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Search, MapPin, Calendar, Tag, ShieldCheck, HelpCircle } from 'lucide-react';

export default function HomeFeed() {
  const items = useAppStore((state) => state.items);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'lost' | 'found'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | categories

  const categories = ['Electronics', 'Wallets & Purses', 'Keys', 'Documents', 'Pets', 'Other'];

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--dark-text)' }}>Discover Board</h1>
          <p style={{ color: 'var(--light-text)' }}>Recover lost assets or help return found items back to their owners</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--light-text)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by name, description or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', minWidth: '200px' }}>
            <button
              className={`btn ${typeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', flexGrow: 1 }}
              onClick={() => setTypeFilter('all')}
            >
              All
            </button>
            <button
              className={`btn ${typeFilter === 'lost' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', flexGrow: 1 }}
              onClick={() => setTypeFilter('lost')}
            >
              Lost
            </button>
            <button
              className={`btn ${typeFilter === 'found' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', flexGrow: 1, background: typeFilter === 'found' ? '#00b894' : '', color: typeFilter === 'found' ? '#fff' : '' }}
              onClick={() => setTypeFilter('found')}
            >
              Found
            </button>
          </div>
        </div>

        {/* Category Badges Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCategoryFilter('all')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '50px',
              border: 'none',
              background: categoryFilter === 'all' ? 'var(--primary-color)' : 'rgba(0,0,0,0.05)',
              color: categoryFilter === 'all' ? '#fff' : 'var(--light-text)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '50px',
                border: 'none',
                background: categoryFilter === cat ? 'var(--primary-color)' : 'rgba(0,0,0,0.05)',
                color: categoryFilter === cat ? '#fff' : 'var(--light-text)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="items-grid">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="item-card glass-interactive"
              onClick={() => setSelectedItem(item)}
              style={{ cursor: 'pointer' }}
            >
              <img 
                src={item.imageUrl || 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=600&auto=format&fit=crop'} 
                alt={item.title} 
                className="item-card-image" 
              />
              <div className="item-card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`item-badge ${item.type === 'found' ? 'badge-found' : 'badge-lost'}`}>
                    {item.type}
                  </span>
                  {item.type === 'found' && (
                    <span 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 600 }}
                      title="AI Moderated & Safe Upload"
                    >
                      <ShieldCheck size={14} /> AI Verified
                    </span>
                  )}
                </div>
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--dark-text)', marginTop: '0.25rem' }}>{item.title}</h3>
                
                <p style={{ color: 'var(--light-text)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', height: '2.6rem' }}>
                  {item.description}
                </p>

                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)', fontSize: '0.85rem' }}>
                    <MapPin size={14} style={{ color: 'var(--primary-color)' }} />
                    <span>{item.location || 'Unknown Location'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--light-text)', fontSize: '0.85rem' }}>
                    <Calendar size={14} style={{ color: 'var(--primary-color)' }} />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--light-text)' }}>
          <HelpCircle size={48} style={{ color: 'var(--primary-color)', opacity: 0.5, marginBottom: '1rem' }} />
          <h3>No items found</h3>
          <p style={{ marginTop: '0.5rem' }}>Try modifying your search keywords or active filters.</p>
        </div>
      )}
    </div>
  );
}
