import {
    useState,
    useEffect
} from "react";
import api from "../services/api";

function AddTransaction({
    refresh,
    editingTransaction,
    setEditingTransaction
}) {

    const [type, setType] = useState("expense");
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        if (editingTransaction) {
            setType(editingTransaction.type);
            setCategory(editingTransaction.category);
            setAmount(editingTransaction.amount);
            setDescription(editingTransaction.description);
            setDate(editingTransaction.date || new Date().toISOString().split("T")[0]);
        }
    }, [editingTransaction]);

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem("token");

            if (editingTransaction) {
                await api.put(
                    `/transactions/${editingTransaction._id}`,
                    {
                        type,
                        category,
                        amount: Number(amount),
                        description,
                        date
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            } else {
                await api.post(
                    "/transactions",
                    {
                        type,
                        category,
                        amount: Number(amount),
                        description,
                        date
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            }

            setType("expense");
            setCategory("");
            setAmount("");
            setDescription("");
            setDate(new Date().toISOString().split("T")[0]);

            if (editingTransaction) {
                setEditingTransaction(null);
            }

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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Category"
                    className="w-full p-3 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
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
                        py-3
                        rounded-lg
                        font-semibold
                        transition-all
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
                        onClick={() => {
                            setEditingTransaction(null);
                            setType("expense");
                            setCategory("");
                            setAmount("");
                            setDescription("");
                            setDate(new Date().toISOString().split("T")[0]);
                        }}
                        className="
                            w-1/3
                            py-3
                            bg-slate-800
                            rounded-lg
                            hover:bg-slate-700
                            font-semibold
                            text-slate-300
                            transition-all
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