import { useState, useRef, useEffect } from "react";
import api from "../services/api";

function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            sender: "ai",
            text: "Hi! I am your FinTrack AI Assistant. Ask me questions about your monthly spending, saving tips, or goals progress."
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        setInput("");
        
        // Add User message
        setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await api.post(
                "/ai/chat",
                { message: userMsg },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            // Add AI response
            setMessages((prev) => [...prev, { sender: "ai", text: response.data.reply }]);
        } catch (error) {
            console.error("AI assistant connection error:", error);
            setMessages((prev) => [
                ...prev,
                { sender: "ai", text: "Sorry, I am having trouble connecting right now. Please try again." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative p-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-2xl transition duration-300 hover:scale-110 flex items-center justify-center cursor-pointer group"
                >
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xl">✨ AI</span>
                </button>
            )}

            {/* Chat Dialog Panel */}
            {isOpen && (
                <div className="bg-slate-900 border border-slate-800 w-80 sm:w-96 h-[480px] rounded-2xl flex flex-col shadow-2xl overflow-hidden backdrop-blur-md">
                    {/* Header */}
                    <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">✨</span>
                            <div>
                                <h3 className="text-sm font-black text-slate-100 tracking-tight">FinTrack AI Assistant</h3>
                                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-white transition text-xs font-bold px-2 py-1 rounded hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/40">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl p-3 text-xs font-semibold leading-relaxed shadow-sm ${
                                        msg.sender === "user"
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl rounded-tl-none p-3 max-w-[80%] flex items-center gap-1 shadow-sm">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Footer */}
                    <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Ask me how much you spent on food..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                        />
                        <button
                            onClick={handleSend}
                            className="px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center cursor-pointer"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AiAssistant;
