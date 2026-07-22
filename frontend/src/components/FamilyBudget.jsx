import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

const fmt = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

const MEMBER_COLORS = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500"];

function MemberAvatar({ name, color, isCreator }) {
    const initials = name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm shadow-lg relative`}>
                {initials}
                {isCreator && (
                    <span className="absolute -top-1 -right-1 text-xs">👑</span>
                )}
            </div>
            <p className="text-xs text-slate-300 max-w-[56px] truncate text-center">{name}</p>
        </div>
    );
}

// ── Create Family Form ────────────────────────────────────────────────────────
function CreateFamily({ onCreated }) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.post(
                "/family/create",
                { name: name.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onCreated(res.data);
        } catch (e) {
            alert(e.response?.data?.detail || "Failed to create family");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Family group name (e.g. The Sharma Family)"
                className="w-full p-3 rounded-lg bg-slate-800 text-white border border-slate-700 outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all disabled:opacity-50"
            >
                {loading ? "Creating…" : "Create Family Group"}
            </button>
        </div>
    );
}

// ── Join Family Form ──────────────────────────────────────────────────────────
function JoinFamily({ onJoined }) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!code.trim()) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await api.post(
                "/family/join",
                { invite_code: code.trim().toUpperCase() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onJoined();
        } catch (e) {
            alert(e.response?.data?.detail || "Invalid invite code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code (e.g. A3F2B9C1)"
                className="w-full p-3 rounded-lg bg-slate-800 text-white border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
                maxLength={8}
            />
            <button
                onClick={handleJoin}
                disabled={loading || code.trim().length < 6}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50"
            >
                {loading ? "Joining…" : "Join with Code"}
            </button>
        </div>
    );
}

// ── Main FamilyBudget component ───────────────────────────────────────────────
export default function FamilyBudget() {
    const [family, setFamily] = useState(null);
    const [sharedData, setSharedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("create"); // 'create' | 'join'
    const [copied, setCopied] = useState(false);

    const token = localStorage.getItem("token");
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };

    const fetchFamily = useCallback(async () => {
        try {
            const res = await api.get("/family", authConfig);
            setFamily(res.data);
            if (res.data) {
                const txRes = await api.get("/family/shared-transactions", authConfig);
                setSharedData(txRes.data);
            }
        } catch (e) {
            console.error("Family fetch error", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFamily(); }, [fetchFamily]);

    const handleLeave = async () => {
        if (!confirm("Leave this family group?")) return;
        try {
            await api.delete("/family/leave", authConfig);
            setFamily(null);
            setSharedData(null);
        } catch (e) {
            alert(e.response?.data?.detail || "Cannot leave family");
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(family.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const maxContrib = Math.max(...(sharedData?.contributions?.map((c) => c.total) || [1]));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // ── Not in a family yet ───────────────────────────────────────────────────
    if (!family) {
        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-violet-900/50 to-blue-900/40 border border-violet-700/40 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">👨‍👩‍👧 Shared Family Budget</h2>
                    <p className="text-slate-400 mt-1">Pool household expenses with your family. See who spends what.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md">
                    {/* Tab switcher */}
                    <div className="flex gap-2 mb-5 bg-slate-800 rounded-xl p-1">
                        {["create", "join"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                                    tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                                }`}
                            >
                                {t === "create" ? "🆕 Create" : "🔑 Join"} Group
                            </button>
                        ))}
                    </div>
                    {tab === "create" ? (
                        <CreateFamily onCreated={() => fetchFamily()} />
                    ) : (
                        <JoinFamily onJoined={() => fetchFamily()} />
                    )}
                </div>
            </div>
        );
    }

    // ── In a family ──────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-900/50 to-blue-900/40 border border-violet-700/40 rounded-2xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            👨‍👩‍👧 {family.name}
                        </h2>
                        <p className="text-slate-400 mt-1 text-sm">Shared household expense pool</p>
                    </div>
                    <button
                        onClick={handleLeave}
                        className="px-4 py-2 text-sm bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 hover:border-red-800 transition-all"
                    >
                        Leave Group
                    </button>
                </div>

                {/* Invite Code */}
                <div className="mt-4 flex items-center gap-3 bg-black/30 rounded-xl px-4 py-3 w-fit">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Invite Code</p>
                        <p className="text-xl font-mono font-bold text-white tracking-widest">{family.invite_code}</p>
                    </div>
                    <button
                        onClick={copyCode}
                        className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                            copied ? "bg-emerald-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                        }`}
                    >
                        {copied ? "✓ Copied" : "Copy"}
                    </button>
                </div>
            </div>

            {/* Members */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-slate-300 mb-4">👥 Members</h3>
                <div className="flex flex-wrap gap-6">
                    {family.members.map((m, i) => (
                        <MemberAvatar
                            key={m.id}
                            name={m.name}
                            color={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                            isCreator={m.is_creator}
                        />
                    ))}
                </div>
            </div>

            {/* Contributions */}
            {sharedData?.contributions?.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-slate-300 mb-4">💸 Shared Expense Contributions</h3>
                    <div className="space-y-4">
                        {sharedData.contributions.map((c, i) => {
                            const pct = maxContrib > 0 ? (c.total / maxContrib) * 100 : 0;
                            return (
                                <div key={c.name} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-white">{c.name}</span>
                                        <span className="text-slate-400">{fmt(c.total)}</span>
                                    </div>
                                    <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${MEMBER_COLORS[i % MEMBER_COLORS.length]} opacity-80 transition-all duration-1000`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        Shared categories: {sharedData.shared_categories.join(", ")}
                    </p>
                </div>
            )}

            {/* Shared Transactions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-slate-300 mb-4">📋 Recent Shared Expenses</h3>
                {sharedData?.transactions?.length === 0 ? (
                    <p className="text-slate-500 text-sm">No shared expenses yet. Transactions in shared categories will appear here.</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {sharedData?.transactions?.slice(0, 30).map((tx) => {
                            const memberIdx = family.members.findIndex((m) => m.id === tx.user_id);
                            const color = MEMBER_COLORS[memberIdx >= 0 ? memberIdx % MEMBER_COLORS.length : 0];
                            return (
                                <div key={tx._id} className="flex items-center justify-between py-2.5 border-b border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                            {tx.member_name?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{tx.category}</p>
                                            <p className="text-xs text-slate-500">{tx.member_name} · {tx.date}</p>
                                        </div>
                                    </div>
                                    <span className="text-red-400 font-semibold text-sm">-{fmt(tx.amount)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
