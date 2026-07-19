import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";
import SummaryCards from "../components/SummaryCards";
import ExpenseChart from "../components/ExpenseChart";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import Budgets from "../components/Budgets";
import SavingsGoals from "../components/SavingsGoals";
import AddTransaction from "../components/AddTransaction";
import AiAssistant from "../components/AiAssistant";

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value || 0);

function Dashboard() {
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [goals, setGoals] = useState([]);
    
    // Shared refresh key to sync Budgets/Goals components when transactions update
    const [refreshKey, setRefreshKey] = useState(0);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // Filters & Search states
    const [selectedMonth, setSelectedMonth] = useState("All");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedType, setSelectedType] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const uniqueCategories = useMemo(() => {
        const categories = transactions.map((t) => t.category).filter(Boolean);
        return ["All", ...new Set(categories)];
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            // Month filter (date format YYYY-MM-DD)
            if (selectedMonth !== "All") {
                if (!t.date) return false;
                const txMonth = t.date.split("-")[1];
                if (txMonth !== selectedMonth) return false;
            }

            // Category filter
            if (selectedCategory !== "All") {
                if (t.category !== selectedCategory) return false;
            }

            // Type filter
            if (selectedType !== "All") {
                if (t.type !== selectedType) return false;
            }

            // Search query filter
            if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase();
                const categoryMatch = t.category ? t.category.toLowerCase().includes(query) : false;
                const descriptionMatch = t.description ? t.description.toLowerCase().includes(query) : false;
                if (!categoryMatch && !descriptionMatch) return false;
            }

            return true;
        });
    }, [transactions, selectedMonth, selectedCategory, selectedType, searchQuery]);

    const notifications = useMemo(() => {
        const list = [];
        const currentMonthStr = new Date().toISOString().slice(0, 7); // "2026-07"
        const today = new Date();

        // 1. Check Budgets
        // Check current month budgets
        const activeBudgets = budgets.filter((b) => b.month === currentMonthStr);
        activeBudgets.forEach((b) => {
            if ((b.spent || 0) > b.amount) {
                list.push(`⚠️ ${b.category} budget exceeded.`);
            }
        });

        // 2. Check Savings Goals
        goals.forEach((g) => {
            const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            const deadlineDate = g.deadline ? new Date(g.deadline) : null;
            const isOverdue = deadlineDate && deadlineDate < today;
            const isClose = deadlineDate && (deadlineDate - today) / (1000 * 60 * 60 * 24) < 30; // within 30 days

            if (pct >= 100) {
                list.push(`🎉 ${g.title} goal achieved!`);
            } else if (isOverdue || (isClose && pct < 80) || pct < 25) {
                list.push(`⚠️ You are behind your ${g.title} savings goal.`);
            }
        });

        return list;
    }, [budgets, goals]);

    const token = localStorage.getItem("token");

    const authConfig = useMemo(
        () => ({
            headers: {
                Authorization: `Bearer ${token}`
            }
        }),
        [token]
    );

    // Fetch user details
    const fetchUser = useCallback(async () => {
        try {
            const response = await api.get("/auth/me", authConfig);
            setUser(response.data);
        } catch (error) {
            console.error("Failed to fetch user:", error);
        }
    }, [authConfig]);

    // Fetch transactions
    const fetchTransactions = useCallback(async () => {
        try {
            const response = await api.get("/transactions", authConfig);
            setTransactions(response.data);
            setRefreshKey((k) => k + 1);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        }
    }, [authConfig]);

    // Fetch budgets
    const fetchBudgets = useCallback(async () => {
        try {
            const response = await api.get("/budgets", authConfig);
            setBudgets(response.data);
        } catch (error) {
            console.error("Failed to fetch budgets:", error);
        }
    }, [authConfig]);

    // Fetch goals
    const fetchGoals = useCallback(async () => {
        try {
            const response = await api.get("/goals", authConfig);
            setGoals(response.data);
        } catch (error) {
            console.error("Failed to fetch goals:", error);
        }
    }, [authConfig]);

    // Master function to refetch all dashboard data
    const refreshAll = useCallback(() => {
        fetchTransactions();
        fetchBudgets();
        fetchGoals();
    }, [fetchTransactions, fetchBudgets, fetchGoals]);

    useEffect(() => {
        fetchUser();
        refreshAll();
    }, [fetchUser, refreshAll]);

    // Listen for refreshKey changes to update local lists (budgets and goals)
    useEffect(() => {
        fetchBudgets();
        fetchGoals();
    }, [refreshKey, fetchBudgets, fetchGoals]);

    const deleteTransaction = async (id) => {
        if (!confirm("Are you sure you want to delete this transaction?")) {
            return;
        }
        try {
            await api.delete(`/transactions/${id}`, authConfig);
            refreshAll();
        } catch (error) {
            console.error("Failed to delete transaction:", error);
            alert("Failed to delete transaction");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    const exportToCSV = () => {
        if (transactions.length === 0) {
            alert("No transactions to export");
            return;
        }

        const headers = ["Date", "Category", "Type", "Amount", "Description"];
        const csvRows = [
            headers.join(","),
            ...transactions.map((t) => {
                const date = t.date || "";
                const category = `"${(t.category || "").replace(/"/g, '""')}"`;
                const type = t.type || "";
                const amount = t.amount || 0;
                const description = `"${(t.description || "").replace(/"/g, '""')}"`;
                return [date, category, type, amount, description].join(",");
            })
        ];

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `financial_report_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (transactions.length === 0) {
            alert("No transactions to export");
            return;
        }

        const printWindow = window.open("", "_blank");
        const reportHtml = `
            <html>
            <head>
                <title>Financial Report - ${new Date().toLocaleDateString()}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        color: #1e293b;
                        padding: 40px;
                        line-height: 1.5;
                    }
                    .header {
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .title {
                        font-size: 28px;
                        font-weight: 800;
                        margin: 0;
                        color: #0f172a;
                    }
                    .meta {
                        font-size: 14px;
                        color: #64748b;
                        margin-top: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th {
                        background-color: #f1f5f9;
                        color: #475569;
                        text-align: left;
                        padding: 12px;
                        font-size: 14px;
                        text-transform: uppercase;
                        font-weight: 700;
                        border-bottom: 2px solid #cbd5e1;
                    }
                    td {
                        padding: 12px;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 14px;
                    }
                    .income {
                        color: #10b981;
                        font-weight: 700;
                    }
                    .expense {
                        color: #ef4444;
                        font-weight: 700;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="title">Personal Finance Report</h1>
                    <div class="meta">Generated on ${new Date().toLocaleDateString()} for ${user ? user.name : "User"}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(t => `
                            <tr>
                                <td>${t.date || ""}</td>
                                <td>${t.category || ""}</td>
                                <td>${t.description || ""}</td>
                                <td class="${t.type}">${t.type.toUpperCase()}</td>
                                <td class="${t.type}">${t.type === "income" ? "+" : "-"}₹${t.amount}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>

                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(reportHtml);
        printWindow.document.close();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-8">
            {/* Header section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                        Welcome, {user ? user.name : "Guest"} 👋
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Here is a premium breakdown of your financial metrics, budgets, and savings goals.
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-rose-950/40 border border-rose-900/35 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl font-bold transition shadow-lg shadow-rose-900/20"
                >
                    Logout
                </button>
            </header>

            {/* Notifications Center Panel */}
            {notifications.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                    <h2 className="text-lg font-black tracking-tight text-white mb-4 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                        </span>
                        Active Notifications
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notifications.map((notif, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 text-sm font-semibold transition hover:border-slate-700">
                                {notif}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Row 1: Summary cards (Balance, Income, Expense, Health Score) */}
            <SummaryCards
                transactions={transactions}
                budgets={budgets}
                goals={goals}
            />

            {/* Row 2: Charts (Expense Breakdown & Trend with summary) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ExpenseChart transactions={transactions} />
                <MonthlyTrendChart transactions={transactions} />
            </div>

            {/* Row 3: Budgets & Goals side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Budgets refreshKey={refreshKey} />
                <SavingsGoals refreshKey={refreshKey} />
            </div>

            {/* Row 4: Add Transaction & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <AddTransaction
                        refresh={refreshAll}
                        editingTransaction={editingTransaction}
                        setEditingTransaction={setEditingTransaction}
                    />

                    {/* Module 9 – Export Reports */}
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                                Module 9
                            </p>
                            <h2 className="text-xl font-black tracking-tight text-white">
                                Export Reports
                            </h2>
                        </div>
                        
                        <p className="text-slate-400 text-xs">
                            Export your transaction history to CSV or PDF for demonstrations and reporting.
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={exportToCSV}
                                className="w-1/2 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-800 transition flex items-center justify-center gap-1.5 shadow"
                            >
                                📥 Download CSV
                            </button>
                            <button
                                onClick={exportToPDF}
                                className="w-1/2 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-800 transition flex items-center justify-center gap-1.5 shadow"
                            >
                                📄 Download PDF
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                        <h2 className="text-2xl font-black tracking-tight text-white mb-4">
                            Recent Transactions
                        </h2>

                        {/* Filters & Search Control Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
                            {/* Month Select */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="All">All Months</option>
                                    <option value="01">January</option>
                                    <option value="02">February</option>
                                    <option value="03">March</option>
                                    <option value="04">April</option>
                                    <option value="05">May</option>
                                    <option value="06">June</option>
                                    <option value="07">July</option>
                                    <option value="08">August</option>
                                    <option value="09">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                            </div>

                            {/* Category Select */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat === "All" ? "All Categories" : cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Select */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="All">All Types</option>
                                    <option value="income">Income</option>
                                    <option value="expense">Expense</option>
                                </select>
                            </div>

                            {/* Search Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="e.g. Coffee"
                                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                            {filteredTransactions.map((transaction) => (
                                <div
                                    key={transaction._id}
                                    className="bg-slate-950 rounded-xl p-4 flex justify-between items-center border border-slate-800 hover:border-slate-700 transition"
                                >
                                    <div>
                                        <p className="font-bold text-slate-200">
                                            {transaction.category}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {transaction.description}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                                            {transaction.date}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <p
                                            className={
                                                transaction.type === "income"
                                                    ? "text-emerald-400 font-extrabold text-lg"
                                                    : "text-rose-400 font-extrabold text-lg"
                                            }
                                        >
                                            {transaction.type === "income" ? "+" : "-"}
                                            {formatCurrency(transaction.amount)}
                                        </p>
                                        
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingTransaction(transaction)}
                                                className="px-2.5 py-1 bg-amber-900/40 border border-amber-800/40 hover:bg-amber-700 text-amber-300 hover:text-white text-xs font-semibold rounded-lg transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deleteTransaction(transaction._id)}
                                                className="px-2.5 py-1 bg-rose-900/40 border border-rose-800/40 hover:bg-rose-900 text-rose-300 hover:text-white text-xs font-semibold rounded-lg transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {filteredTransactions.length === 0 && (
                                <div className="text-center py-8 text-slate-550 border border-dashed border-slate-800 rounded-xl">
                                    No transactions match your search/filter criteria.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating AI Assistant */}
            <AiAssistant />
        </div>
    );
}

export default Dashboard;