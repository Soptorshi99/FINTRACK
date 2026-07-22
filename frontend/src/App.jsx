import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        token
                            ? <Navigate to={role === "admin" ? "/admin" : "/dashboard"} />
                            : <Login />
                    }
                />
                <Route
                    path="/register"
                    element={
                        token
                            ? <Navigate to={role === "admin" ? "/admin" : "/dashboard"} />
                            : <Register />
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        token
                            ? (role === "admin" ? <Navigate to="/admin" /> : <Dashboard />)
                            : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/admin"
                    element={token ? <AdminDashboard /> : <Navigate to="/login" />}
                />
                <Route
                    path="*"
                    element={
                        <Navigate to={token ? (role === "admin" ? "/admin" : "/dashboard") : "/login"} />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;