import { useEffect, useState, useCallback } from "react";
import api from "../services/api";

const fmt = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 ${color}`} />
            <span className="text-3xl">{icon}</span>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold ${color.replace("bg-", "text-")}`}>{value}</p>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
    );
}

// ── Category Bar ──────────────────────────────────────────────────────────────
function CategoryBar({ category, count, max }) {
    const pct = max > 0 ? (count / max) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 w-28 truncate">{category}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
        </div>
    );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted }) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const confirmed = input.trim().toLowerCase() === user.email.toLowerCase();

    const handleDelete = async () => {
        if (!confirmed) return;
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            await api.delete(`/auth/admin/users/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { confirm_email: input.trim() },
            });
            onDeleted(user.id);
            onClose();
        } catch (e) {
            setError(e.response?.data?.detail || "Deletion failed");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-red-900/60 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">⚠️</span>
                    <div>
                        <h2 className="text-xl font-bold text-white">Delete User</h2>
                        <p className="text-xs text-slate-400">This will permanently delete all their data.</p>
                    </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 mb-4 text-sm text-slate-300">
                    <p><span className="text-slate-500">Name:</span> {user.name}</p>
                    <p><span className="text-slate-500">Email:</span> {user.email}</p>
                    <p><span className="text-slate-500">Transactions:</span> {user.transaction_count}</p>
                </div>
                <p className="text-sm text-slate-400 mb-2">
                    Type <span className="font-mono text-red-400 font-semibold">{user.email}</span> to confirm:
                </p>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="user@email.com"
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-red-500 mb-3"
                />
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <div className="flex gap-3">
                    <button
                        onClick={handleDelete}
                        disabled={!confirmed || loading}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                            confirmed
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                    >
                        {loading ? "Deleting…" : "Permanently Delete"}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);

    const token = localStorage.getItem("token");
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get("/auth/admin/stats", authHeader);
            setStats(res.data);
        } catch {
            alert("Failed to load admin stats. Make sure you are logged in as admin.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handleUserDeleted = (userId) => {
        setStats((prev) => ({
            ...prev,
            users: prev.users.filter((u) => u.id !== userId),
            total_users: prev.total_users - 1,
        }));
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        window.location.href = "/login";
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.put(`/auth/admin/users/${userId}/role`, { role: newRole }, authHeader);
            setStats((prev) => ({
                ...prev,
                users: prev.users.map((u) => u.id === userId ? { ...u, role: newRole } : u),
            }));
        } catch {
            alert("Failed to update role");
        }
    };

    const filteredUsers = stats?.users?.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const maxCatCount = stats?.popular_categories?.[0]?.count || 1;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading admin data…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                        <h1 className="text-lg font-bold text-white">FinTrack Admin Profile</h1>
                        <p className="text-xs text-slate-400">User Database & Overall User Statistics</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all font-semibold"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* Section Header: Overall User Statistics */}
                <div className="border-b border-slate-800 pb-3">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        📊 Overall User Statistics
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">Platform-wide activity metrics across all registered accounts.</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Users" value={stats?.total_users ?? 0} icon="👥" color="bg-violet-500" sub="Registered accounts" />
                    <StatCard label="Transactions" value={(stats?.total_transactions ?? 0).toLocaleString("en-IN")} icon="📊" color="bg-blue-500" sub="All time" />
                    <StatCard label="Total Income" value={fmt(stats?.total_income)} icon="💚" color="bg-emerald-500" sub="Platform-wide" />
                    <StatCard label="Total Expense" value={fmt(stats?.total_expense)} icon="🔴" color="bg-red-500" sub="Platform-wide" />
                </div>

                {/* Popular Categories */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                        <span>🏆</span> Popular Categories (Platform-Wide)
                    </h2>
                    <div className="space-y-3">
                        {stats?.popular_categories?.map((item) => (
                            <CategoryBar
                                key={item.category}
                                category={item.category}
                                count={item.count}
                                max={maxCatCount}
                            />
                        ))}
                        {!stats?.popular_categories?.length && (
                            <p className="text-slate-500 text-sm">No transaction data yet.</p>
                        )}
                    </div>
                </div>

                {/* Section Header & Table: User Database */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span>🗃️</span> User Database Directory
                            </h2>
                            <p className="text-slate-400 text-xs mt-0.5">Manage registered users, update roles, or purge user accounts.</p>
                        </div>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm outline-none focus:ring-2 focus:ring-violet-500 w-64"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 border-b border-slate-800">
                                    <th className="pb-3 pr-4">Name</th>
                                    <th className="pb-3 pr-4">Email</th>
                                    <th className="pb-3 pr-4">Role</th>
                                    <th className="pb-3 pr-4">Txns</th>
                                    <th className="pb-3 pr-4">Total Spent</th>
                                    <th className="pb-3 pr-4">Verified</th>
                                    <th className="pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-3 pr-4 font-medium text-white">{user.name}</td>
                                        <td className="py-3 pr-4 text-slate-400">{user.email}</td>
                                        <td className="py-3 pr-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded-full border bg-slate-800 outline-none cursor-pointer ${
                                                    user.role === "admin"
                                                        ? "text-violet-400 border-violet-700"
                                                        : "text-slate-300 border-slate-700"
                                                }`}
                                            >
                                                <option value="user">user</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-300">{user.transaction_count}</td>
                                        <td className="py-3 pr-4 text-slate-300">{fmt(user.total_spent)}</td>
                                        <td className="py-3 pr-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                user.is_verified
                                                    ? "bg-emerald-900/50 text-emerald-400"
                                                    : "bg-slate-800 text-slate-500"
                                            }`}>
                                                {user.is_verified ? "✓ verified" : "unverified"}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <button
                                                onClick={() => setDeleteTarget(user)}
                                                className="px-3 py-1 text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded-lg transition-all border border-red-900/50"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-500">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {deleteTarget && (
                <DeleteModal
                    user={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={handleUserDeleted}
                />
            )}
        </div>
    );
}
