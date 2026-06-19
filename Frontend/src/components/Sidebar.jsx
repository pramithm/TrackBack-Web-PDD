import React, { useState } from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { auth } from '../../../Backend/config/firebase';
import { signOut } from 'firebase/auth';
import { 
  Home, 
  AlertCircle, 
  CheckSquare, 
  Mail, 
  PlusCircle, 
  MoreVertical, 
  LogOut, 
  ShieldCheck 
} from 'lucide-react';

export default function Sidebar({ onCreateReport }) {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await signOut(auth);
      logout();
    }
  };

  const menuItems = [
    { id: 'feed', name: 'Home Feed', icon: Home },
    { id: 'my-reports', name: 'My Reports', icon: AlertCircle },
    { id: 'claims', name: 'Claims Center', icon: CheckSquare },
    { id: 'chats', name: 'Messages', icon: Mail },
  ];

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between' }}>
      <div>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#003135', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
            <ShieldCheck size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#003135', letterSpacing: '-0.02em', lineHeight: 1.1 }}>TrackBack</span>
            <span style={{ fontSize: '0.7rem', color: '#636E72', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lost & Found</span>
          </div>
        </div>

        <div className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
          
          <button 
            className="btn-sidebar-report" 
            style={{ marginTop: '1.5rem', width: '100%', gap: '0.5rem' }}
            onClick={onCreateReport}
          >
            <PlusCircle size={18} />
            <span>Report Found Item</span>
          </button>
        </div>
      </div>

      {user && (
        <div style={{ position: 'relative', width: '100%' }}>
          <div 
            className="sidebar-user" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem 1rem', 
              background: 'rgba(15, 164, 175, 0.08)', 
              borderRadius: '16px',
              border: '1px solid rgba(15, 164, 175, 0.15)',
              margin: 'auto 0 0 0'
            }}
          >
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`} 
              alt="Profile" 
              className="user-avatar" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #FFFFFF' }}
            />
            <div className="user-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#003135', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#024950', fontWeight: 600 }}>
                Verified User
              </span>
            </div>
            <button 
              onClick={() => setShowLogoutConfirm(!showLogoutConfirm)} 
              style={{ background: 'none', border: 'none', color: '#003135', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
            >
              <MoreVertical size={18} />
            </button>
          </div>

          {showLogoutConfirm && (
            <div 
              className="glass"
              style={{ 
                position: 'absolute', 
                bottom: '105%', 
                right: '0', 
                background: '#FFFFFF', 
                border: '1px solid #E2E8F0', 
                borderRadius: '10px', 
                padding: '0.5rem', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                zIndex: 50,
                width: '120px'
              }}
            >
              <button 
                onClick={handleLogout}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.5rem', 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-color)', 
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer' 
                }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
