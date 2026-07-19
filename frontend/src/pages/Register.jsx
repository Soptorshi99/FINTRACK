import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async () => {

        try {

            await api.post(
                "/auth/register",
                {
                    name,
                    email,
                    password
                }
            );

            alert(
                "Registration successful!"
            );

            navigate("/login");

        } catch (error) {

            console.error(error);

            alert(
                error.response?.data?.detail ||
                "Registration failed"
            );

        }

    };

    return (

        <div className="
            min-h-screen
            bg-slate-950
            flex
            items-center
            justify-center
            px-4
        ">

            <div className="
                w-full
                max-w-md
                bg-slate-900
                rounded-3xl
                shadow-2xl
                p-8
                border
                border-slate-800
            ">

                <div className="
                    text-center
                    mb-8
                ">

                    <h1 className="
                        text-4xl
                        font-bold
                        text-white
                    ">

                        💰 FinTrack

                    </h1>

                    <p className="
                        text-slate-400
                        mt-2
                    ">

                        Create your account

                    </p>

                </div>

                <div className="
                    space-y-5
                ">

                    <input

                        type="text"

                        placeholder="Name"

                        value={name}

                        onChange={(e) =>
                            setName(
                                e.target.value
                            )
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
                        "

                    />

                    <input

                        type="email"

                        placeholder="Email"

                        value={email}

                        onChange={(e) =>
                            setEmail(
                                e.target.value
                            )
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
                        "

                    />

                    <input

                        type="password"

                        placeholder="Password"

                        value={password}

                        onChange={(e) =>
                            setPassword(
                                e.target.value
                            )
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
                        "

                    />

                    <button

                        onClick={
                            handleRegister
                        }

                        className="
                            w-full
                            py-3
                            rounded-xl
                            bg-blue-600
                            text-white
                            font-semibold
                            hover:bg-blue-700
                        "

                    >

                        Register

                    </button>

                </div>

            </div>

        </div>

    );

}

export default Register;