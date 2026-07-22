import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function SpendingForecast({ refreshKey }) {
    const [forecast, setForecast] = useState(null);
    const token = localStorage.getItem("token");
    const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
    const fetchForecast = useCallback(async () => { try { const response = await api.get("/forecast", authConfig); setForecast(response.data); } catch (error) { console.error("Failed to fetch forecast:", error); } }, [authConfig]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchForecast();
    }, [fetchForecast, refreshKey]);
    if (!forecast) return <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Loading forecast...</section>;
    const maxExpense = Math.max(...forecast.history.map((item) => Number(item.expense || 0)), Number(forecast.expected_expense || 0), 1);
    return <section className="space-y-5"><div><p className="text-sm font-semibold text-orange-300 uppercase tracking-wider">Forecast</p><h2 className="text-2xl font-black tracking-tight text-white">Next month spending</h2></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-orange-900/40 bg-orange-950/20 p-5"><p className="text-xs font-semibold uppercase text-orange-300">Expected {forecast.expected_month}</p><p className="mt-1 text-3xl font-black text-white">{currency(forecast.expected_expense)}</p></div><div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase text-slate-400">Confidence</p><p className="mt-1 text-3xl font-black text-orange-300">{forecast.confidence}%</p><p className="mt-1 text-xs text-slate-500">Based on the last six months</p></div></div><div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="mb-4 text-sm font-bold text-white">Historical expenses</p><div className="flex h-32 items-end gap-2">{forecast.history.map((item) => <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t bg-orange-500/80" style={{ height: `${Math.max((Number(item.expense || 0) / maxExpense) * 100, 8)}%` }} title={`${item.month}: ${currency(item.expense)}`} /><span className="truncate text-[10px] text-slate-500">{item.month.slice(5)}</span></div>)}</div></div></section>;
}

export default SpendingForecast;
