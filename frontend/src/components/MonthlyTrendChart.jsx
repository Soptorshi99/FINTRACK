import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value || 0);

const formatMonthName = (monthStr) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString("default", { month: "long", year: "numeric" });
};

function MonthlyTrendChart({ transactions = [] }) {

    const monthlyData = {};

    transactions

        .filter(
            (transaction) =>
                transaction.type === "expense"
        )

        .forEach(
            (transaction) => {

                const month =
                    transaction.date.slice(0, 7);

                monthlyData[month] =

                    (
                        monthlyData[month] || 0
                    )

                    +

                    Number(
                        transaction.amount
                    );

            }
        );

    const chartData =

        Object.entries(
            monthlyData
        )

        .map(
            ([month, amount]) => ({

                month,
                amount

            })
        )

        .sort(
            (a, b) =>

                a.month.localeCompare(
                    b.month
                )
        );

    // Calculate Monthly Financial Summary
    const curMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    let targetMonth = curMonthStr;
    const monthsInTxs = [...new Set(transactions.map(t => t.date ? t.date.slice(0, 7) : ""))].filter(Boolean);
    if (!monthsInTxs.includes(curMonthStr) && monthsInTxs.length > 0) {
        monthsInTxs.sort((a, b) => b.localeCompare(a));
        targetMonth = monthsInTxs[0];
    }

    const targetMonthTxs = transactions.filter(t => t.date && t.date.startsWith(targetMonth));
    const monthlyIncome = targetMonthTxs.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = targetMonthTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const monthlySavings = monthlyIncome - monthlyExpense;
    const monthlySavingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

    if (
        chartData.length === 0
    ) {

        return (

            <div className="
                bg-slate-900
                rounded-2xl
                p-6
                mb-8
                border border-slate-800
            ">

                No expense history available.

            </div>

        );

    }

    return (

        <div className="
            bg-slate-900
            rounded-2xl
            p-6
            mb-8
            border border-slate-800
        ">

            <h2 className="
                text-2xl
                font-black
                tracking-tight
                text-white
                mb-6
            ">
                Monthly Expense Trend
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="month" stroke="#94a3b8" tickFormatter={(val) => val.split("-")[1] + "/" + val.split("-")[0].slice(2)} />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                            <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                dot={{ fill: '#3B82F6', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Financial Summary card */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight border-b border-slate-800 pb-2">
                        {formatMonthName(targetMonth)}
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Income</span>
                            <span className="font-bold text-green-400">{formatCurrency(monthlyIncome)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Expense</span>
                            <span className="font-bold text-red-400">{formatCurrency(monthlyExpense)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-slate-900 pt-2">
                            <span className="text-slate-300 font-medium">Savings</span>
                            <span className="font-extrabold text-blue-400">{formatCurrency(monthlySavings)}</span>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Savings Rate</span>
                        <span className="text-xl font-black text-emerald-400">{monthlySavingsRate}%</span>
                    </div>
                </div>
            </div>

        </div>

    );

}

export default MonthlyTrendChart;