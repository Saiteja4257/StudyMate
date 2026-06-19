import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, updatePassword } from '../services/authService';
import { ChevronLeft, User as UserIcon, Lock, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  
  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const isGoogleUser = !user?.email; // We don't have a direct flag, but usually if we have a way to know, wait... Actually if they don't have a password they are google auth. We will just try to show password change always, and backend will reject if they are google auth.
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setProfileLoading(true);

    try {
      const res = await updateProfile({ name, email });
      updateUser(res.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setProfileMsg({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile' 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      return setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
    }

    setPasswordLoading(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMsg({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update password' 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/[0.06] bg-black/20 sticky top-0 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium text-sm">Back</span>
          </button>
          <div className="w-px h-6 bg-white/[0.1]"></div>
          <div>
            <h1 className="text-xl font-bold text-white">Profile Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8 space-y-8 pb-20">
        
        {/* Profile Info Section */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Personal Information</h2>
              <p className="text-sm text-gray-400">Update your name and email address</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6 relative z-10 max-w-2xl">
            {profileMsg.text && (
              <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${profileMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {profileMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileLoading || (name === user?.name && email === user?.email)}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:shadow-none"
              >
                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Security</h2>
              <p className="text-sm text-gray-400">Update your password to keep your account secure</p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6 relative z-10 max-w-2xl">
            {passwordMsg.text && (
              <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${passwordMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {passwordMsg.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:shadow-none"
              >
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Password
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;
