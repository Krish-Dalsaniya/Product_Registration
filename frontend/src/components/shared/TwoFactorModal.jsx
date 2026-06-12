import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { setup2FaApi, verify2FaApi, disable2FaApi, getMeApi } from '../../api/auth';
import { Loader2, Shield, ShieldCheck, ShieldAlert, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const TwoFactorModal = ({ isOpen, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [is2FaEnabled, setIs2FaEnabled] = useState(false);
  const { user, login } = useAuth(); // we can use context to refresh user data if needed, though getMeApi does it via useEffect if we want, but better to just locally update.
  
  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const res = await getMeApi();
      const enabled = res.data?.data?.user?.is_two_factor_enabled || false;
      setIs2FaEnabled(enabled);
      
      if (!enabled) {
        // If not enabled, initiate setup
        const setupRes = await setup2FaApi();
        setQrCodeUrl(setupRes.data.data.qrCodeUrl);
        setSecret(setupRes.data.data.secret);
      }
    } catch (err) {
      toast.error('Failed to load 2FA status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    
    setIsLoading(true);
    try {
      await verify2FaApi(otp);
      toast.success('Two-Factor Authentication enabled successfully!');
      setIs2FaEnabled(true);
      setOtp('');
      
      // Update local storage user silently
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.is_two_factor_enabled = true;
        if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(parsed));
        else sessionStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      await disable2FaApi();
      toast.success('Two-Factor Authentication disabled.');
      setIs2FaEnabled(false);
      
      // Update local storage
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.is_two_factor_enabled = false;
        if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(parsed));
        else sessionStorage.setItem('user', JSON.stringify(parsed));
      }
      
      // Fetch new setup code
      const setupRes = await setup2FaApi();
      setQrCodeUrl(setupRes.data.data.qrCodeUrl);
      setSecret(setupRes.data.data.secret);
    } catch (err) {
      toast.error('Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setIsCopied(true);
    toast.success('Setup key copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadRecoveryKey = () => {
    const email = user?.email || 'user';
    const content = `Product Registration - 2FA Recovery\n\nUser: ${email}\n\nAuthenticator Setup Key:\n${secret}\n\nKeep this file secure.\nAnyone with this key can generate your OTP codes.\n`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-recovery-key.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Recovery key downloaded successfully!');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Security Settings" maxWidth="max-w-md">
      <div className="p-2 space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3">
            {is2FaEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
          </div>
          <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500 mt-1">
            {is2FaEnabled 
              ? 'Your account is protected with two-factor authentication.' 
              : 'Add an extra layer of security to your account.'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : is2FaEnabled ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
            <p className="text-sm text-gray-600 mb-6">
              When 2FA is enabled, you will be required to enter a code from your authenticator app each time you log in.
            </p>
            <button
              onClick={handleDisable}
              className="px-6 py-2.5 bg-red-50 text-red-600 font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-red-100 transition-colors w-full"
            >
              Disable 2FA
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
              <p className="text-sm text-gray-700 font-medium mb-4">1. Scan this QR code with your Authenticator App</p>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto w-40 h-40 border-4 border-white shadow-sm rounded-lg" />
              ) : (
                <div className="w-40 h-40 mx-auto bg-gray-200 animate-pulse rounded-lg"></div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs font-medium mb-4 text-left shadow-sm border border-yellow-100 flex items-start gap-2">
                  <ShieldAlert size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                  <span>Save this recovery key in a secure place. If you lose your authenticator app, this key can be used to reconfigure 2FA on a new device.</span>
                </div>
                
                <button
                  type="button"
                  onClick={downloadRecoveryKey}
                  className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
                >
                  Download Recovery Key
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium text-center">2. Enter the 6-digit code</p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
                placeholder="000000"
                className="w-full h-12 text-center text-xl tracking-[0.5em] border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={otp.length !== 6}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Enable 2FA
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default TwoFactorModal;
