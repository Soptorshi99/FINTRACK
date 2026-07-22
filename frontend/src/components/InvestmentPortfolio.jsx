import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const TYPES = ["Stocks", "Mutual Funds", "Gold", "FD", "Other"];
const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const blankForm = { name: "", asset_type: "Stocks", invested_amount: "", current_value: "", notes: "" };

function InvestmentPortfolio() {
    const [investments, setInvestments] = useState([]);
    const [form, setForm] = useState(blankForm);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const token = localStorage.getItem("token");
    const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
    const fetchInvestments = useCallback(async () => {
        try { const response = await api.get("/investments", authConfig); setInvestments(response.data); }
        catch (error) { console.error("Failed to fetch investments:", error); }
    }, [authConfig]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInvestments();
    }, [fetchInvestments]);

    const totals = useMemo(() => {
        const invested = investments.reduce((sum, item) => sum + Number(item.invested_amount || 0), 0);
        const value = investments.reduce((sum, item) => sum + Number(item.current_value || 0), 0);
        return { invested, value, profit: value - invested };
    }, [investments]);
    const allocations = useMemo(() => TYPES.map((type) => {
        const value = investments.filter((item) => item.asset_type === type).reduce((sum, item) => sum + Number(item.current_value || 0), 0);
        return { type, value, percent: totals.value ? (value / totals.value) * 100 : 0 };
    }).filter((item) => item.value > 0), [investments, totals.value]);
    const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const resetForm = () => { setForm(blankForm); setEditingId(null); setShowForm(false); };
    const saveInvestment = async (event) => {
        event.preventDefault();
        if (!form.name.trim() || Number(form.invested_amount) <= 0 || Number(form.current_value) < 0) { alert("Enter a name, invested amount, and current value"); return; }
        const payload = { ...form, name: form.name.trim(), notes: form.notes.trim(), invested_amount: Number(form.invested_amount), current_value: Number(form.current_value) };
        try {
            if (editingId) await api.put(`/investments/${editingId}`, payload, authConfig);
            else await api.post("/investments", payload, authConfig);
            resetForm(); fetchInvestments();
        } catch (error) { console.error("Failed to save investment:", error); alert("Failed to save investment"); }
    };
    const editInvestment = (item) => { setEditingId(item._id); setForm({ name: item.name, asset_type: item.asset_type, invested_amount: item.invested_amount, current_value: item.current_value, notes: item.notes || "" }); setShowForm(true); };
    const deleteInvestment = async (id) => { if (!confirm("Delete this investment?")) return; try { await api.delete(`/investments/${id}`, authConfig); fetchInvestments(); } catch (error) { console.error("Failed to delete investment:", error); alert("Failed to delete investment"); } };

    return <section className="space-y-5">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Investments</p><h2 className="text-2xl font-black tracking-tight text-white">Portfolio</h2></div><button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">{showForm ? "Close" : "Add investment"}</button></div>
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Current value</p><p className="mt-1 text-xl font-black text-white">{currency(totals.value)}</p></div><div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Invested</p><p className="mt-1 text-xl font-black text-white">{currency(totals.invested)}</p></div><div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Profit / loss</p><p className={`mt-1 text-xl font-black ${totals.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{totals.profit >= 0 ? "+" : ""}{currency(totals.profit)}</p></div></div>
        {allocations.length > 0 && <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3"><p className="text-sm font-bold text-white">Allocation by current value</p>{allocations.map((item) => <div key={item.type}><div className="mb-1 flex justify-between text-xs"><span className="text-slate-300">{item.type}</span><span className="text-slate-400">{currency(item.value)} · {Math.round(item.percent)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${item.percent}%` }} /></div></div>)}</div>}
        {showForm && <form onSubmit={saveInvestment} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2"><input value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="Investment name" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500" /><select value={form.asset_type} onChange={(e) => change("asset_type", e.target.value)} className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500">{TYPES.map((type) => <option key={type}>{type}</option>)}</select><input type="number" min="1" value={form.invested_amount} onChange={(e) => change("invested_amount", e.target.value)} placeholder="Invested amount" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500" /><input type="number" min="0" value={form.current_value} onChange={(e) => change("current_value", e.target.value)} placeholder="Current value" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500" /><input value={form.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Optional notes" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500 md:col-span-2" /><button className="rounded-lg bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-700 md:col-span-2">{editingId ? "Update investment" : "Save investment"}</button></form>}
        <div className="space-y-3">{investments.map((item) => <article key={item._id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"><div><p className="font-bold text-white">{item.name}</p><p className="text-sm text-slate-400">{item.asset_type} · Invested {currency(item.invested_amount)}</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="font-bold text-white">{currency(item.current_value)}</p><p className={`text-xs font-semibold ${item.profit_loss >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{item.profit_loss >= 0 ? "+" : ""}{currency(item.profit_loss)} ({item.return_percent}%)</p></div><button onClick={() => editInvestment(item)} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">Edit</button><button onClick={() => deleteInvestment(item._id)} className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900 hover:text-white">Delete</button></div></article>)}{investments.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No investments added yet.</div>}</div>
    </section>;
}

export default InvestmentPortfolio;
