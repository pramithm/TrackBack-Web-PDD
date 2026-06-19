import React, { useState } from 'react';
import { auth } from '../../../Backend/config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { userService } from '../../../Backend/services/userService';
import { useAppStore } from '../../../Backend/store/useAppStore';
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
  EyeOff 
} from 'lucide-react';
import './AuthModule.css';

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
  
  const [view, setView] = useState('landing'); // 'landing' | 'login' | 'signup' | 'forgot' | 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [tempUser, setTempUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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
      const profile = await userService.getUserProfile(userCredential.user.uid);
      
      if (profile && profile.isProfileVerified) {
        setUser({ uid: userCredential.user.uid, email, ...profile });
      } else {
        setTempUser(userCredential.user);
        setView('verify');
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
      setTempUser(userCredential.user);
      setView('verify');
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

  const handleSendOtp = () => {
    if (!name.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError('Please enter a valid Phone Number.');
      return;
    }

    setLoading(true);
    setError('');
    
    setTimeout(() => {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setSimulatedOtp(generatedOtp);
      setLoading(false);
      alert(`[SMS SIMULATION] Your TrackBack verification code is: ${generatedOtp}`);
    }, 1200);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the 4-digit code.');
      return;
    }
    if (otp !== simulatedOtp) {
      setError('Invalid verification code. Please try again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const uid = tempUser.uid;
      const profileData = {
        name: name.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        isProfileVerified: true,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      };

      await userService.updateUserProfile(uid, profileData);
      
      setUser({
        uid,
        email: tempUser.email,
        ...profileData
      });
    } catch (err) {
      console.error(err);
      setError('Verification failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Renders the full-screen landing marketing page matching Landing.png
  const renderLanding = () => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header Navbar */}
      <header className="landing-header">
        <div className="landing-logo">
          <Sparkles size={26} style={{ color: '#0FA4AF' }} />
          <span>TrackBack</span>
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
        <div className="auth-badge-icon">
          <ShieldCheck size={28} />
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
        <div className="auth-badge-icon">
          <ShieldCheck size={28} />
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
                placeholder="•••••••• (Min 6 chars)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
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
        <div className="auth-badge-icon">
          <ShieldCheck size={28} />
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
        <div className="auth-badge-icon">
          <ShieldCheck size={28} />
        </div>
        <h2 className="auth-title">Verify Profile</h2>
        <p className="auth-subtitle">All users must complete profile setup to interact on the platform.</p>

        {error && <div className="auth-error">{error}</div>}

        {!simulatedOtp ? (
          <div>
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

            <button id="verify-send-otp-btn" className="btn-auth-submit" onClick={handleSendOtp} disabled={loading}>
              {loading ? <Loader2 className="spinner" size={18} style={{ borderLeftColor: '#fff', borderTopColor: 'transparent', width: 18, height: 18 }} /> : 'Send Verification OTP'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group" style={{ textAlign: 'center' }}>
              <label className="form-label">Enter 4-Digit Code</label>
              <p style={{ fontSize: '0.8rem', color: '#003135', marginBottom: '0.5rem' }}>Sent to +91 {phone}</p>
              <input 
                type="text" 
                className="auth-form-input" 
                style={{ fontSize: '2rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 'bold', paddingLeft: 0 }}
                placeholder="0000" 
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <button className="btn-auth-submit" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={18} style={{ borderLeftColor: '#fff', borderTopColor: 'transparent', width: 18, height: 18 }} /> : 'Verify & Continue'}
            </button>

            <button 
              className="auth-card-footer-link" 
              style={{ display: 'block', margin: '1.5rem auto 0', fontSize: '0.9rem' }} 
              type="button" 
              onClick={() => { setSimulatedOtp(''); setOtp(''); }}
            >
              Change Phone Number
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="auth-wrapper">
      {view === 'landing' && renderLanding()}
      {view === 'login' && renderLogin()}
      {view === 'signup' && renderSignup()}
      {view === 'forgot' && renderForgot()}
      {view === 'verify' && renderVerify()}
    </div>
  );
}
