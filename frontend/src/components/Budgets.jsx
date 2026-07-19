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

const currentMonth = () =>
    new Date().toISOString().slice(0, 7);

const getAsciiProgressBar = (progress) => {
    const totalBlocks = 10;
    const filledBlocks = Math.min(Math.max(Math.round((progress / 100) * totalBlocks), 0), totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
};

function Budgets({ refreshKey }) {
    const [budgets, setBudgets] = useState([]);
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [month, setMonth] = useState(currentMonth());
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem("token");

    const authConfig = useMemo(
        () => ({
            headers: {
                Authorization: `Bearer ${token}`
            }
        }),
        [token]
    );

    const fetchBudgets = useCallback(async () => {
        try {
            const response = await api.get(
                "/budgets",
                authConfig
            );

            setBudgets(response.data);
        } catch (error) {
            console.error(error);
        }
    }, [authConfig]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBudgets();
    }, [fetchBudgets, refreshKey]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!category.trim() || Number(amount) <= 0) {
            alert("Enter a category and budget amount");
            return;
        }

        try {
            setLoading(true);

            await api.post(
                "/budgets",
                {
                    category: category.trim(),
                    amount: Number(amount),
                    month
                },
                authConfig
            );

            setCategory("");
            setAmount("");
            fetchBudgets();
        } catch (error) {
            console.error(error);
            alert("Failed to save budget");
        } finally {
            setLoading(false);
        }
    };

    const deleteBudget = async (id) => {
        try {
            await api.delete(
                `/budgets/${id}`,
                authConfig
            );

            fetchBudgets();
        } catch (error) {
            console.error(error);
            alert("Failed to delete budget");
        }
    };

    const [showForm, setShowForm] = useState(false);

    return (
        <section className="mb-8 space-y-5">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <p className="
                        text-sm
                        font-semibold
                        text-blue-300
                        uppercase
                    ">
                        Budgets
                    </p>

                    <h2 className="text-2xl font-black tracking-tight text-white">
                        Budget Progress
                    </h2>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="
                        px-4
                        py-2
                        bg-blue-600
                        hover:bg-blue-700
                        text-white
                        text-sm
                        font-semibold
                        rounded-lg
                        transition
                    "
                >
                    {showForm ? "✕ Close" : "+ Set Budget"}
                </button>
            </div>

            {showForm && (
                <div className="
                    bg-slate-900
                    rounded-2xl
                    p-6
                    space-y-4
                    border border-slate-800
                    mb-6
                ">
                    <form
                        onSubmit={handleSubmit}
                        className="
                            grid
                            gap-3
                            md:grid-cols-[1fr_160px_160px_auto]
                        "
                    >
                        <input
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value)
                            }
                            placeholder="Category"
                            className="
                                w-full
                                p-3
                                rounded-lg
                                bg-slate-800
                                outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                        <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(event) =>
                                setAmount(event.target.value)
                            }
                            placeholder="Budget"
                            className="
                                w-full
                                p-3
                                rounded-lg
                                bg-slate-800
                                outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                        <input
                            type="month"
                            value={month}
                            onChange={(event) =>
                                setMonth(event.target.value)
                            }
                            className="
                                w-full
                                p-3
                                rounded-lg
                                bg-slate-800
                                outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="
                                px-5
                                py-3
                                bg-blue-600
                                rounded-lg
                                font-semibold
                                hover:bg-blue-700
                                disabled:opacity-60
                            "
                        >
                            {loading ? "Saving" : "Set Budget"}
                        </button>
                    </form>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                {budgets.map((budget) => {
                    const spent = Number(budget.spent || 0);
                    const total = Number(budget.amount || 0);
                    const remaining = Number(budget.remaining || 0);
                    const progress = Number(budget.progress || 0);
                    const isOverBudget = spent > total;

                    return (
                        <article
                            key={budget._id}
                            className="
                                bg-slate-900
                                rounded-xl
                                p-5
                                space-y-4
                                border border-slate-800
                                hover:border-slate-700
                                transition
                            "
                        >
                            <div className="
                                flex
                                items-start
                                justify-between
                                gap-4
                            ">
                                <div>
                                    <p className="
                                        text-xl
                                        font-bold
                                    ">
                                        {budget.category}
                                    </p>

                                    <p className="
                                        text-sm
                                        text-slate-400
                                    ">
                                        {budget.month}
                                    </p>
                                </div>

                                <button
                                    onClick={() =>
                                        deleteBudget(budget._id)
                                    }
                                    className="
                                        px-3
                                        py-1
                                        rounded-lg
                                        bg-red-950/40
                                        border border-red-900/35
                                        text-red-300
                                        text-sm
                                        font-semibold
                                        hover:bg-red-900
                                        hover:text-white
                                        transition
                                    "
                                >
                                    Delete
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="
                                    h-3
                                    overflow-hidden
                                    rounded-full
                                    bg-slate-800
                                ">
                                    <div
                                        className={
                                            isOverBudget
                                                ? "h-full bg-red-500"
                                                : "h-full bg-emerald-500"
                                        }
                                        style={{
                                            width: `${Math.min(
                                                progress,
                                                100
                                            )}%`
                                        }}
                                    />
                                </div>
                                
                                <div className="flex justify-between items-center text-xs font-mono text-slate-400 pt-1">
                                    <span className="tracking-widest">
                                        {getAsciiProgressBar(progress)}
                                    </span>
                                    <span className={isOverBudget ? "font-extrabold text-red-400" : "font-extrabold text-emerald-400"}>
                                        {formatCurrency(spent)} / {formatCurrency(total)} ({Math.round(progress)}%)
                                    </span>
                                </div>
                            </div>

                            <div className="
                                flex
                                justify-between
                                gap-4
                                text-sm
                                border-t border-slate-850
                                pt-2
                            ">
                                <span className="text-slate-400">
                                    Remaining
                                </span>

                                <span
                                    className={
                                        isOverBudget
                                            ? "font-bold text-red-400"
                                            : "font-bold text-emerald-400"
                                    }
                                >
                                    {formatCurrency(remaining)}
                                </span>
                            </div>
                        </article>
                    );
                })}
            </div>

            {budgets.length === 0 && (
                <div className="
                    rounded-xl
                    border
                    border-dashed
                    border-slate-700
                    p-6
                    text-center
                    text-slate-400
                ">
                    No budgets yet. Set one above to track monthly spending.
                </div>
            )}
        </section>
    );
}

export default Budgets;
