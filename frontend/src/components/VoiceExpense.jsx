import { useRef, useState } from "react";
import api from "../services/api";
import AccountSelect from "./AccountSelect";

function VoiceExpense({ accountRefreshKey = 0, onAdded }) {
    const [transcript, setTranscript] = useState("");
    const [accountId, setAccountId] = useState(null);
    const [listening, setListening] = useState(false);
    const [message, setMessage] = useState("");
    const recognitionRef = useRef(null);
    const submit = async (text) => {
        if (!text.trim()) return;
        try {
            const token = localStorage.getItem("token");
            const response = await api.post("/voice-expenses", { transcript: text, account_id: accountId }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage(`Added ${response.data.category} expense of INR ${Number(response.data.amount).toLocaleString("en-IN")}.`);
            setTranscript("");
            onAdded();
        } catch (error) { setMessage(error.response?.data?.detail || "Could not understand that expense"); }
    };
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { setMessage("Voice entry is not supported by this browser. Type the sentence below instead."); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.interimResults = false;
        recognition.onstart = () => setListening(true);
        recognition.onend = () => setListening(false);
        recognition.onerror = () => { setListening(false); setMessage("Microphone input was not available."); };
        recognition.onresult = (event) => { const text = event.results[0][0].transcript; setTranscript(text); submit(text); };
        recognitionRef.current = recognition;
        recognition.start();
    };
    return <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><div><p className="text-sm font-semibold text-lime-300 uppercase tracking-wider">Voice entry</p><h2 className="text-2xl font-black tracking-tight text-white">Speak an expense</h2></div><p className="text-sm text-slate-400">Say something like “I spent 250 rupees on lunch.”</p><AccountSelect value={accountId} onChange={setAccountId} refreshKey={accountRefreshKey} /><div className="flex gap-2"><input value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="I spent 250 rupees on lunch" className="min-w-0 flex-1 rounded-lg bg-slate-800 p-3 outline-none focus:ring-2 focus:ring-lime-500" /><button onClick={() => submit(transcript)} className="rounded-lg bg-lime-600 px-4 py-2 text-sm font-bold text-white hover:bg-lime-700">Add</button></div><button onClick={startListening} disabled={listening} className="w-full rounded-lg border border-lime-700/50 bg-lime-950/30 py-3 font-semibold text-lime-300 hover:bg-lime-900 disabled:opacity-60">{listening ? "Listening..." : "Start voice entry"}</button>{message && <p className="text-sm text-lime-300">{message}</p>}</section>;
}

export default VoiceExpense;
