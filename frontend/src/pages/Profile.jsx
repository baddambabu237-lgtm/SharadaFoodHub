import React, { useState } from 'react';
import { User, Mail, Phone, Lock } from 'lucide-react';
import API from '../utils/api';

const Profile = () => {
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErrorMessage('All fields are required.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmNewPassword: confirmNewPassword
      });
      setSuccessMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || 'Failed to change password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center py-20 text-warmgray-400">Loading user profile...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Admin Profile Settings</h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Manage your administrative credentials and security settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Admin Details card */}
        <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/40 rounded-full flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-brand-650 dark:text-brand-550" />
            </div>
            <h3 className="font-bold text-lg text-warmgray-900 dark:text-white font-display">{user.name}</h3>
            <span className="px-2.5 py-0.5 bg-brand-50 text-brand-600 rounded-full text-[10px] font-bold uppercase tracking-wider dark:bg-brand-950/40 dark:text-brand-400 mt-1">{user.role}</span>
          </div>

          <div className="divide-y divide-warmgray-50 dark:divide-warmgray-750 text-xs">
            <div className="py-3 flex items-center space-x-3">
              <Mail className="w-4 h-4 text-warmgray-400 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] font-bold text-warmgray-400 uppercase">Email Address</p>
                <p className="font-bold text-warmgray-700 dark:text-white truncate">{user.email}</p>
              </div>
            </div>
            <div className="py-3 flex items-center space-x-3">
              <Phone className="w-4 h-4 text-warmgray-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase">Phone Number</p>
                <p className="font-bold text-warmgray-700 dark:text-white">+91 {user.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700">
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold">
            <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white mb-2">Change Admin Password</h3>
            <p className="text-warmgray-500 dark:text-warmgray-400 font-medium">To protect your administrative account, choose a strong password of at least 8 characters.</p>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-155 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-green-50 text-green-755 rounded-xl border border-green-150 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50">
                {successMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-warmgray-500 block">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200 dark:border-warmgray-700 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                placeholder="Enter current admin password"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-warmgray-500 block">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200 dark:border-warmgray-700 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                placeholder="Enter new strong password"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-warmgray-500 block">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200 dark:border-warmgray-700 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                placeholder="Re-enter new password to confirm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-sm transition-colors mt-2 disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
