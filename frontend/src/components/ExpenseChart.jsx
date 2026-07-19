import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4"
];

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value || 0);

function ExpenseChart({
    transactions
}) {

    const expenseData = {};

    transactions

        .filter(
            (transaction) =>
                transaction.type ===
                "expense"
        )

        .forEach(
            (transaction) => {

                expenseData[
                    transaction.category
                ] =

                    (
                        expenseData[
                            transaction.category
                        ] || 0
                    )

                    +

                    transaction.amount;

            }
        );

    const chartData =

        Object.entries(
            expenseData
        )

        .map(
            ([name, value]) => ({

                name,
                value

            })
        );

    const sortedBreakdown = [...chartData].sort((a, b) => b.value - a.value);

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

                No expense data available.

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
                Expense Breakdown
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-80">
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                innerRadius={50}
                                paddingAngle={3}
                                labelLine={false}
                            >
                                {
                                    chartData.map(
                                        (entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={
                                                    COLORS[
                                                        index %
                                                        COLORS.length
                                                    ]
                                                }
                                            />
                                        )
                                    )
                                }
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderColor: '#334155',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                                formatter={(value) => formatCurrency(value)}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ranked Spending</h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {sortedBreakdown.map((item, index) => {
                            const totalVal = sortedBreakdown.reduce((sum, i) => sum + i.value, 0);
                            const percent = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;
                            return (
                                <div key={item.name} className="flex justify-between items-center py-1.5 text-sm border-b border-slate-800/60 pb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                        <span className="text-slate-300 font-medium">{item.name}</span>
                                        <span className="text-xs text-slate-500 font-mono">({percent}%)</span>
                                    </div>
                                    <span className="font-extrabold text-white">{formatCurrency(item.value)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>

    );
}

export default ExpenseChart;