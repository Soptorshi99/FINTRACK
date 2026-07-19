const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value || 0);

const getAsciiProgressBar = (progress) => {
    const totalBlocks = 10;
    const filledBlocks = Math.min(Math.max(Math.round((progress / 100) * totalBlocks), 0), totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
};

function SummaryCards({ transactions = [], budgets = [], goals = [] }) {
    const currentMonthStr = new Date().toISOString().slice(0, 7); // "2026-07"
    const currentYearStr = new Date().getFullYear().toString(); // "2026"

    // --- MONTHLY CALCULATIONS ---
    const monthlyTxs = transactions.filter(t => t.date && t.date.startsWith(currentMonthStr));
    const monthlyIncome = monthlyTxs.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = monthlyTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const monthlyBalance = monthlyIncome - monthlyExpense;

    // Monthly Health Score calculation
    let monthlyHealth = 0;
    const monthlySavingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
    if (monthlySavingsRate > 30) monthlyHealth += 40;
    if (monthlyExpense < monthlyIncome && monthlyIncome > 0) monthlyHealth += 30;
    const activeBudgets = budgets.filter(b => b.month === currentMonthStr);
    const monthlyBudgetExceeded = activeBudgets.length > 0 && activeBudgets.some(b => (b.spent || 0) > b.amount);
    if (activeBudgets.length > 0) {
        if (!monthlyBudgetExceeded) monthlyHealth += 20;
    } else {
        monthlyHealth += 20;
    }
    if (goals.length > 0) monthlyHealth += 10;

    // --- YEARLY CALCULATIONS ---
    const yearlyTxs = transactions.filter(t => t.date && t.date.startsWith(currentYearStr));
    const yearlyIncome = yearlyTxs.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const yearlyExpense = yearlyTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const yearlyBalance = yearlyIncome - yearlyExpense;

    // Yearly Health Score calculation
    let yearlyHealth = 0;
    const yearlySavingsRate = yearlyIncome > 0 ? ((yearlyIncome - yearlyExpense) / yearlyIncome) * 100 : 0;
    if (yearlySavingsRate > 30) yearlyHealth += 40;
    if (yearlyExpense < yearlyIncome && yearlyIncome > 0) yearlyHealth += 30;
    const overallBudgetExceeded = budgets.some(b => (b.spent || 0) > b.amount);
    if (budgets.length > 0) {
        if (!overallBudgetExceeded) yearlyHealth += 20;
    } else {
        yearlyHealth += 20;
    }
    if (goals.length > 0) yearlyHealth += 10;

    // Helper to get status rating
    const getStatus = (score) => {
        if (score >= 80) return { text: "Excellent", color: "text-emerald-400" };
        if (score >= 60) return { text: "Good", color: "text-teal-400" };
        if (score >= 40) return { text: "Fair", color: "text-amber-400" };
        return { text: "Poor", color: "text-rose-400" };
    };

    const monthlyStatus = getStatus(monthlyHealth);
    const yearlyStatus = getStatus(yearlyHealth);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Balance Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition space-y-4">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Balance</p>
                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-800">
                    <div>
                        <span className="text-xs text-slate-500 block uppercase">This Month</span>
                        <span className="text-2xl font-black text-white block mt-1">
                            {formatCurrency(monthlyBalance)}
                        </span>
                    </div>
                    <div className="pl-4">
                        <span className="text-xs text-slate-500 block uppercase">This Year</span>
                        <span className="text-xl font-bold text-slate-300 block mt-1">
                            {formatCurrency(yearlyBalance)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Income Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition space-y-4">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Income</p>
                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-800">
                    <div>
                        <span className="text-xs text-slate-500 block uppercase">This Month</span>
                        <span className="text-2xl font-black text-green-400 block mt-1">
                            {formatCurrency(monthlyIncome)}
                        </span>
                    </div>
                    <div className="pl-4">
                        <span className="text-xs text-slate-500 block uppercase">This Year</span>
                        <span className="text-xl font-bold text-green-500/80 block mt-1">
                            {formatCurrency(yearlyIncome)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Expense Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition space-y-4">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Expense</p>
                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-800">
                    <div>
                        <span className="text-xs text-slate-500 block uppercase">This Month</span>
                        <span className="text-2xl font-black text-red-400 block mt-1">
                            {formatCurrency(monthlyExpense)}
                        </span>
                    </div>
                    <div className="pl-4">
                        <span className="text-xs text-slate-500 block uppercase">This Year</span>
                        <span className="text-xl font-bold text-red-500/80 block mt-1">
                            {formatCurrency(yearlyExpense)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Financial Health Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Financial Health</p>
                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-800">
                    <div>
                        <span className="text-xs text-slate-500 block uppercase">This Month</span>
                        <div className="flex justify-between items-baseline mt-1 pr-2">
                            <span className="text-2xl font-black text-white">{monthlyHealth}</span>
                            <span className={`text-[10px] font-bold ${monthlyStatus.color}`}>{monthlyStatus.text}</span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-300 tracking-wider mt-2">
                            {getAsciiProgressBar(monthlyHealth)}
                        </div>
                    </div>
                    <div className="pl-4">
                        <span className="text-xs text-slate-500 block uppercase">This Year</span>
                        <div className="flex justify-between items-baseline mt-1">
                            <span className="text-xl font-bold text-slate-300">{yearlyHealth}</span>
                            <span className={`text-[10px] font-bold ${yearlyStatus.color}`}>{yearlyStatus.text}</span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-300 tracking-wider mt-2">
                            {getAsciiProgressBar(yearlyHealth)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SummaryCards;