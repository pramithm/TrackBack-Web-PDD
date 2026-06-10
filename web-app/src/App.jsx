import React, { useEffect, useState } from 'react';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAppStore } from './store/useAppStore';
import { userService } from './services/userService';
import { itemService } from './services/itemService';
import AuthModule from './components/AuthModule';
import Sidebar from './components/Sidebar';
import HomeFeed from './components/HomeFeed';
import ReportWizard from './components/ReportWizard';
import ItemDetails from './components/ItemDetails';
import ClaimsCenter from './components/ClaimsCenter';
import ChatHub from './components/ChatHub';
import { ShieldCheck, User, Calendar, MapPin, Trash2, HelpCircle, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isInitializing = useAppStore((state) => state.isInitializing);
  const items = useAppStore((state) => state.items);
  const activeTab = useAppStore((state) => state.activeTab);
  
  const setUser = useAppStore((state) => state.setUser);
  const setInitializing = useAppStore((state) => state.setInitializing);
  const setItems = useAppStore((state) => state.setItems);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  const selectedItem = useAppStore((state) => state.selectedItem);

  const [showWizard, setShowWizard] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // 1. Handle Authentication State changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await userService.getUserProfile(firebaseUser.uid);
          if (profile && profile.isProfileVerified) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...profile });
            setProfileName(profile.name || '');
            setProfilePhone(profile.phone || '');
            setProfilePhoto(profile.photoURL || '');
          } else {
            // Force verify view
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, isProfileVerified: false });
          }
        } catch (err) {
          console.error('Failed to get user profile details:', err);
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, isProfileVerified: false });
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Subscribe to items in Realtime
  useEffect(() => {
    let unsubscribeItems = () => {};
    
    if (isAuthenticated && user?.isProfileVerified) {
      unsubscribeItems = itemService.subscribeToItems((data) => {
        setItems(data);
      });
    }

    return () => unsubscribeItems();
  }, [isAuthenticated, user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || !profilePhone.trim()) {
      alert('Please fill in name and phone number.');
      return;
    }
    setUpdatingProfile(true);
    try {
      await userService.updateUserProfile(user.uid, {
        name: profileName.trim(),
        phone: profilePhone.trim(),
        phoneNumber: profilePhone.trim()
      });
      useAppStore.getState().updateUser({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        phoneNumber: profilePhone.trim()
      });
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const renderMyReports = () => {
    const myItems = items.filter(item => item.userId === user.uid);
    return (
      <div className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>My Reports</h1>
          <p style={{ color: 'var(--light-text)' }}>Track and manage the items you have reported as lost or found</p>
        </div>

        {myItems.length > 0 ? (
          <div className="my-reports-list">
            {myItems.map(item => (
              <div key={item.id} className="glass report-item-row" onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                <img 
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=600&auto=format&fit=crop'} 
                  alt="" 
                  className="report-row-img" 
                />
                
                <div className="report-row-details">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`item-badge ${item.type === 'found' ? 'badge-found' : 'badge-lost'}`}>{item.type}</span>
                    {item.type === 'found' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 600 }}>
                        <ShieldCheck size={12} /> AI Verified
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.2rem' }}>{item.title}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--light-text)', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} /> {item.location}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} /> {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem', color: 'var(--accent-color)', background: 'rgba(255,118,117,0.1)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this report? This cannot be undone.')) {
                        alert('Report deletion is disabled in the web-demo interface.');
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--light-text)' }}>
            <HelpCircle size={48} style={{ color: 'var(--primary-color)', opacity: 0.5, marginBottom: '1rem' }} />
            <h3>No reports submitted</h3>
            <p style={{ marginTop: '0.5rem' }}>Use the "Report Item" button in the sidebar to publish your first post.</p>
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Profile Settings</h1>
        <p style={{ color: 'var(--light-text)' }}>Manage your personal details and account information</p>
      </div>

      <div className="glass profile-card">
        <div className="profile-header">
          <img 
            src={profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name}`} 
            alt="Avatar" 
            className="profile-avatar-large" 
          />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user?.name || 'User'}</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--light-text)' }}>UID: {user?.uid}</span>
        </div>

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="form-input" style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eaeaea', fontWeight: 'bold' }}>
                +91
              </div>
              <input 
                type="tel" 
                className="form-input" 
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registered Email</label>
            <input 
              type="email" 
              className="form-input" 
              value={user?.email || ''}
              disabled
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--light-text)' }}>Account email address cannot be changed</span>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={updatingProfile}>
            {updatingProfile ? <Loader2 className="spinner" size={16} style={{ width: 16, height: 16 }} /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );

  if (isInitializing) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p style={{ marginTop: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>Loading TrackBack...</p>
      </div>
    );
  }

  // Renders Authentication pages if user is not authenticated or profile setup is incomplete
  if (!isAuthenticated || !user?.isProfileVerified) {
    return <AuthModule />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <Sidebar onCreateReport={() => setShowWizard(true)} />

      {/* Main content pane */}
      <main className="main-content">
        {activeTab === 'feed' && <HomeFeed />}
        {activeTab === 'my-reports' && renderMyReports()}
        {activeTab === 'claims' && <ClaimsCenter />}
        {activeTab === 'chats' && <ChatHub />}
        {activeTab === 'profile' && renderProfile()}
      </main>

      {/* Modals & Wizards */}
      {showWizard && <ReportWizard onClose={() => setShowWizard(false)} />}
      {selectedItem && <ItemDetails onClose={() => setSelectedItem(null)} />}
    </div>
  );
}

export default App;
