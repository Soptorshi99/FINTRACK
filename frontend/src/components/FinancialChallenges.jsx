import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

const STATUS_COLORS = {
    completed: "from-emerald-900/60 to-emerald-800/30 border-emerald-700/50",
    active: "from-slate-900 to-slate-800/60 border-slate-700/50",
    expired: "from-slate-900/40 to-slate-900/20 border-slate-800/40",
};

const STATUS_BADGE = {
    completed: "bg-emerald-900/50 text-emerald-400",
    active: "bg-blue-900/50 text-blue-400",
    expired: "bg-slate-800 text-slate-500",
};

function ProgressBar({ value, status }) {
    const color =
        status === "completed" ? "from-emerald-500 to-teal-400" :
        status === "expired"   ? "from-slate-600 to-slate-500" :
                                 "from-violet-500 to-blue-400";
    return (
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
                className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000`}
                style={{ width: `${Math.max(value, 0)}%` }}
            />
        </div>
    );
}

// ── Individual challenge card ──────────────────────────────────────────────────
function ChallengeCard({ template, myChallengeMap, onJoin, onLeave }) {
    const mine = myChallengeMap[template.id];
    const isJoined = !!mine;
    const status = mine?.status || null;
    const progress = mine?.progress ?? 0;

    return (
        <div className={`
            bg-gradient-to-br ${STATUS_COLORS[status] || "from-slate-900 to-slate-800/60 border-slate-700/50"}
            border rounded-2xl p-5 flex flex-col gap-3
            transition-all duration-300 hover:shadow-lg hover:shadow-black/30
        `}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">{template.icon}</span>
                    <div>
                        <h3 className="font-bold text-white text-base leading-tight">{template.title}</h3>
                        {status && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${STATUS_BADGE[status]}`}>
                                {status}
                            </span>
                        )}
                    </div>
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">{template.duration_days}d</span>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 leading-relaxed">{template.description}</p>

            {/* Progress (if joined) */}
            {isJoined && mine && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{mine.detail}</span>
                        <span className="font-semibold text-white">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} status={status} />
                    {status === "completed" && (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mt-1">
                            <span>🎖️</span>
                            <span>{mine.reward}</span>
                        </div>
                    )}
                    {mine.ends_at && status !== "completed" && (
                        <p className="text-[11px] text-slate-500">
                            Ends {new Date(mine.ends_at).toLocaleDateString("en-IN")}
                        </p>
                    )}
                </div>
            )}

            {/* Reward preview (not yet joined) */}
            {!isJoined && (
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <span>🏅</span>
                    <span>Reward: {template.reward}</span>
                </div>
            )}

            {/* Actions */}
            <div className="mt-auto pt-1">
                {!isJoined ? (
                    <button
                        onClick={() => onJoin(template.id)}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all"
                    >
                        Join Challenge
                    </button>
                ) : status === "active" ? (
                    <button
                        onClick={() => onLeave(template.id)}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm font-semibold transition-all"
                    >
                        Leave
                    </button>
                ) : (
                    <button
                        onClick={() => onLeave(template.id)}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-500 text-sm transition-all"
                    >
                        Reset & Rejoin
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Main FinancialChallenges component ────────────────────────────────────────
export default function FinancialChallenges() {
    const [templates, setTemplates] = useState([]);
    const [myChallenges, setMyChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };

    const fetchAll = useCallback(async () => {
        try {
            const [tmplRes, myRes] = await Promise.all([
                api.get("/challenges/templates", authConfig),
                api.get("/challenges/my", authConfig),
            ]);
            setTemplates(tmplRes.data);
            setMyChallenges(myRes.data);
        } catch (e) {
            console.error("Failed to fetch challenges", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Map challenge_id → my progress object for quick lookup
    const myChallengeMap = {};
    myChallenges.forEach((c) => { myChallengeMap[c.challenge_id] = c; });

    const handleJoin = async (id) => {
        try {
            await api.post(`/challenges/${id}/join`, {}, authConfig);
            fetchAll();
        } catch (e) {
            alert(e.response?.data?.detail || "Failed to join challenge");
        }
    };

    const handleLeave = async (id) => {
        try {
            await api.delete(`/challenges/${id}/leave`, authConfig);
            fetchAll();
        } catch (e) {
            alert(e.response?.data?.detail || "Failed to leave challenge");
        }
    };

    const active = myChallenges.filter((c) => c.status === "active");
    const completed = myChallenges.filter((c) => c.status === "completed");

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Hero banner */}
            <div className="bg-gradient-to-br from-violet-900/50 to-blue-900/40 border border-violet-700/40 rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            🎮 Financial Challenges
                        </h2>
                        <p className="text-slate-400 mt-1">Gamify your savings. Complete challenges, earn badges.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-violet-400">{active.length}</p>
                            <p className="text-xs text-slate-500">Active</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-400">{completed.length}</p>
                            <p className="text-xs text-slate-500">Completed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active challenges (if any) */}
            {active.length > 0 && (
                <div>
                    <h3 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        ⚡ In Progress
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {templates
                            .filter((t) => myChallengeMap[t.id]?.status === "active")
                            .map((t) => (
                                <ChallengeCard
                                    key={t.id}
                                    template={t}
                                    myChallengeMap={myChallengeMap}
                                    onJoin={handleJoin}
                                    onLeave={handleLeave}
                                />
                            ))}
                    </div>
                </div>
            )}

            {/* All challenges */}
            <div>
                <h3 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    🏆 All Challenges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.map((t) => (
                        <ChallengeCard
                            key={t.id}
                            template={t}
                            myChallengeMap={myChallengeMap}
                            onJoin={handleJoin}
                            onLeave={handleLeave}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
