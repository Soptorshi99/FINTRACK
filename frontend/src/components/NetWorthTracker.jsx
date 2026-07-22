import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function NetWorthTracker({ refreshKey }) {
    const [data, setData] = useState(null);
    const token = localStorage.getItem("token");
    const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
    const fetchNetWorth = useCallback(async () => { try { const response = await api.get("/net-worth", authConfig); setData(response.data); } catch (error) { console.error("Failed to fetch net worth:", error); } }, [authConfig]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchNetWorth();
    }, [fetchNetWorth, refreshKey]);
    if (!data) return <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Loading net worth...</section>;
    const groups = [["Cash", data.assets.cash], ["Bank", data.assets.bank], ["Investments", data.assets.investments], ["Other accounts", data.assets.other_accounts]];
    const history = data.history || [];
    const maxValue = Math.max(...history.map((item) => Number(item.net_worth || 0)), 1);
    return <section className="space-y-5"><div><p className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">Net worth</p><h2 className="text-2xl font-black tracking-tight text-white">Your financial position</h2></div><div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5"><p className="text-sm font-semibold text-emerald-300">Net Worth</p><p className={`mt-1 text-3xl font-black ${data.net_worth >= 0 ? "text-white" : "text-rose-400"}`}>{currency(data.net_worth)}</p><p className="mt-1 text-sm text-slate-400">Assets {currency(data.assets.total)} · Liabilities {currency(data.liabilities.total)}</p></div><div className="grid gap-3 sm:grid-cols-2">{groups.map(([label, amount]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs font-semibold uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-white">{currency(amount)}</p></div>)}</div><div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="mb-4 text-sm font-bold text-white">Net worth history</p>{history.length === 0 && <p className="text-sm text-slate-400">Your daily graph will appear as snapshots accumulate.</p>}{history.length > 0 && <div className="flex h-32 items-end gap-2">{history.map((item) => <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t bg-emerald-500/80" style={{ height: `${Math.max((Number(item.net_worth || 0) / maxValue) * 100, 8)}%` }} title={`${item.date}: ${currency(item.net_worth)}`} /><span className="truncate text-[10px] text-slate-500">{item.date.slice(5)}</span></div>)}</div>}</div></section>;
}

export default NetWorthTracker;
