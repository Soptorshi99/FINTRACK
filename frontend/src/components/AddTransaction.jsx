import {
    useState,
    useEffect,
    useRef
} from "react";
import api from "../services/api";
import AccountSelect from "./AccountSelect";

// ── Default popular categories split by transaction type ──────────────────────
const DEFAULT_CATEGORIES = {
    expense: [
        "Food", "Groceries", "Rent", "Transport", "Fuel",
        "Utilities", "Entertainment", "Shopping", "Healthcare",
        "Education", "Dining", "Subscriptions", "Travel",
        "Clothing", "Insurance", "Repairs", "Gym", "Personal Care",
    ],
    income: [
        "Salary", "Freelance", "Business", "Investment Returns",
        "Rental Income", "Bonus", "Gift", "Refund", "Side Hustle",
        "Dividends", "Interest", "Commission",
    ],
};

// ── Category autocomplete sub-component ──────────────────────────────────────
function CategoryAutocomplete({ value, onChange, type, pastCategories }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Sync when editing an existing transaction
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Build ranked suggestion list: user's past categories first, then defaults
    const buildSuggestions = () => {
        const defaults = DEFAULT_CATEGORIES[type] || DEFAULT_CATEGORIES.expense;
        const pastSet = pastCategories.map((c) => c.toLowerCase());
        const merged = [
            ...pastCategories,
            ...defaults.filter((d) => !pastSet.includes(d.toLowerCase())),
        ];
        if (!query.trim()) return merged;
        return merged.filter((c) =>
            c.toLowerCase().includes(query.trim().toLowerCase())
        );
    };

    const suggestions = buildSuggestions();

    const handleSelect = (cat) => {
        setQuery(cat);
        onChange(cat);
        setOpen(false);
    };

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        onChange(e.target.value);
        setOpen(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") setOpen(false);
    };

    // Top 6 chips — user's favourites or sensible defaults
    const quickPicks = pastCategories.length > 0
        ? pastCategories.slice(0, 6)
        : (DEFAULT_CATEGORIES[type] || DEFAULT_CATEGORIES.expense).slice(0, 6);

    return (
        <div ref={containerRef} className="space-y-2">

            {/* Quick-pick chips */}
            <div className="flex flex-wrap gap-1.5">
                {quickPicks.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => handleSelect(cat)}
                        className={`
                            px-2.5 py-1 rounded-full text-xs font-medium
                            transition-all duration-150 border
                            ${value === cat
                                ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/40"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500 hover:text-white"
                            }
                        `}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Text input + dropdown */}
            <div className="relative">
                <input
                    ref={inputRef}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type or pick a category…"
                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    autoComplete="off"
                />

                {/* Clear button */}
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            onChange("");
                            inputRef.current?.focus();
                            setOpen(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-lg leading-none"
                        tabIndex={-1}
                    >
                        ×
                    </button>
                )}

                {/* Suggestion dropdown */}
                {open && suggestions.length > 0 && (
                    <ul className="
                        absolute z-50 left-0 right-0 mt-1
                        bg-slate-800 border border-slate-700
                        rounded-xl shadow-2xl shadow-black/50
                        max-h-52 overflow-y-auto
                        divide-y divide-slate-700/50
                    ">
                        {suggestions.slice(0, 12).map((cat) => {
                            const isUserCat = pastCategories
                                .map((c) => c.toLowerCase())
                                .includes(cat.toLowerCase());
                            return (
                                <li
                                    key={cat}
                                    onMouseDown={(e) => { e.preventDefault(); handleSelect(cat); }}
                                    className="
                                        flex items-center justify-between
                                        px-4 py-2.5 cursor-pointer
                                        hover:bg-slate-700 transition-colors
                                        text-sm text-white
                                    "
                                >
                                    <span>{cat}</span>
                                    {isUserCat && (
                                        <span className="text-[10px] text-blue-400 bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                                            your fav
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ── Main AddTransaction component ─────────────────────────────────────────────
function AddTransaction({
    refresh,
    editingTransaction,
    setEditingTransaction,
    accountRefreshKey = 0,
    transactions = [],
}) {

    const [type, setType] = useState("expense");
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [accountId, setAccountId] = useState(null);

    useEffect(() => {
        if (editingTransaction) {
            setType(editingTransaction.type);
            setCategory(editingTransaction.category);
            setAmount(editingTransaction.amount);
            setDescription(editingTransaction.description);
            setDate(editingTransaction.date || new Date().toISOString().split("T")[0]);
            setAccountId(editingTransaction.account_id || null);
        }
    }, [editingTransaction]);

    // Rank the user's own past categories by frequency for the current type
    const pastCategories = (() => {
        const freq = {};
        transactions
            .filter((t) => t.type === type)
            .forEach((t) => {
                if (t.category) {
                    const key = t.category.trim();
                    freq[key] = (freq[key] || 0) + 1;
                }
            });
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .map(([cat]) => cat);
    })();

    const resetForm = () => {
        setType("expense");
        setCategory("");
        setAmount("");
        setDescription("");
        setDate(new Date().toISOString().split("T")[0]);
        setAccountId(null);
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem("token");

            if (editingTransaction) {
                await api.put(
                    `/transactions/${editingTransaction._id}`,
                    { type, category, amount: Number(amount), description, date, account_id: accountId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                await api.post(
                    "/transactions",
                    { type, category, amount: Number(amount), description, date, account_id: accountId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            resetForm();
            if (editingTransaction) setEditingTransaction(null);
            refresh();
        } catch (error) {
            console.error(error);
            alert(editingTransaction ? "Failed to save changes" : "Failed to add transaction");
        }
    };

    return (
        <div className="
            bg-slate-900
            rounded-2xl
            p-6
            space-y-4
            mb-8
            border border-slate-800
        ">
            <h2 className="text-2xl font-bold">
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
            </h2>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</label>
                <AccountSelect
                    value={accountId}
                    onChange={setAccountId}
                    refreshKey={accountRefreshKey}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
                <select
                    value={type}
                    onChange={(e) => { setType(e.target.value); setCategory(""); }}
                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Category
                    {pastCategories.length > 0 && (
                        <span className="ml-2 normal-case text-blue-400 font-normal text-[11px]">
                            — your top picks shown first
                        </span>
                    )}
                </label>
                <CategoryAutocomplete
                    value={category}
                    onChange={setCategory}
                    type={type}
                    pastCategories={pastCategories}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex gap-4 pt-2">
                <button
                    onClick={handleSubmit}
                    className={`
                        py-3 rounded-lg font-semibold transition-all
                        ${editingTransaction
                            ? "bg-amber-600 hover:bg-amber-700 w-2/3 text-white"
                            : "bg-blue-600 hover:bg-blue-700 w-full text-white"
                        }
                    `}
                >
                    {editingTransaction ? "Save Changes" : "Add Transaction"}
                </button>

                {editingTransaction && (
                    <button
                        onClick={() => { setEditingTransaction(null); resetForm(); }}
                        className="
                            w-1/3 py-3 bg-slate-800 rounded-lg
                            hover:bg-slate-700 font-semibold
                            text-slate-300 transition-all
                        "
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

export default AddTransaction;
