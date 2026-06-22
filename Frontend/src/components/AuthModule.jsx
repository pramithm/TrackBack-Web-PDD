import React, { useState, useEffect } from 'react';
import { auth } from '../../../Backend/config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { userService } from '../../../Backend/services/userService';
import { useAppStore } from '../../../Backend/store/useAppStore';
import Logo from './Logo';
import { 
  KeyRound, 
  Mail, 
  User, 
  Phone, 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  MapPin, 
  Zap, 
  Network, 
  HelpCircle, 
  ArrowRight, 
  Lock, 
  Globe, 
  Eye, 
  EyeOff,
  Calendar
} from 'lucide-react';
import './AuthModule.css';

if (typeof window !== 'undefined') {
  window.__firebase_auth = auth;
}

const Facebook = ({ size = 18, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export default function AuthModule() {
  const setUser = useAppStore((state) => state.setUser);
  
  const [view, setView] = useState(() => {
    const storeState = useAppStore.getState();
    if (storeState.isAuthenticated) {
      if (!storeState.user?.emailVerified) {
        return 'email-verify-required';
      } else if (!storeState.user?.isProfileVerified) {
        return 'verify';
      }
    }
    return 'landing';
  }); // 'landing' | 'login' | 'signup' | 'forgot' | 'verify' | 'email-verify-required'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempUser, setTempUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Email verification resend cooldown state
  const [verifyMessage, setVerifyMessage] = useState(
    'A verification email has been sent to your email address. Please verify your email before accessing all features of Track Back.'
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Handle resend cooldown countdown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Reload to ensure we have latest email verification status
      await firebaseUser.reload();
      
      if (!firebaseUser.emailVerified) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: false,
          isProfileVerified: false
        });
        setView('email-verify-required');
      } else {
        const profile = await userService.getUserProfile(firebaseUser.uid);
        
        // Sync verified status to database if not already done
        if (profile && !profile.emailVerified) {
          try {
            await userService.updateUserProfile(firebaseUser.uid, {
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
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, emailVerified: true, ...profile });
        } else {
          setTempUser(firebaseUser);
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, emailVerified: true, isProfileVerified: false });
          setView('verify');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Automatically send Firebase Email Verification link
      try {
        await sendEmailVerification(firebaseUser);
      } catch (emailErr) {
        console.error('Error sending verification email during signup:', emailErr);
      }

      setTempUser(firebaseUser);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: false,
        isProfileVerified: false
      });
      setView('email-verify-required');
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset link sent to your email.');
      setView('login');
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      setError('Please enter a valid 10-digit Phone Number.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      setError('Please enter a valid age (13–120).');
      return;
    }
    if (!gender) {
      setError('Please select your gender.');
      return;
    }
    if (!location.trim()) {
      setError('Please enter your location.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const activeUser = auth.currentUser || tempUser;
      if (!activeUser) {
        throw new Error('No authenticated user found.');
      }
      
      const uid = activeUser.uid;
      const profileData = {
        name: name.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        age: parseInt(age, 10),
        gender,
        location: location.trim(),
        college: location.trim(), // college maps to location for backward compatibility
        isProfileVerified: true,
        emailVerified: true,
        isEmailVerified: true,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      };

      await userService.updateUserProfile(uid, profileData);
      
      setUser({
        uid,
        email: activeUser.email,
        ...profileData
      });
    } catch (err) {
      console.error(err);
      setError('Profile setup failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    try {
      const activeUser = auth.currentUser || tempUser;
      if (activeUser) {
        await sendEmailVerification(activeUser);
        setVerifyMessage('A new verification email has been sent!');
        setResendCooldown(60); // 60-second cooldown protection
      } else {
        setError('No authenticated user found. Please login again.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setResendLoading(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    setLoading(true);
    setError('');
    try {
      const activeUser = auth.currentUser || tempUser;
      if (activeUser) {
        await activeUser.reload();
        const refreshedUser = auth.currentUser || activeUser;
        
        if (refreshedUser.emailVerified) {
          const profile = await userService.getUserProfile(refreshedUser.uid);
          
          if (profile && !profile.emailVerified) {
            try {
              await userService.updateUserProfile(refreshedUser.uid, {
                emailVerified: true,
                isEmailVerified: true
              });
              profile.emailVerified = true;
              profile.isEmailVerified = true;
            } catch (dbErr) {
              console.error('Error updating DB profile verified flag:', dbErr);
            }
          }

          if (profile && profile.isProfileVerified) {
            setUser({
              uid: refreshedUser.uid,
              email: refreshedUser.email,
              emailVerified: true,
              ...profile
            });
          } else {
            setUser({
              uid: refreshedUser.uid,
              email: refreshedUser.email,
              emailVerified: true,
              isProfileVerified: false
            });
            setView('verify');
          }
        } else {
          setVerifyMessage(
            'Your email address has not been verified yet. Please check your inbox and click the verification link.'
          );
        }
      } else {
        setError('No authenticated user found. Please login again.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutFromVerification = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      useAppStore.getState().logout();
      setTempUser(null);
      setView('login');
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  // Renders the full-screen landing marketing page matching Landing.png
  const renderLanding = () => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header Navbar */}
      <header className="landing-header">
        <div className="landing-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <Logo size={36} showText={true} textColor="#003135" />
        </div>
        <nav className="landing-nav">
          <a href="#how" className="landing-nav-link">How it Works</a>
          <a href="#privacy" className="landing-nav-link">Privacy</a>
          <a href="#contact" className="landing-nav-link">Contact</a>
        </nav>
        <div className="landing-actions">
          <button id="landing-signin-btn" className="btn-nav-signin" onClick={() => setView('login')}>
            Sign In
          </button>
          <button id="landing-signup-btn" className="btn-nav-signup" onClick={() => setView('signup')}>
            Create Account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-left">
          <div className="hero-badge">
            <ShieldCheck size={14} style={{ marginRight: '4px' }} /> Trusted by 50k+ recovery specialists
          </div>
          <h1 className="hero-title">
            Your valuable<br />
            items, <em>connected</em><br />
            to you.
          </h1>
          <p className="hero-description">
            TrackBack is the global standard for lost and found recovery. Our precision tracking and verified community ensure your belongings find their way home safely and swiftly.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-report" onClick={() => setView('login')}>
              Report Found Item <ArrowRight size={18} />
            </button>
            <button className="btn-hero-claim" onClick={() => setView('login')}>
              Claim Lost Item
            </button>
          </div>
          <div className="hero-social-proof">
            <div className="social-avatars">
              <div className="avatar-circle" />
              <div className="avatar-circle" />
              <div className="avatar-circle" />
            </div>
            <div className="social-text">
              <strong>4.9/5 Average Recovery Rating</strong><br />
              Based on 12,000+ verified successful returns
            </div>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-mockup-container">
            <div className="hero-inner-screenshot">
              <div className="screenshot-header" />
              <div className="screenshot-line" />
              <div className="screenshot-line" />
              <div className="screenshot-line short" />
              <div className="screenshot-btn" />
            </div>
            {/* Floating Badge */}
            <div className="floating-badge">
              <div className="badge-pin-circle">
                <MapPin size={18} />
              </div>
              <div>
                <div className="badge-title">Active Search</div>
                <div className="badge-sub">MacBook Pro M2 • London</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features Section */}
      <section id="how" className="landing-security">
        <div className="section-header">
          <h2 className="section-title">Designed for Complete Security</h2>
          <p className="section-subtitle">
            Our infrastructure is built on the principles of TrustTech, ensuring your data and belongings are protected by military-grade encryption.
          </p>
        </div>
        <div className="security-grid">
          <div className="sec-card wide">
            <div className="sec-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <h3 className="sec-card-title">End-to-End Encrypted Ownership</h3>
            <p className="sec-card-desc">
              Your ownership records are cryptographically secured. Only verified owners can access granular location data and claim their items.
            </p>
            <span className="sec-card-link" onClick={() => setView('login')}>Read Security Whitepaper</span>
          </div>

          <div className="sec-card dark">
            <div className="sec-icon-wrapper">
              <Network size={24} />
            </div>
            <h3 className="sec-card-title">Global Network</h3>
            <p className="sec-card-desc">
              Connect with local authorities and communities in over 120 countries instantly.
            </p>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrapper">
              <Zap size={24} />
            </div>
            <h3 className="sec-card-title">Rapid Response</h3>
            <p className="sec-card-desc">
              90% of reported items are located within the first 48 hours of recovery activation.
            </p>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <h3 className="sec-card-title">Verified Agents</h3>
            <p className="sec-card-desc">
              All finders are screened through our multi-step verification process to ensure total safety.
            </p>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrapper">
              <HelpCircle size={24} />
            </div>
            <h3 className="sec-card-title">24/7 Human Support</h3>
            <p className="sec-card-desc">
              Losing something is stressful. Our empathy-trained recovery specialists are here to help.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section id="contact" className="landing-cta">
        <div className="cta-banner">
          <h2 className="cta-title">Secure your world with TrackBack today.</h2>
          <p className="cta-subtitle">
            Join the thousands of people who never have to worry about "losing" their essentials again.
          </p>
          <div className="cta-actions">
            <button className="btn-cta-create" onClick={() => setView('signup')}>Create Free Account</button>
            <button className="btn-cta-demo" onClick={() => setView('login')}>View Demo Account</button>
          </div>
          <span className="cta-subtext">No credit card required for standard personal recovery. Secure forever.</span>
        </div>
      </section>

      {/* Footer */}
      <footer id="privacy" className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">TrackBack</div>
            <p className="footer-brand-desc">
              The global standard for item recovery and digital security.
            </p>
          </div>
          <div className="footer-links-grid">
            <div>
              <div className="footer-col-title">Product</div>
              <div className="footer-col-links">
                <a href="#how" className="footer-link">Global Feed</a>
                <a href="#how" className="footer-link">Claims Center</a>
                <a href="#how" className="footer-link">Mobile App</a>
              </div>
            </div>
            <div>
              <div className="footer-col-title">Resources</div>
              <div className="footer-col-links">
                <a href="#how" className="footer-link">Privacy Policy</a>
                <a href="#how" className="footer-link">Help Center</a>
                <a href="#how" className="footer-link">Developer API</a>
              </div>
            </div>
            <div>
              <div className="footer-col-title">Legal</div>
              <div className="footer-col-links">
                <a href="#how" className="footer-link">Terms of Service</a>
                <a href="#how" className="footer-link">Cookie Settings</a>
                <a href="#how" className="footer-link">Sitemap</a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2024 TrackBack Recovery Services Inc. All rights reserved.</span>
          <div className="footer-icons">
            <Globe size={18} />
            <Facebook size={18} />
          </div>
        </div>
      </footer>
    </div>
  );

  // Renders the Login page matching Login.png
  const renderLogin = () => (
    <div className="auth-centered-container">
      <button className="back-to-explorer" onClick={() => setView('landing')}>
        <ArrowLeft size={16} /> Back to explorer
      </button>

      <div className="auth-card">
        <div className="auth-badge-icon" style={{ background: 'transparent', width: 'auto', height: 'auto', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size={56} />
        </div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your TrackBack account to manage your reports</p>

        {error && <div id="login-error" className="auth-error">{error}</div>}

        <form id="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrapper">
              <Mail size={18} className="form-input-icon" />
              <input 
                id="login-email"
                type="email" 
                className="auth-form-input" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="auth-forgot-row">
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <button 
                className="auth-forgot-link" 
                type="button"
                onClick={() => setView('forgot')}
              >
                Forgot password?
              </button>
            </div>
            <div className="form-input-wrapper">
              <Lock size={18} className="form-input-icon" />
              <input 
                id="login-password"
                type={showPassword ? "text" : "password"} 
                className="auth-form-input" 
                style={{ paddingRight: '2.75rem' }}
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="form-input-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label className="auth-checkbox-label">
              <input type="checkbox" style={{ accentColor: '#003135' }} />
              Remember this device for 30 days
            </label>
          </div>

          <button id="login-submit-btn" className="btn-auth-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} style={{ borderLeftColor: '#fff', borderTopColor: 'transparent', width: 18, height: 18 }} /> : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">Or continue with</div>

        <div className="auth-social-row">
          <button className="btn-social-login" onClick={() => alert('Mock authentication action.')}>
            <Sparkles size={16} style={{ color: '#F1C40F' }} /> Google
          </button>
          <button className="btn-social-login" onClick={() => alert('Mock authentication action.')}>
            <Facebook size={16} style={{ color: '#1877F2' }} /> Facebook
          </button>
        </div>

        <div className="auth-card-footer">
          New to TrackBack?{' '}
          <button className="auth-card-footer-link" onClick={() => setView('signup')}>Create an account</button>
        </div>
      </div>

      <div className="auth-outer-footer">
        <a href="#privacy" className="auth-outer-footer-link">Privacy Policy</a>
        <a href="#how" className="auth-outer-footer-link">Terms of Service</a>
        <a href="#contact" className="auth-outer-footer-link">Support Center</a>
      </div>
    </div>
  );

  const renderSignup = () => (
    <div className="auth-centered-container">
      <button className="back-to-explorer" onClick={() => setView('landing')}>
        <ArrowLeft size={16} /> Back to explorer
      </button>

      <div className="auth-card">
        <div className="auth-badge-icon" style={{ background: 'transparent', width: 'auto', height: 'auto', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size={56} />
        </div>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Join the community to find and recover items</p>

        {error && <div id="signup-error" className="auth-error">{error}</div>}

        <form id="signup-form" onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrapper">
              <Mail size={18} className="form-input-icon" />
              <input 
                id="signup-email"
                type="email" 
                className="auth-form-input" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-wrapper">
              <Lock size={18} className="form-input-icon" />
              <input 
                id="signup-password"
                type={showPassword ? "text" : "password"} 
                className="auth-form-input" 
                style={{ paddingRight: '2.75rem' }}
                placeholder="•••••••• (Min 6 chars)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="form-input-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="form-input-wrapper">
              <Lock size={18} className="form-input-icon" />
              <input 
                id="signup-confirm-password"
                type={showPassword ? "text" : "password"} 
                className="auth-form-input" 
                style={{ paddingRight: '2.75rem' }}
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="form-input-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button id="signup-submit-btn" className="btn-auth-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} style={{ borderLeftColor: '#fff', borderTopColor: 'transparent', width: 18, height: 18 }} /> : 'Sign Up'}
          </button>
        </form>

        <div className="auth-divider">Or continue with</div>

        <div className="auth-social-row">
          <button className="btn-social-login" onClick={() => alert('Mock authentication action.')}>
            <Sparkles size={16} style={{ color: '#F1C40F' }} /> Google
          </button>
          <button className="btn-social-login" onClick={() => alert('Mock authentication action.')}>
            <Facebook size={16} style={{ color: '#1877F2' }} /> Facebook
          </button>
        </div>

        <div className="auth-card-footer">
          Already have an account?{' '}
          <button className="auth-card-footer-link" onClick={() => setView('login')}>Sign In</button>
        </div>
      </div>

      <div className="auth-outer-footer">
        <a href="#privacy" className="auth-outer-footer-link">Privacy Policy</a>
        <a href="#how" className="auth-outer-footer-link">Terms of Service</a>
        <a href="#contact" className="auth-outer-footer-link">Support Center</a>
      </div>
    </div>
  );

  const renderForgot = () => (
    <div className="auth-centered-container">
      <button className="back-to-explorer" onClick={() => setView('login')}>
        <ArrowLeft size={16} /> Back to Sign In
      </button>

      <div className="auth-card">
        <div className="auth-badge-icon" style={{ background: 'transparent', width: 'auto', height: 'auto', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size={56} />
        </div>
        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-subtitle">We will send you a password reset link</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrapper">
              <Mail size={18} className="form-input-icon" />
              <input 
                type="email" 
                className="auth-form-input" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="btn-auth-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} style={{ borderLeftColor: '#fff', borderTopColor: 'transparent', width: 18, height: 18 }} /> : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderVerify = () => (
    <div className="auth-centered-container">
      <div className="auth-card">
        <div className="auth-badge-icon" style={{ background: 'transparent', width: 'auto', height: 'auto', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size={56} />
        </div>
        <h2 className="auth-title">Complete Profile Setup</h2>
        <p className="auth-subtitle">All users must complete profile setup to interact on the platform.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleCompleteProfile}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="form-input-wrapper">
              <User size={18} className="form-input-icon" />
              <input 
                id="verify-name-input"
                type="text" 
                className="auth-form-input" 
                placeholder="John Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="auth-form-input" style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: '#F1F5F9', paddingLeft: 0 }}>
                +91
              </div>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Phone size={18} className="form-input-icon" />
                <input 
                  id="verify-phone-input"
                  type="tel" 
                  className="auth-form-input" 
                  placeholder="00000 00000" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Age</label>
            <div className="form-input-wrapper">
              <Calendar size={18} className="form-input-icon" />
              <input 
                id="verify-age-input"
                type="number" 
                className="auth-form-input" 
                placeholder="21" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="13"
                max="120"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Gender</label>
            <div className="form-input-wrapper">
              <User size={18} className="form-input-icon" />
              <select
                id="verify-gender-input"
                className="auth-form-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ paddingLeft: '2.75rem', background: '#FFF' }}
                required
              >
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location (City / Area)</label>
            <div className="form-input-wrapper">
              <MapPin size={18} className="form-input-icon" />
              <input 
                id="verify-location-input"
                type="text" 
                className="auth-form-input" 
                placeholder="Warangal, Telangana, India" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          <button id="verify-submit-btn" className="btn-auth-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} /> : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderEmailVerifyRequired = () => {
    const activeUser = auth.currentUser || tempUser;
    return (
      <div className="auth-centered-container">
        <div className="auth-card">
          <div className="auth-badge-icon" style={{ background: 'transparent', width: 'auto', height: 'auto', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <Logo size={56} />
          </div>
          <h2 className="auth-title">Verify Your Email</h2>
          <p className="auth-subtitle">Keep your TrackBack account secure</p>

          {activeUser?.email && (
            <div className="auth-verify-email-badge">
              <Mail size={16} />
              <span>{activeUser.email}</span>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-verify-message-container">
            <p className="auth-verify-message">{verifyMessage}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <button 
              id="verify-check-btn" 
              className="btn-auth-submit" 
              onClick={handleCheckEmailVerified} 
              disabled={loading}
            >
              {loading ? <Loader2 className="spinner" size={18} /> : "I've Verified My Email"}
            </button>

            <button 
              id="verify-resend-btn" 
              className="btn-auth-secondary" 
              onClick={handleResendVerificationEmail} 
              disabled={resendCooldown > 0 || resendLoading}
            >
              {resendLoading ? (
                <Loader2 className="spinner" size={18} />
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Verification Email'
              )}
            </button>

            <button 
              id="verify-signout-btn" 
              className="auth-card-footer-link" 
              onClick={handleSignOutFromVerification} 
              style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="auth-wrapper">
      {view === 'landing' && renderLanding()}
      {view === 'login' && renderLogin()}
      {view === 'signup' && renderSignup()}
      {view === 'forgot' && renderForgot()}
      {view === 'verify' && renderVerify()}
      {view === 'email-verify-required' && renderEmailVerifyRequired()}
    </div>
  );
}
