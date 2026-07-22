import { useState } from "react";
import api from "../services/api";
import AccountSelect from "./AccountSelect";

function ReceiptScanner({ accountRefreshKey = 0, onAdded }) {
    const [file, setFile] = useState(null);
    const [accountId, setAccountId] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState("");
    const scan = async () => {
        if (!file) { setMessage("Choose an image receipt first."); return; }
        try {
            setScanning(true); setMessage("");
            const token = localStorage.getItem("token");
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const response = await api.post("/receipts/scan", { content_type: file.type, data: dataUrl }, { headers: { Authorization: `Bearer ${token}` } });
            setResult(response.data);
            if (!response.data.amount) { setMessage("Receipt scanned, but no amount was detected."); return; }
            await api.post("/transactions", { type: "expense", category: response.data.category || "Other", amount: Number(response.data.amount), description: response.data.merchant, date: response.data.date, account_id: accountId }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage(`Added ${response.data.merchant} as an expense.`);
            onAdded();
        } catch (error) { setMessage(error.response?.data?.detail || "Could not scan this receipt."); }
        finally { setScanning(false); }
    };
    return <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><div><p className="text-sm font-semibold text-pink-300 uppercase tracking-wider">Receipt scanner</p><h2 className="text-2xl font-black tracking-tight text-white">Scan a receipt</h2></div><p className="text-sm text-slate-400">Upload a clear receipt image. OCR extracts the merchant, amount, date, and category, then adds the transaction.</p><AccountSelect value={accountId} onChange={setAccountId} refreshKey={accountRefreshKey} /><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full rounded-lg bg-slate-800 p-3 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-pink-600 file:px-3 file:py-2 file:font-semibold file:text-white" /><button onClick={scan} disabled={scanning} className="w-full rounded-lg bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-60">{scanning ? "Scanning..." : "Scan and add transaction"}</button>{result && <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300"><p className="font-bold text-white">{result.merchant}</p><p>Amount: {result.amount ? `INR ${Number(result.amount).toLocaleString("en-IN")}` : "Not detected"} · Date: {result.date}</p></div>}{message && <p className="text-sm text-pink-300">{message}</p>}</section>;
}

export default ReceiptScanner;
