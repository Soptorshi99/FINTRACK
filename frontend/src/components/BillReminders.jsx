import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const formatCurrency = (value) => value ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value) : "Amount not set";

const dueStatus = (dueDate, paid) => {
    if (paid) return { label: "Paid", className: "text-emerald-400" };
    const days = Math.ceil((new Date(`${dueDate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, className: "text-rose-400" };
    if (days === 0) return { label: "Due today", className: "text-rose-400" };
    if (days <= 3) return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, className: "text-amber-400" };
    return { label: `Due in ${days} days`, className: "text-slate-400" };
};

function BillReminders({ refreshKey, onBillsChanged }) {
    const [bills, setBills] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: "", due_date: "", amount: "", category: "Bills", notes: "" });
    const token = localStorage.getItem("token");
    const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
    const fetchBills = useCallback(async () => {
        try {
            const response = await api.get("/bill-reminders", authConfig);
            setBills(response.data);
            onBillsChanged(response.data);
        } catch (error) {
            console.error("Failed to fetch bill reminders:", error);
        }
    }, [authConfig, onBillsChanged]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBills();
    }, [fetchBills, refreshKey]);

    const changeForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const saveBill = async (event) => {
        event.preventDefault();
        if (!form.title.trim() || !form.due_date) { alert("Enter a bill name and due date"); return; }
        try {
            await api.post("/bill-reminders", { ...form, title: form.title.trim(), amount: form.amount ? Number(form.amount) : null, notes: form.notes.trim() }, authConfig);
            setForm({ title: "", due_date: "", amount: "", category: "Bills", notes: "" });
            setShowForm(false);
            fetchBills();
        } catch (error) {
            console.error("Failed to save bill reminder:", error);
            alert("Failed to save bill reminder");
        }
    };
    const togglePaid = async (bill) => {
        try { await api.patch(`/bill-reminders/${bill._id}/paid`, { is_paid: !bill.is_paid }, authConfig); fetchBills(); }
        catch (error) { console.error("Failed to update bill reminder:", error); alert("Failed to update bill reminder"); }
    };
    const deleteBill = async (id) => {
        if (!confirm("Delete this bill reminder?")) return;
        try { await api.delete(`/bill-reminders/${id}`, authConfig); fetchBills(); }
        catch (error) { console.error("Failed to delete bill reminder:", error); alert("Failed to delete bill reminder"); }
    };

    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <div><p className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Bills</p><h2 className="text-2xl font-black tracking-tight text-white">Bill reminders</h2></div>
                <button onClick={() => setShowForm((shown) => !shown)} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">{showForm ? "Close" : "Add bill"}</button>
            </div>
            {showForm && <form onSubmit={saveBill} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
                <input value={form.title} onChange={(e) => changeForm("title", e.target.value)} placeholder="Bill name" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-amber-500" />
                <input type="date" value={form.due_date} onChange={(e) => changeForm("due_date", e.target.value)} className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-amber-500" />
                <input type="number" min="1" value={form.amount} onChange={(e) => changeForm("amount", e.target.value)} placeholder="Amount (optional)" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-amber-500" />
                <input value={form.category} onChange={(e) => changeForm("category", e.target.value)} placeholder="Category" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-amber-500" />
                <input value={form.notes} onChange={(e) => changeForm("notes", e.target.value)} placeholder="Optional notes" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-amber-500 md:col-span-2" />
                <button className="rounded-lg bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700 md:col-span-2">Save bill reminder</button>
            </form>}
            <div className="space-y-3">
                {bills.map((bill) => { const status = dueStatus(bill.due_date, bill.is_paid); return <article key={bill._id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"><div><p className={bill.is_paid ? "font-bold text-slate-400 line-through" : "font-bold text-white"}>{bill.title}</p><p className="text-sm text-slate-400">Due {new Date(`${bill.due_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {formatCurrency(bill.amount)}</p>{bill.notes && <p className="mt-1 text-xs text-slate-500">{bill.notes}</p>}</div><div className="flex items-center gap-3"><span className={`text-xs font-bold ${status.className}`}>{status.label}</span><button onClick={() => togglePaid(bill)} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">{bill.is_paid ? "Mark unpaid" : "Mark paid"}</button><button onClick={() => deleteBill(bill._id)} className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900 hover:text-white">Delete</button></div></article>; })}
                {bills.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No bill reminders yet.</div>}
            </div>
        </section>
    );
}

export default BillReminders;
