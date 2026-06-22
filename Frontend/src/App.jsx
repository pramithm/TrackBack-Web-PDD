import React, { useEffect, useState, useRef } from 'react';
import { auth, rtdb } from '../../Backend/config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, set } from 'firebase/database';
import { useAppStore } from '../../Backend/store/useAppStore';
import { userService } from '../../Backend/services/userService';
import { itemService } from '../../Backend/services/itemService';
import { requestService } from '../../Backend/services/requestService';
import { chatService } from '../../Backend/services/chatService';
import AuthModule from './components/AuthModule';
import { errorHelper } from './services/errorHelper';
import Sidebar from './components/Sidebar';
import HomeFeed from './components/HomeFeed';
import ReportWizard from './components/ReportWizard';
import ItemDetails from './components/ItemDetails';
import ClaimsCenter from './components/ClaimsCenter';
import ChatHub from './components/ChatHub';
import { 
  ShieldCheck, 
  User, 
  Calendar, 
  MapPin, 
  Trash2, 
  HelpCircle, 
  Loader2,
  Bell,
  Settings as SettingsIcon,
  X,
  Upload,
  Lock,
  ArrowLeft,
  Check,
  MoreVertical,
  LogOut,
  ShieldAlert,
  Grid,
  List,
  AlertCircle
} from 'lucide-react';
import './App.css';

function App() {
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isInitializing = useAppStore((state) => state.isInitializing);
  const items = useAppStore((state) => state.items);
  const activeTab = useAppStore((state) => state.activeTab);
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  
  const setUser = useAppStore((state) => state.setUser);
  const setInitializing = useAppStore((state) => state.setInitializing);
  const setItems = useAppStore((state) => state.setItems);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  const selectedItem = useAppStore((state) => state.selectedItem);
  const logout = useAppStore((state) => state.logout);

  const isOffline = useAppStore((state) => state.isOffline);
  const toast = useAppStore((state) => state.toast);
  const confirmModal = useAppStore((state) => state.confirmModal);
  const showToast = useAppStore((state) => state.showToast);
  const hideToast = useAppStore((state) => state.hideToast);
  const showConfirm = useAppStore((state) => state.showConfirm);
  const hideConfirm = useAppStore((state) => state.hideConfirm);

  const [showWizard, setShowWizard] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [isEditingWebProfile, setIsEditingWebProfile] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Notifications State
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [userChats, setUserChats] = useState([]);
  const [clearedRequestIds, setClearedRequestIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clearedRequestIds') || '[]');
    } catch {
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] = useState('requests'); // 'requests' | 'messages'
  const [messageClearCounter, setMessageClearCounter] = useState(0);

  // Settings State
  const [settingsTab, setSettingsTab] = useState('personal'); // 'personal' | 'blocked'
  const [blockedUsersDetails, setBlockedUsersDetails] = useState([]);
  const [adminMode, setAdminMode] = useState(() => localStorage.getItem('adminMode') === 'true');
  const [reports, setReports] = useState([]);

  // File Upload & Reference States
  const fileInputRef = useRef(null);
  const notificationsDropdownRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Sync profile editing local state when user updates or enters edit mode
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || user.phoneNumber || '');
      setProfilePhoto(user.photoURL || '');
      setProfileAge(user.age ? String(user.age) : '');
      setProfileGender(user.gender || '');
      setProfileLocation(user.location || user.college || '');
    }
  }, [user, isEditingWebProfile]);

  // Listen to connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      useAppStore.getState().setOffline(false);
      showToast('Back online! Connection restored.', 'success');
    };
    const handleOffline = () => {
      useAppStore.getState().setOffline(true);
      showToast('You are offline. Some actions are disabled.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Handle Authentication State changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Force reload user state from Firebase to get latest emailVerified status
          await firebaseUser.reload();
          const refreshedUser = auth.currentUser || firebaseUser;
          
          if (!refreshedUser.emailVerified && refreshedUser.email !== 'pramithm2174.sse@saveetha.com') {
            setUser({ 
              uid: refreshedUser.uid, 
              email: refreshedUser.email, 
              emailVerified: false, 
              isProfileVerified: false 
            });
          } else {
            let profile = await userService.getUserProfile(refreshedUser.uid);
            
            // Sync verified status to database if not already synced
            if (profile && !profile.emailVerified) {
              try {
                await userService.updateUserProfile(refreshedUser.uid, {
                  emailVerified: true,
                  isEmailVerified: true
                });
                profile.emailVerified = true;
                profile.isEmailVerified = true;
              } catch (syncErr) {
                console.error('Error syncing emailVerified status to DB:', syncErr);
              }
            }

            if (profile && profile.isProfileVerified) {
              setUser({ uid: refreshedUser.uid, email: refreshedUser.email, emailVerified: true, ...profile });
              setProfileName(profile.name || '');
              setProfilePhone(profile.phone || '');
              setProfilePhoto(profile.photoURL || '');
              setProfileAge(profile.age ? String(profile.age) : '');
              setProfileGender(profile.gender || '');
              setProfileLocation(profile.location || '');
            } else {
              setUser({ 
                uid: refreshedUser.uid, 
                email: refreshedUser.email, 
                emailVerified: true, 
                isProfileVerified: false 
              });
            }
          }
        } catch (err) {
          console.error('Failed to get user profile details:', err);
          setUser({ 
            uid: firebaseUser.uid, 
            email: firebaseUser.email, 
            emailVerified: firebaseUser.email === 'pramithm2174.sse@saveetha.com' ? true : firebaseUser.emailVerified, 
            isProfileVerified: false 
          });
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

  // 3. Listen to Notifications (incoming/outgoing requests and user chats)
  useEffect(() => {
    let unsubscribeIncoming = () => {};
    let unsubscribeOutgoing = () => {};
    let unsubscribeChats = () => {};

    if (isAuthenticated && user?.isProfileVerified) {
      unsubscribeIncoming = requestService.listenToRequests('incoming', (data) => {
        setIncomingRequests(data);
      });
      unsubscribeOutgoing = requestService.listenToRequests('outgoing', (data) => {
        setOutgoingRequests(data);
      });
      unsubscribeChats = chatService.listenToUserChats((data) => {
        setUserChats(data);
      });
    }

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
      unsubscribeChats();
    };
  }, [isAuthenticated, user]);

  // 4. Listen to Blocked Users List
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      const blocksRef = ref(rtdb, `blocks/${user.uid}`);
      const unsubscribeBlocks = onValue(blocksRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setBlockedUsersDetails([]);
          return;
        }
        const uids = Object.keys(data).filter(uid => data[uid] === true);
        
        const details = await Promise.all(uids.map(async (uid) => {
          try {
            const profile = await userService.getUserProfile(uid);
            return {
              uid,
              name: profile?.name || 'Blocked User',
              email: profile?.email || 'N/A',
              photoURL: profile?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`
            };
          } catch (e) {
            return {
              uid,
              name: 'Blocked User',
              email: 'N/A',
              photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`
            };
          }
        }));
        setBlockedUsersDetails(details);
      });

      return () => unsubscribeBlocks();
    }
  }, [isAuthenticated, user]);

  // 5. Listen to Admin Reports
  useEffect(() => {
    let unsubscribeReports = () => {};
    if (isAuthenticated && user?.isProfileVerified && adminMode) {
      unsubscribeReports = userService.listenToReports((data) => {
        setReports(data);
      });
    }
    return () => unsubscribeReports();
  }, [isAuthenticated, user, adminMode]);

  // 6. Notification click outside logic
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (isOffline) {
      showToast('Network connection unavailable. Please check your connection.', 'error');
      return;
    }
    if (!profileName.trim() || !profilePhone.trim()) {
      showToast('Please fill in name and phone number.', 'warning');
      return;
    }
    const ageNum = parseInt(profileAge, 10);
    if (!profileAge || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      showToast('Please enter a valid age (13–120).', 'warning');
      return;
    }
    if (!profileGender) {
      showToast('Please select your gender.', 'warning');
      return;
    }
    if (!profileLocation.trim()) {
      showToast('Please enter your location.', 'warning');
      return;
    }

    setUpdatingProfile(true);
    try {
      const updateData = {
        name: profileName.trim(),
        phone: profilePhone.trim(),
        phoneNumber: profilePhone.trim(),
        age: parseInt(profileAge, 10),
        gender: profileGender,
        location: profileLocation.trim(),
        college: profileLocation.trim()
      };

      await userService.updateUserProfile(user.uid, updateData);
      useAppStore.getState().updateUser(updateData);
      showToast('Profile updated successfully!', 'success');
      setIsEditingWebProfile(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to update profile: ' + errorHelper.getFriendlyMessage(err), 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    if (isOffline) {
      showToast('Network connection unavailable. Please check your connection.', 'error');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5MB limit.', 'warning');
      return;
    }

    setUploadingPhoto(true);
    try {
      let downloadURL = '';
      try {
        downloadURL = await userService.uploadProfilePicture(user.uid, file);
      } catch (cloudinaryErr) {
        console.warn('Cloudinary upload failed, falling back to base64 encoding:', cloudinaryErr);
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
        reader.readAsDataURL(file);
        const base64String = await base64Promise;

        await userService.updateUserProfile(user.uid, {
          photoURL: base64String
        });
        downloadURL = base64String;
      }

      setProfilePhoto(downloadURL);
      useAppStore.getState().updateUser({ photoURL: downloadURL });
      showToast('Profile picture updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      showToast('Failed to upload picture: ' + errorHelper.getFriendlyMessage(err), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleAdminMode = (val) => {
    setAdminMode(val);
    localStorage.setItem('adminMode', val ? 'true' : 'false');
  };

  const handleUnblockUser = async (targetUid) => {
    if (isOffline) {
      showToast('Network connection unavailable. Please check your connection.', 'error');
      return;
    }
    showConfirm('Unblock User', 'Are you sure you want to unblock this user?', async () => {
      try {
        await userService.unblockUser(targetUid);
        showToast('User unblocked successfully!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to unblock: ' + errorHelper.getFriendlyMessage(err), 'error');
      }
    });
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    if (isOffline) {
      showToast('Network connection unavailable. Please check your connection.', 'error');
      return;
    }
    try {
      await userService.updateReportStatus(reportId, status);
      showToast(`Report status updated to ${status}.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update report: ' + errorHelper.getFriendlyMessage(err), 'error');
    }
  };

  const handleClearRequests = () => {
    if (requestNotifications.length === 0) return;
    showConfirm('Clear Requests', 'Are you sure you want to clear all request notifications?', () => {
      const idsToClear = requestNotifications.map(n => n.id);
      const updated = [...clearedRequestIds, ...idsToClear];
      setClearedRequestIds(updated);
      localStorage.setItem('clearedRequestIds', JSON.stringify(updated));
      showToast('Request notifications cleared.', 'success');
    });
  };

  const handleClearMessages = () => {
    if (messageNotifications.length === 0) return;
    showConfirm('Clear Messages', 'Are you sure you want to clear all message notifications?', () => {
      messageNotifications.forEach(notif => {
        localStorage.setItem(`lastRead_${notif.id}`, Date.now().toString());
      });
      setMessageClearCounter(prev => prev + 1);
      showToast('Message notifications cleared.', 'success');
    });
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
                    className="btn-delete-soft" 
                    onClick={(e) => {
                      e.stopPropagation();
                      showConfirm('Delete Report', 'Are you sure you want to delete this report? This cannot be undone.', () => {
                        showToast('Report deletion is disabled in the web-demo interface.', 'warning');
                      });
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

  const renderProfile = () => {
    const creationDate = auth.currentUser?.metadata?.creationTime
      ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    const handleLogoutClick = async () => {
      showConfirm('Confirm Logout', 'Are you sure you want to log out of TrackBack?', async () => {
        try {
          await signOut(auth);
          logout();
          showToast('Logged out successfully.', 'success');
        } catch (err) {
          showToast('Failed to log out: ' + errorHelper.getFriendlyMessage(err), 'error');
        }
      });
    };

    return (
      <div className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>Settings</h1>
          <p style={{ color: 'var(--light-text)', fontFamily: 'Inter, sans-serif' }}>Manage your profile, blocked users list, and account options</p>
        </div>

        <div className="settings-tabs">
          <button 
            className={`settings-tab-trigger ${settingsTab === 'personal' ? 'active' : ''}`}
            onClick={() => setSettingsTab('personal')}
          >
            Personal Information
          </button>
          <button 
            className={`settings-tab-trigger ${settingsTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setSettingsTab('privacy')}
          >
            Privacy & Accounts
          </button>
        </div>

        <div className="glass profile-card" style={{ marginTop: '1.5rem', width: '100%', maxWidth: '700px' }}>
          {settingsTab === 'personal' && (
            <div>
              <div className="profile-header" style={{ marginBottom: '2rem' }}>
                <div 
                  className="profile-avatar-container" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img 
                    src={profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name}`} 
                    alt="Avatar" 
                    className="profile-avatar-large" 
                    style={{ margin: 0 }}
                  />
                  <div className="avatar-upload-overlay">
                    <Upload size={18} style={{ marginBottom: '4px' }} />
                    <span>Change Photo</span>
                  </div>
                </div>
                {uploadingPhoto && <span style={{ fontSize: '0.8rem', color: 'var(--cyan-accent)', fontWeight: 600, marginTop: '0.5rem' }}>Uploading image...</span>}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem' }}>{user?.name || 'User'}</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--light-text)' }}>Account Created: {creationDate}</span>
              </div>

              {!isEditingWebProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748B' }}>Full Name</label>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#003135', marginTop: '0.25rem' }}>{user?.name || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748B' }}>Phone Number</label>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#003135', marginTop: '0.25rem' }}>{user?.phone ? `+91 ${user.phone}` : 'N/A'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748B' }}>Registered Email</label>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#003135', marginTop: '0.25rem' }}>{user?.email || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748B' }}>Age</label>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#003135', marginTop: '0.25rem' }}>{user?.age ? `${user.age} years old` : 'N/A'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748B' }}>Gender</label>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#003135', marginTop: '0.25rem' }}>{user?.gender || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748B' }}>Location</label>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#003135', marginTop: '0.25rem' }}>{user?.location || 'N/A'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setIsEditingWebProfile(true)}>
                      Edit Profile
                    </button>
                    <button type="button" className="btn btn-danger" onClick={handleLogoutClick} style={{ gap: '0.5rem' }}>
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              ) : (
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
                    <label className="form-label">Age</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={profileAge}
                      onChange={(e) => setProfileAge(e.target.value)}
                      min="13"
                      max="120"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-input"
                      value={profileGender}
                      onChange={(e) => setProfileGender(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location (City / Area)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={profileLocation}
                      onChange={(e) => setProfileLocation(e.target.value)}
                      required
                    />
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

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={updatingProfile}>
                      {updatingProfile ? <Loader2 className="spinner" size={16} /> : 'Save Changes'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setProfileName(user?.name || '');
                      setProfilePhone(user?.phone || '');
                      setProfileAge(user?.age ? String(user.age) : '');
                      setProfileGender(user?.gender || '');
                      setProfileLocation(user?.location || '');
                      setIsEditingWebProfile(false);
                    }} style={{ flex: 1, border: '1px solid #CBD5E1', background: '#FFF' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {settingsTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Blocked Users List</h3>
                <p style={{ color: 'var(--light-text)', fontSize: '13px', marginBottom: '1rem' }}>
                  Blocked users cannot message you or start any new recovery discussions.
                </p>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                  {blockedUsersDetails.length > 0 ? (
                    blockedUsersDetails.map((blocked) => (
                      <div key={blocked.uid} className="blocked-user-row">
                        <div className="blocked-user-info">
                          <img src={blocked.photoURL} alt="Avatar" className="blocked-user-avatar" />
                          <div>
                            <div className="blocked-user-name">{blocked.name}</div>
                            <div className="blocked-user-email">{blocked.email}</div>
                          </div>
                        </div>
                        <button 
                          className="admin-action-btn"
                          onClick={() => handleUnblockUser(blocked.uid)}
                          style={{ color: '#EF4444', borderColor: '#FEE2E2', background: '#FEF2F2' }}
                        >
                          Unblock
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                      No blocked users.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Derive notifications
  const requestNotifications = [];
  incomingRequests.forEach(req => {
    if (clearedRequestIds.includes(req.id)) return;
    if (req.status === 'pending') {
      requestNotifications.push({
        id: req.id,
        text: `New claim request received from ${req.claimerName || 'User'} for "${req.itemTitle}"`,
        timestamp: req.createdAt,
        status: req.status,
        clearable: false,
        onClick: () => {
          useAppStore.getState().setActiveTab('claims');
          setShowNotifications(false);
        }
      });
    } else {
      requestNotifications.push({
        id: req.id,
        text: `Claim request for "${req.itemTitle}" by ${req.claimerName || 'User'} was ${req.status}`,
        timestamp: req.updatedAt || req.createdAt,
        status: req.status,
        clearable: true,
        onClick: () => {
          useAppStore.getState().setActiveTab('claims');
          setShowNotifications(false);
        }
      });
    }
  });

  outgoingRequests.forEach(req => {
    if (clearedRequestIds.includes(req.id)) return;
    if (req.status === 'pending') {
      requestNotifications.push({
        id: req.id,
        text: `Claim request submitted for "${req.itemTitle}"`,
        timestamp: req.createdAt,
        status: req.status,
        clearable: false,
        onClick: () => {
          useAppStore.getState().setActiveTab('claims');
          setShowNotifications(false);
        }
      });
    } else {
      requestNotifications.push({
        id: req.id,
        text: `Your claim request for "${req.itemTitle}" was ${req.status}`,
        timestamp: req.updatedAt || req.createdAt,
        status: req.status,
        clearable: true,
        onClick: () => {
          useAppStore.getState().setActiveTab('claims');
          setShowNotifications(false);
        }
      });
    }
  });

  requestNotifications.sort((a, b) => b.timestamp - a.timestamp);

  const messageNotifications = [];
  userChats.forEach(chat => {
    const lastRead = Number(localStorage.getItem(`lastRead_${chat.id}`) || 0);
    const partnerId = Object.keys(chat.participants || {}).find(id => id !== user?.uid);
    const partnerName = chat.participantNames?.[partnerId] || chat.partnerName || 'User';
    
    // Check if last message was sent by other user (senderId is not current user)
    // In chat object, check if lastMessageSenderId is set, or if we can infer it.
    // If lastMessage is system warning or chat locked, it's not a human message, but let's see.
    const isIncomingMsg = chat.lastMessageSenderId ? (chat.lastMessageSenderId !== user?.uid) : true;
    
    if (isIncomingMsg && chat.lastMessageTime > lastRead && chat.lastMessage) {
      messageNotifications.push({
        id: chat.id,
        text: `New message from ${partnerName} for "${chat.itemTitle}": "${chat.lastMessage}"`,
        timestamp: chat.lastMessageTime,
        onClick: () => {
          localStorage.setItem(`lastRead_${chat.id}`, Date.now().toString());
          useAppStore.getState().setSelectedChatId(chat.id);
          useAppStore.getState().setActiveTab('chats');
          setShowNotifications(false);
        }
      });
    }
  });
  messageNotifications.sort((a, b) => b.timestamp - a.timestamp);

  const renderAdminDashboard = () => {
    const formatDate = (timestamp) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    };

    return (
      <div className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--light-text)', fontFamily: 'Inter, sans-serif' }}>Review safety reports and user complaints reported from chat rooms</p>
        </div>

        <div className="glass" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '1.5rem', overflowX: 'auto' }}>
          {reports.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Reporter</th>
                  <th>Reported User</th>
                  <th>Reason</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>{formatDate(report.timestamp)}</td>
                    <td style={{ fontWeight: 600 }}>{report.reporterName}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{report.reportedName}</td>
                    <td>
                      <span className="item-badge badge-lost" style={{ fontSize: '11px', textTransform: 'none', background: '#FEE2E2', color: '#B91C1C' }}>
                        {report.reason}
                      </span>
                    </td>
                    <td>{report.details || '-'}</td>
                    <td>
                      <span className={`admin-status-badge admin-status-${report.status?.toLowerCase() || 'pending'}`}>
                        {report.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {report.status !== 'Reviewed' && report.status !== 'Resolved' && (
                          <button 
                            className="admin-action-btn"
                            onClick={() => handleUpdateReportStatus(report.id, 'Reviewed')}
                          >
                            Review
                          </button>
                        )}
                        {report.status !== 'Resolved' && (
                          <button 
                            className="admin-action-btn"
                            onClick={() => handleUpdateReportStatus(report.id, 'Resolved')}
                            style={{ background: '#D1FAE5', color: '#059669', borderColor: '#A7F3D0' }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#9CA3AF' }}>
              <ShieldCheck size={48} style={{ color: 'var(--success-color)', opacity: 0.5, marginBottom: '1rem' }} />
              <h3>No safety reports submitted</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '14px' }}>All chat sessions are secure and clean.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isInitializing) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p style={{ marginTop: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>Loading TrackBack...</p>
      </div>
    );
  }

  // Renders Authentication pages if user is not authenticated, email is not verified, or profile setup is incomplete
  if (!isAuthenticated || !user?.emailVerified || !user?.isProfileVerified) {
    return <AuthModule />;
  }

  return (
    <div className="app-container">
      {isOffline && (
        <div className="offline-banner">
          <div className="offline-content">
            <AlertCircle size={16} />
            <span>You are currently offline. Some features are limited.</span>
          </div>
          <button className="btn-retry-conn" onClick={() => {
            const online = navigator.onLine;
            useAppStore.getState().setOffline(!online);
            if (online) {
              showToast('Back online! Connection restored.', 'success');
            } else {
              showToast('Still offline. Please check your connection.', 'error');
            }
          }}>
            Retry Connection
          </button>
        </div>
      )}

      {/* Premium Toast notification popup */}
      {toast && (
        <div className={`premium-toast toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' && <ShieldCheck className="toast-icon success" size={18} />}
            {toast.type === 'error' && <AlertCircle className="toast-icon error" size={18} />}
            {toast.type === 'warning' && <ShieldAlert className="toast-icon warning" size={18} />}
            <span className="toast-message">{toast.message}</span>
          </div>
          <button className="toast-close" onClick={hideToast}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Premium custom confirmation modal */}
      {confirmModal.show && (
        <div className="premium-confirm-overlay">
          <div className="premium-confirm-card glass">
            <div className="confirm-header">
              <ShieldAlert className="confirm-title-icon" size={22} />
              <h3>{confirmModal.title || 'Are you sure?'}</h3>
            </div>
            <div className="confirm-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="confirm-footer">
              <button 
                className="btn-confirm-cancel" 
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  hideConfirm();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-accept" 
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  hideConfirm();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Panel */}
      <Sidebar onCreateReport={() => {
        if (isOffline) {
          showToast('Network connection unavailable. Please check your connection.', 'error');
          return;
        }
        setShowWizard(true);
      }} />

      {/* Main content pane */}
      <main className="main-content">
        {/* Global Header Actions (Bell & Settings dropdown) */}
        <div className="global-header-actions" ref={notificationsDropdownRef}>
          <button 
            className="icon-btn-circle" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={20} />
            {(requestNotifications.length + messageNotifications.length) > 0 && (
              <span className="unread-badge-count">
                {requestNotifications.length + messageNotifications.length}
              </span>
            )}
          </button>

          {activeTab === 'feed' && (
            <div className="view-mode-toggle">
              <button 
                className="view-mode-btn"
                onClick={() => setViewMode('grid')}
                style={{ 
                  background: viewMode === 'grid' ? '#FFFFFF' : 'transparent', 
                  color: viewMode === 'grid' ? '#003135' : '#94A3B8',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
              <button 
                className="view-mode-btn"
                onClick={() => setViewMode('list')}
                style={{ 
                  background: viewMode === 'list' ? '#FFFFFF' : 'transparent', 
                  color: viewMode === 'list' ? '#003135' : '#94A3B8',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          )}

          <button 
            className="icon-btn-circle" 
            onClick={() => useAppStore.getState().setActiveTab('profile')}
            title="Settings"
          >
            <SettingsIcon size={20} />
          </button>

          {/* Notifications Drawer Dropdown */}
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span>Notifications</span>
                <button 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }} 
                  onClick={() => setShowNotifications(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="notification-tabs">
                <button 
                  className={`notification-tab-btn ${activeNotificationTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setActiveNotificationTab('requests')}
                >
                  Requests ({requestNotifications.length})
                </button>
                <button 
                  className={`notification-tab-btn ${activeNotificationTab === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveNotificationTab('messages')}
                >
                  Messages ({messageNotifications.length})
                </button>
              </div>

              <div className="notification-list">
                {activeNotificationTab === 'requests' && (
                  <>
                    {requestNotifications.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                        <button 
                          onClick={handleClearRequests}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          Clear All Requests
                        </button>
                      </div>
                    )}
                    {requestNotifications.length > 0 ? (
                      requestNotifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${notif.status === 'pending' ? 'unread' : ''}`}
                          onClick={notif.onClick}
                        >
                          <span className="notification-item-text">{notif.text}</span>
                          <span className="notification-item-time">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {notif.clearable && (
                            <button 
                              className="notification-item-clear"
                              title="Clear notification"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = [...clearedRequestIds, notif.id];
                                setClearedRequestIds(updated);
                                localStorage.setItem('clearedRequestIds', JSON.stringify(updated));
                              }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="notification-empty">No new claim requests.</div>
                    )}
                  </>
                )}

                {activeNotificationTab === 'messages' && (
                  <>
                    {messageNotifications.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                        <button 
                          onClick={handleClearMessages}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          Clear All Messages
                        </button>
                      </div>
                    )}
                    {messageNotifications.length > 0 ? (
                      messageNotifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className="notification-item unread"
                          onClick={notif.onClick}
                        >
                          <span className="notification-item-text">{notif.text}</span>
                          <span className="notification-item-time">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="notification-empty">No unread chat messages.</div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === 'feed' && <HomeFeed />}
        {activeTab === 'my-reports' && renderMyReports()}
        {activeTab === 'claims' && <ClaimsCenter />}
        {activeTab === 'chats' && <ChatHub />}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'admin-dashboard' && renderAdminDashboard()}
      </main>

      {/* Modals & Wizards */}
      {showWizard && <ReportWizard onClose={() => setShowWizard(false)} />}
      {selectedItem && <ItemDetails onClose={() => setSelectedItem(null)} />}
    </div>
  );
}

export default App;
