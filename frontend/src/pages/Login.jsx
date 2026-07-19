import { useState } from "react";
import api from "../services/api";
import {
    useNavigate
} from "react-router-dom";
function Login() {
    const navigate =
    useNavigate();
    const handleLogin = async () => {

    try {

        const response =
            await api.post(
                "/auth/login",
                {
                    email,
                    password
                }
            );
        console.log(response.data);
        localStorage.setItem(
            "token",
            response.data.access_token
        );

        window.location.href =
    "/dashboard";

    } catch (error) {

        alert(
            "Invalid credentials"
        );

        console.error(error);

    }

};
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

            <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-800">

                <div className="text-center mb-8">

                    <h1 className="text-4xl font-bold text-white">
                        💰 FinTrack
                    </h1>

                    <p className="text-slate-400 mt-2">
                        Manage your money smarter
                    </p>

                </div>

                <div className="space-y-5">

                    <div>

                        <label className="block text-sm text-slate-300 mb-2">
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="abc@gmail.com"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            className="
                                w-full
                                px-4
                                py-3
                                rounded-xl
                                bg-slate-800
                                border
                                border-slate-700
                                text-white
                                placeholder-slate-500
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                    </div>

                    <div>

                        <label className="block text-sm text-slate-300 mb-2">
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            className="
                                w-full
                                px-4
                                py-3
                                rounded-xl
                                bg-slate-800
                                border
                                border-slate-700
                                text-white
                                placeholder-slate-500
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                    </div>

                    <button

    onClick={handleLogin}

    className="
        w-full
        py-3
        rounded-xl
        bg-blue-600
        text-white
        font-semibold
        hover:bg-blue-700
        transition
    "

>

    Sign In

</button>

                </div>

                <p className="text-center text-slate-400 mt-6">

                    Don't have an account?

                    <span

    className="
        text-blue-400
        ml-1
        cursor-pointer
        hover:underline
    "

    onClick={() =>
        navigate(
            "/register"
        )
    }

>

    Register

</span>

                </p>

            </div>

        </div>
    );
}

export default Login;