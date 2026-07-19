import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register
    from "./pages/Register";
function App() {

    const token =
        localStorage.getItem("token");

    return (

        <BrowserRouter>

            <Routes>

                <Route

                    path="/login"

                    element={

                        token

                        ?

                        <Navigate
                            to="/dashboard"
                        />

                        :

                        <Login />

                    }

                />
                <Route

    path="/register"

    element={

        token

        ?

        <Navigate
            to="/dashboard"
        />

        :

        <Register />

    }

/>
                <Route

                    path="/dashboard"

                    element={

                        token

                        ?

                        <Dashboard />

                        :

                        <Navigate
                            to="/login"
                        />

                    }

                />

                <Route

                    path="*"

                    element={

                        <Navigate
                            to={
                                token

                                ?

                                "/dashboard"

                                :

                                "/login"
                            }
                        />

                    }

                />

            </Routes>

        </BrowserRouter>

    );
}

export default App;