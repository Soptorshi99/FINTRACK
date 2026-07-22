import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

function AccountSelect({ value, onChange, refreshKey = 0, allowEmpty = true }) {
    const [accounts, setAccounts] = useState([]);
    const fetchAccounts = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await api.get("/accounts", { headers: { Authorization: `Bearer ${token}` } });
            setAccounts(response.data);
        } catch (error) {
            console.error("Failed to fetch accounts:", error);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAccounts();
    }, [fetchAccounts, refreshKey]);

    return (
        <select
            value={value || ""}
            onChange={(event) => onChange(event.target.value || null)}
            className="w-full rounded-lg bg-slate-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
            {allowEmpty && <option value="">No account selected</option>}
            {!allowEmpty && <option value="">Select an account</option>}
            {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                    {account.name} · INR {Number(account.balance || 0).toLocaleString("en-IN")}
                </option>
            ))}
        </select>
    );
}

export default AccountSelect;
