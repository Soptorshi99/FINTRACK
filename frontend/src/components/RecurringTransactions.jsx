import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AccountSelect from "./AccountSelect";

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value || 0);

function RecurringTransactions({ refreshKey, onTransactionsChanged, accountRefreshKey = 0 }) {
    const [items, setItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [accountId, setAccountId] = useState(null);
    const [form, setForm] = useState({
        title: "",
        type: "expense",
        category: "",
        amount: "",
                day_of_month: "1",
        description: "",
        account_id: null
    });
    const token = localStorage.getItem("token");
    const authConfig = useMemo(() => ({
        headers: { Authorization: `Bearer ${token}` }
    }), [token]);

    const fetchItems = useCallback(async () => {
        try {
            const response = await api.get("/recurring-transactions", authConfig);
            setItems(response.data);
        } catch (error) {
            console.error("Failed to fetch recurring transactions:", error);
        }
    }, [authConfig]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchItems();
    }, [fetchItems, refreshKey]);

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.title.trim() || !form.category.trim() || Number(form.amount) <= 0) {
            alert("Enter a name, category, and valid amount");
            return;
        }

        try {
            setSaving(true);
            await api.post("/recurring-transactions", {
                ...form,
                title: form.title.trim(),
                category: form.category.trim(),
                description: form.description.trim(),
                amount: Number(form.amount),
                day_of_month: Number(form.day_of_month)
                ,account_id: accountId
            }, authConfig);
            setForm({ title: "", type: "expense", category: "", amount: "", day_of_month: "1", description: "" });
            setAccountId(null);
            setShowForm(false);
            await fetchItems();
            onTransactionsChanged();
        } catch (error) {
            console.error("Failed to save recurring transaction:", error);
            alert("Failed to save recurring transaction");
        } finally {
            setSaving(false);
        }
    };

    const removeItem = async (id) => {
        if (!confirm("Delete this recurring rule? Existing transactions will be kept.")) return;
        try {
            await api.delete(`/recurring-transactions/${id}`, authConfig);
            fetchItems();
        } catch (error) {
            console.error("Failed to delete recurring transaction:", error);
            alert("Failed to delete recurring transaction");
        }
    };

    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-violet-300 uppercase tracking-wider">Recurring</p>
                    <h2 className="text-2xl font-black tracking-tight text-white">Monthly transactions</h2>
                </div>
                <button onClick={() => setShowForm((shown) => !shown)} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm font-semibold text-white transition">
                    {showForm ? "Close" : "Add recurring"}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
                    <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Name, e.g. Netflix" className="w-full rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-violet-500" />
                    <select value={form.type} onChange={(event) => updateForm("type", event.target.value)} className="w-full rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                    <input value={form.category} onChange={(event) => updateForm("category", event.target.value)} placeholder="Category" className="w-full rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-violet-500" />
                    <input type="number" min="1" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} placeholder="Amount" className="w-full rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-violet-500" />
                    <input type="number" min="1" max="31" value={form.day_of_month} onChange={(event) => updateForm("day_of_month", event.target.value)} placeholder="Day of month" className="w-full rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-violet-500" />
                    <input value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Optional description" className="w-full rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-violet-500" />
                    <AccountSelect value={accountId} onChange={setAccountId} refreshKey={accountRefreshKey} />
                    <button type="submit" disabled={saving} className="md:col-span-2 rounded-lg bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                        {saving ? "Saving..." : "Save recurring transaction"}
                    </button>
                </form>
            )}

            <div className="space-y-3">
                {items.map((item) => (
                    <article key={item._id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <div>
                            <p className="font-bold text-white">{item.title}</p>
                            <p className="text-sm text-slate-400">{item.category} · Every {item.day_of_month}{item.day_of_month === 1 ? "st" : item.day_of_month === 2 ? "nd" : item.day_of_month === 3 ? "rd" : "th"}</p>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                            <p className={item.type === "income" ? "font-bold text-emerald-400" : "font-bold text-rose-400"}>{item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}</p>
                            <button onClick={() => removeItem(item._id)} className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900 hover:text-white">Delete</button>
                        </div>
                    </article>
                ))}
                {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No recurring transactions yet.</div>}
            </div>
        </section>
    );
}

export default RecurringTransactions;
