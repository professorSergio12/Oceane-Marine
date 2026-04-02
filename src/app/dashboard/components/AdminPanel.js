"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";

const OPS_ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer (Read Only)" },
  { value: "editor", label: "Editor (Create / Edit / Delete)" },
  { value: "approver", label: "Approver" },
  { value: "admin", label: "Admin (Master Data + User Mgmt)" },
];

const HR_ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer (read-only + download)" },
  { value: "editor", label: "Editor (create / edit / delete)" },
  { value: "approver", label: "Approver (read + download)" },
  { value: "admin", label: "Admin (read-only oversight)" },
];

const PMS_ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer (read-only + download)" },
  { value: "editor", label: "Editor (create / edit / delete)" },
  { value: "approver", label: "Approver (read + download)" },
  { value: "admin", label: "Admin (forms visible; no submit)" },
];

const QHSE_ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer (read-only + download)" },
  { value: "editor", label: "Editor (create / edit / delete)" },
  { value: "approver", label: "Approver (view + approve only)" },
  { value: "admin", label: "Admin (view all; no create/approve)" },
];

const ROLE_BADGE = {
  admin: "bg-red-500/20 text-red-300 border-red-500/40",
  editor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  approver: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  viewer: "bg-sky-500/20 text-sky-300 border-sky-500/40",
};

function RoleBadge({ role }) {
  const cls = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  const label = OPS_ROLE_OPTIONS.find((o) => o.value === role)?.label || role;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

function HrRoleBadge({ role }) {
  const cls = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  const label = HR_ROLE_OPTIONS.find((o) => o.value === role)?.label || role;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

function PmsRoleBadge({ role }) {
  const cls = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  const label = PMS_ROLE_OPTIONS.find((o) => o.value === role)?.label || role;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

function QhseRoleBadge({ role }) {
  const cls = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  const label = QHSE_ROLE_OPTIONS.find((o) => o.value === role)?.label || role;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <button type="button" className="fixed inset-0 bg-black/60 backdrop-blur-sm border-0 cursor-pointer" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-white/70 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition">
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

export default function AdminPanel() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.operationsRole === "admin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [addForm, setAddForm] = useState({
    employeeId: "",
    employeeName: "",
    email: "",
    password: "",
    operationsRole: "viewer",
    hrRole: "viewer",
    pmsRole: "viewer",
    qhseRole: "viewer",
  });
  const [editForm, setEditForm] = useState({
    employeeName: "",
    email: "",
    employeeId: "",
    operationsRole: "viewer",
    hrRole: "viewer",
    pmsRole: "viewer",
    qhseRole: "viewer",
    isActive: true,
  });
  const [newPassword, setNewPassword] = useState("");

  const clearMessages = () => { setError(""); setSuccess(""); };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();
      const res = await fetch("/api/admin/users/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      clearMessages();
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setSuccess("User created successfully");
      setShowAddModal(false);
      setAddForm({
        employeeId: "",
        employeeName: "",
        email: "",
        password: "",
        operationsRole: "viewer",
        hrRole: "viewer",
        pmsRole: "viewer",
        qhseRole: "viewer",
      });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      employeeName: user.employeeName || "",
      email: user.email || "",
      employeeId: user.employeeId || "",
      operationsRole: user.operationsRole || "viewer",
      hrRole: user.hrRole || "viewer",
      pmsRole: user.pmsRole || "viewer",
      qhseRole: user.qhseRole || "viewer",
      isActive: user.isActive !== false,
    });
    setShowEditModal(true);
    clearMessages();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      clearMessages();
      const res = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      setSuccess("User updated successfully");
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openPasswordChange = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPasswordModal(true);
    clearMessages();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      clearMessages();
      const res = await fetch(`/api/admin/users/${selectedUser._id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setSuccess("Password changed successfully");
      setShowPasswordModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
    clearMessages();
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      clearMessages();
      const res = await fetch(`/api/admin/users/${selectedUser._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setSuccess("User deleted successfully");
      setShowDeleteConfirm(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-5xl mb-4">&#128274;</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-white/60">Only administrators can access user management.</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.employeeName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.employeeId?.toLowerCase().includes(q) ||
      u.operationsRole?.toLowerCase().includes(q) ||
      u.hrRole?.toLowerCase().includes(q) ||
      u.pmsRole?.toLowerCase().includes(q) ||
      u.qhseRole?.toLowerCase().includes(q)
    );
  });

  const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition";
  const labelCls = "block text-sm font-medium text-white/70 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">User Management</h2>
          <p className="text-white/50 text-sm mt-1">
            Manage users, Operations, HR, PMS, and QHSE roles (each module has its own permission matrix).
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); clearMessages(); }}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <span>&#9888;</span> {error}
          <button onClick={() => setError("")} className="ml-auto text-red-300/60 hover:text-red-300">&times;</button>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 flex items-center gap-2">
          <span>&#10003;</span> {success}
          <button onClick={() => setSuccess("")} className="ml-auto text-green-300/60 hover:text-green-300">&times;</button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input
          type="text"
          placeholder="Search by name, email, ID or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} pl-10`}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left font-semibold text-white/80">Employee ID</th>
                <th className="px-4 py-3 text-left font-semibold text-white/80">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-white/80 hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-white/80">Ops Role</th>
                <th className="px-4 py-3 text-left font-semibold text-white/80 hidden lg:table-cell">HR Role</th>
                <th className="px-4 py-3 text-left font-semibold text-white/80 hidden xl:table-cell">PMS Role</th>
                <th className="px-4 py-3 text-left font-semibold text-white/80 hidden xl:table-cell">QHSE Role</th>
                <th className="px-4 py-3 text-center font-semibold text-white/80">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-white/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-white/40">No users found</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-white/70 font-mono text-xs">{u.employeeId}</td>
                    <td className="px-4 py-3 text-white font-medium">{u.employeeName}</td>
                    <td className="px-4 py-3 text-white/60 hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.operationsRole || "viewer"} /></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <HrRoleBadge role={u.hrRole || "viewer"} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <PmsRoleBadge role={u.pmsRole || "viewer"} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <QhseRoleBadge role={u.qhseRole || "viewer"} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${u.isActive !== false ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                        {u.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(u)} title="Edit user" className="rounded-lg border border-amber-400/40 p-1.5 text-amber-300 hover:bg-amber-500/15 transition">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => openPasswordChange(u)} title="Change password" className="rounded-lg border border-sky-400/40 p-1.5 text-sky-300 hover:bg-sky-500/15 transition">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </button>
                        {String(u._id) !== String(currentUser?._id) && (
                          <button onClick={() => openDelete(u)} title="Delete user" className="rounded-lg border border-rose-400/40 p-1.5 text-rose-300 hover:bg-rose-500/15 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-white/30 text-right">
        Total: {filtered.length} user{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Add User Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New User">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className={labelCls}>Employee ID *</label>
            <input type="text" required value={addForm.employeeId} onChange={(e) => setAddForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputCls} placeholder="e.g. EMP001" />
          </div>
          <div>
            <label className={labelCls}>Full Name *</label>
            <input type="text" required value={addForm.employeeName} onChange={(e) => setAddForm((f) => ({ ...f, employeeName: e.target.value }))} className={inputCls} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" required value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="user@oceanemarine.com" />
          </div>
          <div>
            <label className={labelCls}>Password *</label>
            <input type="password" required minLength={4} value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="Min 4 characters" />
          </div>
          <div>
            <label className={labelCls}>Operations Role</label>
            <select value={addForm.operationsRole} onChange={(e) => setAddForm((f) => ({ ...f, operationsRole: e.target.value }))} className={inputCls}>
              {OPS_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>HR Role</label>
            <select value={addForm.hrRole} onChange={(e) => setAddForm((f) => ({ ...f, hrRole: e.target.value }))} className={inputCls}>
              {HR_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>PMS Role</label>
            <select value={addForm.pmsRole} onChange={(e) => setAddForm((f) => ({ ...f, pmsRole: e.target.value }))} className={inputCls}>
              {PMS_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>QHSE Role</label>
            <select value={addForm.qhseRole} onChange={(e) => setAddForm((f) => ({ ...f, qhseRole: e.target.value }))} className={inputCls}>
              {QHSE_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition">Cancel</button>
            <button type="submit" disabled={actionLoading} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition">
              {actionLoading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit – ${selectedUser?.employeeName || ""}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className={labelCls}>Employee ID</label>
            <input type="text" value={editForm.employeeId} onChange={(e) => setEditForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Full Name</label>
            <input type="text" value={editForm.employeeName} onChange={(e) => setEditForm((f) => ({ ...f, employeeName: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Operations Role</label>
            <select value={editForm.operationsRole} onChange={(e) => setEditForm((f) => ({ ...f, operationsRole: e.target.value }))} className={inputCls}>
              {OPS_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>HR Role</label>
            <select value={editForm.hrRole} onChange={(e) => setEditForm((f) => ({ ...f, hrRole: e.target.value }))} className={inputCls}>
              {HR_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>PMS Role</label>
            <select value={editForm.pmsRole} onChange={(e) => setEditForm((f) => ({ ...f, pmsRole: e.target.value }))} className={inputCls}>
              {PMS_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>QHSE Role</label>
            <select value={editForm.qhseRole} onChange={(e) => setEditForm((f) => ({ ...f, qhseRole: e.target.value }))} className={inputCls}>
              {QHSE_ROLE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} className="peer sr-only" />
              <div className="h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-green-500 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition after:content-[''] peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm text-white/70">{editForm.isActive ? "Active" : "Inactive"}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEditModal(false)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition">Cancel</button>
            <button type="submit" disabled={actionLoading} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition">
              {actionLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title={`Change Password – ${selectedUser?.employeeName || ""}`}>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className={labelCls}>New Password *</label>
            <input type="password" required minLength={4} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="Enter new password" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPasswordModal(false)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition">Cancel</button>
            <button type="submit" disabled={actionLoading} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition">
              {actionLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.employeeName}"? This action cannot be undone.`}
        loading={actionLoading}
      />
    </div>
  );
}
