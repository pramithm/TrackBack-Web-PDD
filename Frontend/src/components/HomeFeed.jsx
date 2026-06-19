import React, { useState } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
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
  Heart, 
  ChevronDown, 
  Plus 
} from 'lucide-react';

export default function HomeFeed() {
  const items = useAppStore((state) => state.items);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'lost' | 'found'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | categories
  const [sortBy, setSortBy] = useState('Most Recent');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [likedItems, setLikedItems] = useState({});

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', width: '100%' }}>
        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', flexGrow: 1, maxWidth: '600px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#94A3B8' }} />
            <input
              type="text"
              className="search-input"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '50px',
                border: '1px solid #E2E8F0',
                background: '#F1F5F9',
                paddingLeft: '3.25rem',
                fontSize: '0.9rem',
                outline: 'none',
                color: 'var(--dark-text)'
              }}
              placeholder="Search for items, locations, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="btn" 
            style={{ 
              height: '48px', 
              borderRadius: '50px', 
              background: '#003135', 
              color: '#FFFFFF', 
              padding: '0 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
            onClick={() => setTypeFilter(prev => prev === 'all' ? 'found' : prev === 'found' ? 'lost' : 'all')}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
          </button>
        </div>

        {/* View Mode & Nav Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ 
                padding: '6px', 
                background: viewMode === 'grid' ? '#FFFFFF' : 'transparent', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                color: viewMode === 'grid' ? '#003135' : '#94A3B8',
                display: 'flex'
              }}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ 
                padding: '6px', 
                background: viewMode === 'list' ? '#FFFFFF' : 'transparent', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                color: viewMode === 'list' ? '#003135' : '#94A3B8',
                display: 'flex'
              }}
            >
              <List size={16} />
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />

          <button style={{ background: 'none', border: 'none', color: '#636E72', position: 'relative', cursor: 'pointer', padding: 0 }}>
            <Bell size={20} />
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', background: '#EF4444', borderRadius: '50%' }} />
          </button>

          <button style={{ background: 'none', border: 'none', color: '#636E72', cursor: 'pointer', padding: 0 }}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Hero Banner matching screen.png */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #003135, #024950)',
          borderRadius: '24px',
          padding: '2.5rem 3rem',
          color: '#FFFFFF',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 15px 30px rgba(0, 49, 53, 0.15)'
        }}
      >
        <div style={{ maxWidth: '60%', zIndex: 2 }}>
          <div 
            style={{ 
              background: '#0FA4AF', 
              color: '#FFFFFF', 
              fontSize: '11px', 
              fontWeight: 700, 
              padding: '4px 10px', 
              borderRadius: '50px', 
              display: 'inline-block',
              marginBottom: '1rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            Latest Update
          </div>
          <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.0, marginBottom: '1rem' }}>R</h2>
          <p style={{ fontSize: '0.95rem', color: '#AFDDE5', lineHeight: 1.5 }}>
            Our community is growing. Use the Discover Board to help others find what they've lost.
          </p>
        </div>

        {/* Visual Mockup on the right */}
        <div 
          style={{
            width: '280px',
            height: '140px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.05)'
          }}
        >
          <div style={{ width: '80%', opacity: 0.25, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '6px', background: '#fff', borderRadius: '3px' }} />
            <div style={{ height: '6px', background: '#fff', borderRadius: '3px', width: '80%' }} />
            <div style={{ height: '6px', background: '#fff', borderRadius: '3px', width: '50%' }} />
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
                  borderRadius: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}
              >
                {/* Image Container with Badges */}
                <div style={{ position: 'relative', width: viewMode === 'list' ? '180px' : '100%', height: viewMode === 'list' ? '120px' : '220px', borderRadius: '16px', overflow: 'hidden' }}>
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
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#003135', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {item.type}
                    </span>
                  </div>

                  {/* Right Heart Button */}
                  <button 
                    onClick={(e) => handleLike(item.id, e)}
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
                      color: isLiked ? '#EF4444' : '#94A3B8'
                    }}
                  >
                    <Heart size={16} fill={isLiked ? '#EF4444' : 'none'} />
                  </button>
                </div>

                {/* Card Content */}
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '4px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#003135', marginBottom: '0.35rem', letterSpacing: '-0.015em' }}>{item.title}</h3>
                  <p style={{ color: '#636E72', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4', marginBottom: '1rem', height: '2.5rem' }}>
                    {item.description}
                  </p>

                  <div style={{ width: '100%', height: '1px', background: '#F1F5F9', marginBottom: '0.75rem' }} />

                  {/* Location & Time Footer */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#636E72', fontSize: '12.5px' }}>
                      <MapPin size={14} style={{ color: '#0FA4AF' }} />
                      <span style={{ fontWeight: 500 }}>{displayLocation}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#636E72', fontSize: '12.5px' }}>
                        <Calendar size={14} style={{ color: '#0FA4AF' }} />
                        <span style={{ fontWeight: 500 }}>{dateString}</span>
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
    </div>
  );
}
