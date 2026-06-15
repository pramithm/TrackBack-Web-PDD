import React from 'react';
import { useAppStore } from '../../../Backend/store/useAppStore';
import { auth } from '../../../Backend/config/firebase';
import { signOut } from 'firebase/auth';
import { Search, PlusCircle, Inbox, MessageSquare, User, LogOut, Sparkles } from 'lucide-react';

export default function Sidebar({ onCreateReport }) {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await signOut(auth);
      logout();
    }
  };

  const menuItems = [
    { id: 'feed', name: 'Home Feed', icon: Search },
    { id: 'my-reports', name: 'My Reports', icon: User },
    { id: 'claims', name: 'Claims Center', icon: Inbox },
    { id: 'chats', name: 'Messages', icon: MessageSquare },
  ];

  return (
    <div className="sidebar glass">
      <div className="sidebar-logo">
        <Sparkles size={28} />
        <span>TrackBack</span>
      </div>

      <div className="sidebar-menu">
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
          className="btn btn-primary" 
          style={{ marginTop: '1.5rem', width: '100%', gap: '0.5rem' }}
          onClick={onCreateReport}
        >
          <PlusCircle size={18} />
          <span>Report Item</span>
        </button>
      </div>

      {user && (
        <div className="sidebar-user">
          <img 
            src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`} 
            alt="Profile" 
            className="user-avatar" 
          />
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--light-text)' }}>
              {user.phone}
            </span>
          </div>
          <button 
            onClick={handleLogout} 
            title="Log Out"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
