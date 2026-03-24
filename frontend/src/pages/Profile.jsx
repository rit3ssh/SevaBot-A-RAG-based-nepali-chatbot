import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAppLayout } from '../components/AppLayout';

export default function Profile() {
  const navigate = useNavigate();
  const { 
    user: layoutUser, 
    setUser: setLayoutUser, 
    handleLogout, 
    setSidebarOpen,
    isDark,
    setIsDark
  } = useAppLayout();

  const [user, setUser] = useState({ username: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    if (layoutUser) {
      setUser(layoutUser);
    } else {
      const userData = localStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    }

    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        if (response.data) {
          setUser(prev => ({ ...prev, ...response.data }));
          const merged = { ...(layoutUser || {}), ...response.data };
          localStorage.setItem('user', JSON.stringify(merged));
          if (setLayoutUser) setLayoutUser(merged);
        }
      } catch (error) {
        console.warn('Could not fetch fresh profile.');
      }
    };
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await authAPI.updateProfile({ username: user.username, email: user.email });
      if (response.data) {
        const updated = { ...user, ...response.data };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        if (setLayoutUser) setLayoutUser(updated);
        setSuccessMsg('प्रोफाइल सफलतापूर्वक अपडेट भयो।');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.error || 'प्रोफाइल अपडेट गर्न असफल भयो। कृपया फेरि प्रयास गर्नुहोस्।');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrorMsg("नयाँ पासवर्डहरू मिलेनन्।");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await authAPI.changePassword({
        old_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      setSuccessMsg('पासवर्ड सफलतापूर्वक परिवर्तन भयो।');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'पासवर्ड परिवर्तन गर्न असफल भयो।');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  return (
    <div className={`flex flex-col flex-1 overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Top bar — consistent with chat page header */}
      <div className={`border-b backdrop-blur px-4 py-3 md:px-6 flex items-center gap-3 flex-shrink-0 ${isDark ? 'border-primary-800 bg-primary-950/90 text-primary-100' : 'border-primary-600 bg-slate-100 text-primary-500'}`}>
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`md:hidden p-1.5 rounded-lg transition ${isDark ? 'hover:bg-primary-900 text-primary-400' : 'hover:bg-primary-600 text-primary-500'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex-1 flex items-center gap-3">
          <img src="/logo.png" alt="SevaBot" className="w-8 h-8 object-contain" />
          <div className="hidden sm:block">
            <h1 className={`text-base md:text-lg font-bold tracking-tight ${isDark ? 'text-primary-100' : 'text-primary-500'}`}>
              प्रोफाइल
            </h1>
            <p className={`text-xs ${isDark ? 'text-primary-300' : 'text-primary-400'}`}>
              तपाईंको खाताको विवरण व्यवस्थापन गर्नुहोस्।
            </p>
          </div>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setIsDark((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'border-primary-800 bg-primary-900 text-slate-100 hover:bg-primary-800' : 'border-primary-100 bg-primary-100 text-primary-500 hover:bg-primary-500 hover:text-primary-100'}`}
          title="Toggle theme"
        >
          <span>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Feedback messages */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 font-medium text-sm flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 font-medium text-sm flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              {errorMsg}
            </div>
          )}

          {/* Profile Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              व्यक्तिगत विवरण (Personal Information)
            </h2>
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>युजरनेम (Username)</label>
                    <input
                      type="text"
                      value={user.username || ''}
                      onChange={(e) => setUser({ ...user, username: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:ring-primary-500 outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>इमेल (Email)</label>
                    <input
                      type="email"
                      value={user.email || ''}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:ring-primary-500 outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      required
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                    अपडेट गर्नुहोस् (Update Profile)
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Password Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              पासवर्ड परिवर्तन (Change Password)
            </h2>
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>हालको पासवर्ड (Current Password)</label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:ring-primary-500 outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>नयाँ पासवर्ड (New Password)</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:ring-primary-500 outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>पासवर्ड पुष्टि गर्नुहोस् (Confirm Password)</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:ring-primary-500 outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      required
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={loading} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                    परिवर्तन गर्नुहोस् (Change Password)
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Preferences Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              प्राथमिकताहरू (Preferences)
            </h2>
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">प्रिमियम डार्क मोड (Dark Mode)</h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>तपाईंको आँखाको सुरक्षाको लागि। (For your eye protection)</p>
                </div>
                <button
                  onClick={() => setIsDark((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDark ? 'bg-primary-500' : 'bg-slate-300'}`}
                >
                  <span className={`${isDark ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
