import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const blankForm = { name: "", account_type: "Bank", opening_balance: "" };

function AccountManager({ onAccountsChanged }) {
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState(blankForm);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const token = localStorage.getItem("token");
    const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
    const fetchAccounts = useCallback(async () => {
        try { const response = await api.get("/accounts", authConfig); setAccounts(response.data); }
        catch (error) { console.error("Failed to fetch accounts:", error); }
    }, [authConfig]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAccounts();
    }, [fetchAccounts]);
    const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const reset = () => { setForm(blankForm); setEditingId(null); setShowForm(false); };
    const save = async (event) => {
        event.preventDefault();
        if (!form.name.trim() || Number(form.opening_balance) < 0) { alert("Enter an account name and valid opening balance"); return; }
        const payload = { name: form.name.trim(), account_type: form.account_type, opening_balance: Number(form.opening_balance) || 0 };
        try {
            if (editingId) await api.put(`/accounts/${editingId}`, payload, authConfig);
            else await api.post("/accounts", payload, authConfig);
            reset(); await fetchAccounts(); onAccountsChanged();
        } catch (error) { console.error("Failed to save account:", error); alert("Failed to save account"); }
    };
    const edit = (account) => { setEditingId(account._id); setForm({ name: account.name, account_type: account.account_type, opening_balance: account.opening_balance }); setShowForm(true); };
    const remove = async (id) => {
        if (!confirm("Delete this account? Linked transactions must be moved first.")) return;
        try { await api.delete(`/accounts/${id}`, authConfig); fetchAccounts(); onAccountsChanged(); }
        catch (error) { alert(error.response?.data?.detail || "Failed to delete account"); }
    };
    return <section className="space-y-5"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-sky-300 uppercase tracking-wider">Accounts</p><h2 className="text-2xl font-black tracking-tight text-white">Your accounts</h2></div><button onClick={() => { if (showForm) reset(); else setShowForm(true); }} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">{showForm ? "Close" : "Add account"}</button></div>{showForm && <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3"><input value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="HDFC, Cash, UPI Wallet" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-sky-500" /><select value={form.account_type} onChange={(e) => change("account_type", e.target.value)} className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-sky-500"><option>Bank</option><option>Cash</option><option>Wallet</option><option>Other</option></select><input type="number" min="0" value={form.opening_balance} onChange={(e) => change("opening_balance", e.target.value)} placeholder="Opening balance" className="rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-sky-500" /><button className="rounded-lg bg-sky-600 py-3 font-semibold text-white hover:bg-sky-700 md:col-span-3">{editingId ? "Update account" : "Save account"}</button></form>}<div className="grid gap-3 sm:grid-cols-2">{accounts.map((account) => <article key={account._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"><div><p className="font-bold text-white">{account.name}</p><p className="text-xs text-slate-400">{account.account_type}</p></div><div className="text-right"><p className="font-black text-sky-300">{currency(account.balance)}</p><div className="mt-2 flex justify-end gap-2"><button onClick={() => edit(account)} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">Edit</button><button onClick={() => remove(account._id)} className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900 hover:text-white">Delete</button></div></div></article>)}{accounts.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400 sm:col-span-2">Add HDFC, SBI, Cash, or wallet accounts to assign transactions and calculate net worth.</div>}</div></section>;
}

export default AccountManager;
