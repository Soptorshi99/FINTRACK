import { useEffect, useState } from "react";
import api from "../services/api";
import AddTransaction from "../components/AddTransaction";
import SummaryCards
    from "../components/SummaryCards";
import ExpenseChart
    from "../components/ExpenseChart";
import MonthlyTrendChart
    from "../components/MonthlyTrendChart";
import Budgets from "../components/Budgets";
import SavingsGoals from "../components/SavingsGoals";
function Transactions() {

    const [transactions,
           setTransactions] =
        useState([]);
    const [budgetRefreshKey,
           setBudgetRefreshKey] =
        useState(0);
    const [editingTransaction,
       setEditingTransaction] =
    useState(null);
    const deleteTransaction = async (id) => {

    try {

        const token =
            localStorage.getItem("token");

        await api.delete(
            `/transactions/${id}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        fetchTransactions();

    } catch (error) {

        console.error(error);

        alert(
            "Failed to delete transaction"
        );

    }

};
    const fetchTransactions =
        async () => {

            try {

                const token =
                    localStorage.getItem(
                        "token"
                    );

                const response =
                    await api.get(
                        "/transactions",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );

                setTransactions(
                    response.data
                );

                setBudgetRefreshKey(
                    (currentKey) =>
                        currentKey + 1
                );

            } catch (error) {

                console.error(error);

            }

        };

    useEffect(() => {

        fetchTransactions();

    }, []);

    return (

        <div>
            <SummaryCards
    transactions={transactions}
/><ExpenseChart
    transactions={transactions}
/>
<MonthlyTrendChart
    transactions={transactions}
/>
<Budgets
    refreshKey={budgetRefreshKey}
/>
<SavingsGoals
    refreshKey={budgetRefreshKey}
/>
            <AddTransaction
    refresh={fetchTransactions}
    editingTransaction={editingTransaction}
    setEditingTransaction={setEditingTransaction}
/>

            <div className="space-y-4">

                <h2 className="
                    text-2xl
                    font-bold
                ">
                    Recent Transactions
                </h2>

                {
                    transactions.map(
                        (
                            transaction
                        ) => (

                            <div

                                key={
                                    transaction._id
                                }

                                className="
                                    bg-slate-900
                                    rounded-xl
                                    p-4
                                    flex
                                    justify-between
                                    items-center
                                "

                            >

                                <div>

                                    <p className="
                                        font-semibold
                                    ">
                                        {
                                            transaction.category
                                        }
                                    </p>

                                    <p className="
                                        text-sm
                                        text-slate-400
                                    ">
                                        {
                                            transaction.description
                                        }
                                    </p>

                                </div>

<div className="flex items-center gap-4">

    <p
        className={
            transaction.type === "income"
            ? "text-green-400 font-bold"
            : "text-red-400 font-bold"
        }
    >

        {
            transaction.type === "income"
            ? "+"
            : "-"
        }

        ₹{transaction.amount}

    </p>

    <button

        onClick={() =>
            deleteTransaction(
                transaction._id
            )
        }

        className="
            bg-red-600
            px-3
            py-1
            rounded-lg
            hover:bg-red-700
        "

    >

        Delete

    </button>
        <button

    onClick={() =>
        setEditingTransaction(
            transaction
        )
    }

    className="
        bg-yellow-600
        px-3
        py-1
        rounded-lg
        hover:bg-yellow-700
    "

>

    Edit

</button>
</div>

                            </div>

                        )
                    )
                }

            </div>

        </div>

    );
}

export default Transactions;
