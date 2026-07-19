import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import api from "../services/api";

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value || 0);

const getAsciiProgressBar = (progress) => {
    const totalBlocks = 10;
    const filledBlocks = Math.min(Math.max(Math.round((progress / 100) * totalBlocks), 0), totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
};

const QUICK_EMOJIS = ["💻", "✈️", "🏠", "🚗", "🎓", "💰", "🎁", "🏥"];

function SavingsGoals({ refreshKey }) {
    const [goals, setGoals] = useState([]);
    const [title, setTitle] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [deadline, setDeadline] = useState("");
    const [loading, setLoading] = useState(false);

    // Contribution state per goal
    const [contributionAmounts, setContributionAmounts] = useState({});
    
    // Editing state
    const [editingGoalId, setEditingGoalId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editTargetAmount, setEditTargetAmount] = useState("");
    const [editCurrentAmount, setEditCurrentAmount] = useState("");
    const [editDeadline, setEditDeadline] = useState("");

    const token = localStorage.getItem("token");

    const authConfig = useMemo(
        () => ({
            headers: {
                Authorization: `Bearer ${token}`
            }
        }),
        [token]
    );

    const fetchGoals = useCallback(async () => {
        try {
            const response = await api.get("/goals", authConfig);
            setGoals(response.data);
        } catch (error) {
            console.error("Failed to fetch goals:", error);
        }
    }, [authConfig]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals, refreshKey]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!title.trim() || Number(targetAmount) <= 0) {
            alert("Please enter a goal title and target amount");
            return;
        }

        try {
            setLoading(true);
            await api.post(
                "/goals",
                {
                    title: title.trim(),
                    target_amount: Number(targetAmount),
                    current_amount: Number(currentAmount) || 0,
                    deadline: deadline || null
                },
                authConfig
            );

            // Reset form
            setTitle("");
            setTargetAmount("");
            setCurrentAmount("");
            setDeadline("");
            fetchGoals();
        } catch (error) {
            console.error("Failed to create goal:", error);
            alert("Failed to save goal");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickContribution = async (goalId, goal) => {
        const amountToAdd = Number(contributionAmounts[goalId]);
        if (!amountToAdd || amountToAdd <= 0) {
            alert("Please enter a valid amount to contribute");
            return;
        }

        const newCurrentAmount = Number(goal.current_amount || 0) + amountToAdd;
        try {
            await api.put(
                `/goals/${goalId}`,
                {
                    current_amount: newCurrentAmount
                },
                authConfig
            );

            // Clear input for this goal
            setContributionAmounts(prev => ({ ...prev, [goalId]: "" }));
            fetchGoals();
        } catch (error) {
            console.error("Failed to save contribution:", error);
            alert("Failed to add contribution");
        }
    };

    const startEditing = (goal) => {
        setEditingGoalId(goal._id);
        setEditTitle(goal.title);
        setEditTargetAmount(goal.target_amount);
        setEditCurrentAmount(goal.current_amount);
        setEditDeadline(goal.deadline || "");
    };

    const cancelEditing = () => {
        setEditingGoalId(null);
    };

    const handleUpdate = async (goalId) => {
        if (!editTitle.trim() || Number(editTargetAmount) <= 0) {
            alert("Please enter a goal title and target amount");
            return;
        }

        try {
            await api.put(
                `/goals/${goalId}`,
                {
                    title: editTitle.trim(),
                    target_amount: Number(editTargetAmount),
                    current_amount: Number(editCurrentAmount) || 0,
                    deadline: editDeadline || null
                },
                authConfig
            );
            setEditingGoalId(null);
            fetchGoals();
        } catch (error) {
            console.error("Failed to update goal:", error);
            alert("Failed to update goal");
        }
    };

    const handleDelete = async (goalId) => {
        if (!confirm("Are you sure you want to delete this savings goal?")) {
            return;
        }

        try {
            await api.delete(`/goals/${goalId}`, authConfig);
            fetchGoals();
        } catch (error) {
            console.error("Failed to delete goal:", error);
            alert("Failed to delete goal");
        }
    };

    const addEmojiToTitle = (emoji) => {
        setTitle(prev => {
            // Remove any starting emoji if already present or just prepend
            return `${emoji} ${prev}`;
        });
    };

    const addEmojiToEditTitle = (emoji) => {
        setEditTitle(prev => `${emoji} ${prev}`);
    };

    const [showForm, setShowForm] = useState(false);

    return (
        <section className="mb-8 space-y-5">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                        Savings Goals
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                        Savings Goals ⭐
                    </h2>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="
                        px-4
                        py-2
                        bg-emerald-600
                        hover:bg-emerald-700
                        text-white
                        text-sm
                        font-semibold
                        rounded-lg
                        transition
                    "
                >
                    {showForm ? "✕ Close" : "+ New Goal"}
                </button>
            </div>

            {/* Create Goal Form */}
            {showForm && (
                <div className="bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-800 mb-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Title input & emoji helpers */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Goal Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Buy a Laptop"
                                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                                {/* Quick Emoji Helper */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {QUICK_EMOJIS.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => addEmojiToTitle(emoji)}
                                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm transition"
                                            title={`Prepend ${emoji}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target Amount */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Target Amount (₹)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={targetAmount}
                                    onChange={(e) => setTargetAmount(e.target.value)}
                                    placeholder="80000"
                                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            {/* Current Saved */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Current Saved (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={currentAmount}
                                    onChange={(e) => setCurrentAmount(e.target.value)}
                                    placeholder="32500"
                                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Target Deadline */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase">Target Deadline</label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 rounded-lg font-bold text-white hover:bg-emerald-500 disabled:opacity-60 transition shadow-lg shadow-emerald-900/20"
                        >
                            {loading ? "Adding..." : "+ Create Savings Goal"}
                        </button>
                    </form>
                </div>
            )}

            {/* Goals Display Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {goals.map((goal) => {
                    const target = Number(goal.target_amount || 0);
                    const current = Number(goal.current_amount || 0);
                    const progress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
                    const isEditing = editingGoalId === goal._id;

                    return (
                        <article
                            key={goal._id}
                            className="bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                        >
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-white">Edit Goal</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdate(goal._id)}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <label className="text-xs text-slate-400">Title</label>
                                            <input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="w-full p-2 rounded bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                            {/* Quick Emojis for Editing */}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {QUICK_EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => addEmojiToEditTitle(emoji)}
                                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-705 text-xs transition"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Target Amount</label>
                                            <input
                                                type="number"
                                                value={editTargetAmount}
                                                onChange={(e) => setEditTargetAmount(e.target.value)}
                                                className="w-full p-2 rounded bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Saved Amount</label>
                                            <input
                                                type="number"
                                                value={editCurrentAmount}
                                                onChange={(e) => setEditCurrentAmount(e.target.value)}
                                                className="w-full p-2 rounded bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Deadline</label>
                                            <input
                                                type="date"
                                                value={editDeadline}
                                                onChange={(e) => setEditDeadline(e.target.value)}
                                                className="w-full p-2 rounded bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                                {goal.title}
                                            </h3>
                                            {goal.deadline && (
                                                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-800">
                                                    Target: {goal.deadline}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEditing(goal)}
                                                className="p-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(goal._id)}
                                                className="p-1 px-2.5 rounded-lg bg-red-950/40 border border-red-900/35 hover:bg-red-900 text-red-300 hover:text-white text-xs font-semibold transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {/* Target and Saved Progress Info */}
                                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Target</p>
                                            <p className="text-base font-extrabold text-slate-200">{formatCurrency(target)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Saved</p>
                                            <p className="text-base font-extrabold text-emerald-400">{formatCurrency(current)}</p>
                                        </div>
                                    </div>

                                    {/* Progress Visuals */}
                                    <div className="space-y-2">
                                        {/* Graphical Bar */}
                                        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-550 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        
                                        {/* ASCII Display & Percentage */}
                                        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                                            <span className="tracking-widest">
                                                {getAsciiProgressBar(progress)}
                                            </span>
                                            <span className="font-extrabold text-emerald-400">
                                                {progress}% ({formatCurrency(current)} / {formatCurrency(target)})
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Contribution form on each card */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Contribute (₹)"
                                            value={contributionAmounts[goal._id] || ""}
                                            onChange={(e) => setContributionAmounts(prev => ({
                                                ...prev,
                                                [goal._id]: e.target.value
                                            }))}
                                            className="w-full p-2 text-xs rounded-lg bg-slate-950 text-slate-200 border border-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        <button
                                            onClick={() => handleQuickContribution(goal._id, goal)}
                                            className="px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition whitespace-nowrap"
                                        >
                                            + Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>

            {goals.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
                    <p className="text-lg font-semibold">No savings goals yet 🌟</p>
                    <p className="text-sm mt-1 text-slate-500">Create one above to begin your savings journey.</p>
                </div>
            )}
        </section>
    );
}

export default SavingsGoals;
