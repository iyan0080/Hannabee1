import React, { useState } from 'react';
import { useWarung } from '../context/WarungContext';
import { AppUser } from '../types';
import { formatDateWithTime } from '../utils/format';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  AlertCircle,
  X,
  Lock,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const {
    users,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetUserPassword,
  } = useWarung();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<AppUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Add User Form State
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addIsActive, setAddIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));
  });

  // Handle Add User
  const handleSaveNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanEmail = addEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setFormError('Alamat email Gmail tidak valid.');
      return;
    }

    if (!addPassword || addPassword.length < 4) {
      setFormError('Password minimal 4 karakter.');
      return;
    }

    const res = addUser({
      name: addName.trim(),
      email: cleanEmail,
      password: addPassword.trim(),
      phone: addPhone.trim(),
      role: 'Pengguna Warung',
      isActive: addIsActive,
    });

    if (!res.success) {
      setFormError(res.message || 'Gagal menambahkan pengguna.');
    } else {
      setShowAddModal(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddPhone('');
    }
  };

  // Handle Edit User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError('');

    const cleanEmail = editingUser.email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setFormError('Alamat email Gmail tidak valid.');
      return;
    }

    const res = updateUser(editingUser.id, {
      name: editingUser.name.trim(),
      email: cleanEmail,
      phone: editingUser.phone?.trim(),
      isActive: editingUser.isActive,
    });

    if (!res.success) {
      setFormError(res.message || 'Gagal menyimpan perubahan.');
    } else {
      setEditingUser(null);
    }
  };

  // Handle Reset Password
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (!newPasswordVal || newPasswordVal.length < 4) {
      alert('Password baru minimal 4 karakter.');
      return;
    }

    resetUserPassword(passwordModalUser.id, newPasswordVal.trim());
    setPasswordModalUser(null);
    setNewPasswordVal('');
    alert(`Password untuk ${passwordModalUser.name} (${passwordModalUser.email}) berhasil diperbarui!`);
  };

  // Handle Delete
  const handleDelete = (u: AppUser) => {
    if (currentUser?.id === u.id) {
      alert('Anda tidak dapat menghapus akun yang sedang Anda gunakan.');
      return;
    }

    if (window.confirm(`Yakin ingin menghapus akun pengguna "${u.name}" (${u.email})?`)) {
      const res = deleteUser(u.id);
      if (!res.success) {
        alert(res.message || 'Gagal menghapus pengguna.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Banner adhering to Geometric Balance */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Manajemen Pengguna & Hak Akses
              </h1>
              <p className="text-xs text-slate-500">
                Kelola daftar akun login Gmail staf & kasir warung. Semua pengguna memiliki tingkat hak akses yang setara.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-add-user"
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition shrink-0"
        >
          <UserPlus size={16} />
          <span>+ Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Info Pill */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Ketentuan Hak Akses Setara:</span> Seluruh pengguna terdaftar dapat mengoperasikan kasir POS, menambah menu & varian, mengelola transaksi & saldo deposit pelanggan, serta melihat dan mencetak seluruh laporan pembukuan usaha.
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="search-user-input"
            type="text"
            placeholder="Cari berdasarkan nama pengguna, alamat Gmail, atau nomor HP..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-500 px-2 whitespace-nowrap">
          {filteredUsers.length} Akun Terdaftar
        </div>
      </div>

      {/* Users Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(user => {
          const isMe = currentUser?.id === user.id;
          return (
            <div
              key={user.id}
              id={`user-card-${user.id}`}
              className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 relative ${
                isMe ? 'border-blue-400 shadow-sm ring-1 ring-blue-400/30' : 'border-slate-200 shadow-2xs hover:shadow-sm'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl ${
                        user.avatarColor || 'bg-blue-600'
                      } text-white font-black text-base flex items-center justify-center shadow-xs`}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{user.name}</h3>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Akun Anda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        <Mail size={12} className="text-slate-400" />
                        <span>{user.email}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Toggle Badge */}
                  <button
                    onClick={() => toggleUserStatus(user.id)}
                    title="Klik untuk mengubah status aktif/nonaktif"
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition ${
                      user.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {user.isActive ? (
                      <>
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        <span>Aktif</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={11} className="text-slate-400" />
                        <span>Nonaktif</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Details Section */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {user.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={13} className="text-slate-400" />
                      <span className="font-mono">{user.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-500">
                    <Shield size={13} className="text-blue-500" />
                    <span>Peran: <strong className="text-slate-700">{user.role}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <Clock size={12} />
                    <span>
                      Login Terakhir:{' '}
                      {user.lastLogin ? formatDateWithTime(user.lastLogin) : 'Belum pernah login'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPasswordModalUser(user)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Ganti password pengguna"
                >
                  <KeyRound size={13} className="text-amber-600" />
                  <span>Ganti Password</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingUser({ ...user });
                      setFormError('');
                    }}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                    title="Edit nama / nomor HP"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => handleDelete(user)}
                    disabled={isMe}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title={isMe ? 'Tidak bisa menghapus akun sendiri' : 'Hapus akun pengguna'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus size={18} />
                </span>
                <h3 className="text-base font-bold text-slate-900">Tambah Pengguna Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siti Rahmawati"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Email Gmail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="siti.hannabee@gmail.com"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Pilihan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Min. 4 karakter..."
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor HP / WhatsApp (Opsional)
                </label>
                <input
                  type="tel"
                  placeholder="08123456789"
                  value={addPhone}
                  onChange={e => setAddPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="add-is-active"
                  type="checkbox"
                  checked={addIsActive}
                  onChange={e => setAddIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="add-is-active" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Aktifkan akun ini sekarang
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Edit2 size={18} />
                </span>
                <h3 className="text-base font-bold text-slate-900">Edit Profil Pengguna</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Gmail
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="tel"
                  value={editingUser.phone || ''}
                  onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-is-active"
                  type="checkbox"
                  checked={editingUser.isActive}
                  onChange={e => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="edit-is-active" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Status akun aktif
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset Password */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ganti Password</h3>
                  <p className="text-[11px] text-slate-500">{passwordModalUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru Pilihan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan password baru..."
                  value={newPasswordVal}
                  onChange={e => setNewPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Perbarui Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
