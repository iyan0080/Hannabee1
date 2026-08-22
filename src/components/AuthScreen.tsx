import React, { useState } from 'react';
import { useWarung } from '../context/WarungContext';
import { HannaBeeLogo } from './HannaBeeLogo';
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LogIn,
  UserPlus,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, registerUser, users } = useWarung();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Silakan masukkan alamat email Gmail Anda.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setErrorMsg('Format email tidak valid. Gunakan format seperti nama@gmail.com.');
      return;
    }

    if (!password) {
      setErrorMsg('Silakan masukkan password pilihan Anda.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      if (isRegisterMode) {
        if (!fullName.trim()) {
          setErrorMsg('Nama lengkap pengguna wajib diisi.');
          setLoading(false);
          return;
        }

        if (password.length < 4) {
          setErrorMsg('Password minimal terdiri dari 4 karakter.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
          setLoading(false);
          return;
        }

        const res = registerUser({
          name: fullName.trim(),
          email: cleanEmail,
          password: password.trim(),
          phone: phoneNumber.trim(),
        });

        if (!res.success) {
          setErrorMsg(res.message || 'Gagal mendaftar.');
          setLoading(false);
        } else {
          setSuccessMsg('Akun berhasil dibuat! Mengalihkan ke sistem...');
        }
      } else {
        const res = login(cleanEmail, password.trim());
        if (!res.success) {
          setErrorMsg(res.message || 'Login gagal.');
          setLoading(false);
        } else {
          setSuccessMsg('Login berhasil! Selamat datang.');
        }
      }
    }, 400);
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
    setSuccessMsg('');
    const res = login(demoEmail, demoPass);
    if (!res.success) {
      setErrorMsg(res.message || 'Login gagal.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Box */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10">
        
        {/* Brand Header */}
        <div className="bg-slate-900 px-6 sm:px-8 pt-8 pb-7 text-center text-white border-b border-slate-800">
          <div className="flex justify-center mb-3">
            <HannaBeeLogo size="md" variant="full" />
          </div>
          <p className="text-xs text-amber-300 font-medium tracking-wide">
            Jajanan Wareg Seger • 0821-7886-7116
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 text-slate-300 text-[11px] font-medium mt-3 border border-slate-700">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Sistem Otentikasi Akses Warung</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5">
          <button
            type="button"
            id="auth-tab-login"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              !isRegisterMode
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn size={15} className={!isRegisterMode ? 'text-blue-600' : ''} />
            <span>Masuk (Log In)</span>
          </button>
          
          <button
            type="button"
            id="auth-tab-register"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              isRegisterMode
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus size={15} className={isRegisterMode ? 'text-blue-600' : ''} />
            <span>Daftar Akun Baru</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          
          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-shake">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Register: Full Name */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Lengkap Pengguna <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-fullname-input"
                  type="text"
                  required
                  placeholder="Contoh: Iyan / Kasir Siang"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}

          {/* Email / Gmail Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alamat Gmail <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-email-input"
                type="email"
                required
                placeholder="nama.user@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Gunakan akun Gmail Anda untuk identitas login.
            </p>
          </div>

          {/* Register: Phone Number (Optional) */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor WhatsApp (Opsional)
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-phone-input"
                  type="tel"
                  placeholder="082178867116"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Password Pilihan Anda <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {isRegisterMode ? 'Min. 4 karakter' : ''}
              </span>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Masukkan password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Register: Confirm Password */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ulangi Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ketik ulang password..."
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="auth-submit-button"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </span>
            ) : isRegisterMode ? (
              <>
                <UserPlus size={16} />
                <span>Buat Akun & Masuk</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Masuk ke Aplikasi</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        {!isRegisterMode && (
          <div className="px-6 sm:px-8 pb-7 pt-2 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[11px] font-semibold text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>Akses Cepat (Pilih Akun Masuk):</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                id="quick-login-hanna"
                onClick={() => handleQuickLogin('hannaalmahyra24@gmail.com', 'hanna123')}
                className="p-2.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 rounded-xl text-left transition text-xs shadow-2xs group"
              >
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="text-amber-700">Hanna (Owner)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">hannaalmahyra24@gmail.com</div>
                <div className="text-[10px] text-amber-600 font-medium mt-1">Klik Masuk →</div>
              </button>

              <button
                type="button"
                id="quick-login-iyan"
                onClick={() => handleQuickLogin('iyan0080@gmail.com', 'password123')}
                className="p-2.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl text-left transition text-xs shadow-2xs group"
              >
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="text-blue-700">IYAN (Admin 1)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">iyan0080@gmail.com</div>
                <div className="text-[10px] text-blue-600 font-medium mt-1">Klik Masuk →</div>
              </button>

              <button
                type="button"
                id="quick-login-juni"
                onClick={() => handleQuickLogin('juni.bid89@gmail.com', 'juni123')}
                className="p-2.5 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 rounded-xl text-left transition text-xs shadow-2xs group"
              >
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="text-emerald-700">JUNI (Admin 2)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">juni.bid89@gmail.com</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-1">Klik Masuk →</div>
              </button>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="p-3.5 bg-slate-100/70 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-500">
            HannaBee POS • Seluruh staf & operator memiliki tingkat hak akses yang setara.
          </p>
        </div>
      </div>
    </div>
  );
};
