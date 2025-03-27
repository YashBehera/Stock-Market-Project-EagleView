import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "./firebase-config";
import { toast } from "react-toastify";
import Register from "./register";
import Profile from "./profile";
import logo from "./logo1.jpg";
import SignUpGoogle from "./signInWithGoogle";


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowProfile(true);
      console.log("User logged in Successfully");
      toast.success("User logged in Successfully", {
        position: "top-center",
      });
    } catch (error) {
      console.log(error.message);

      toast.error(error.message, {
        position: "bottom-center",
      });
    }
  };

  const handleRegisterClick = () => {
    setShowRegister(true);
    auth.signOut();
    setShowProfile(false);
  };

  return (
    <>
      {showRegister ? (
        <div>
          <Register />
        </div>
      ) : showProfile ? (
        <div>
          <Profile />
        </div>
      ) : (
        <div className="bg-gray-100 h-[25rem] w-[19rem] text-black rounded-3xl shadow-xl shadow-gray-400">
          <div className="flex mt-1 ml-10 w-60">
            <span className="text-3xl font-bold text-black">EagleView</span>
            <div>
              <img src={logo} className="h-8 ml-2" />
            </div>
          </div>
          <div>
            <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center">
              <h3 className="font-semibold text-lg mt-0">Login</h3>

              <div className="mb-1 gap-0 text-sm">
                <label className="text-base font-medium">Email address</label><br/>
                <input
                  type="email"
                  className="form-control border-2 border-solid rounded-lg px-1 w-48 focus:outline-none"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-1 gap-0 text-sm">
                <label className="text-base font-medium">Password</label><br/>
                <input
                  type="password"
                  className="form-control border-2 border-solid rounded-lg px-1 w-48 focus:outline-none"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className=" flex items-center justify-center h-7 w-48 bg-blue-600 rounded-lg text-white mt-2">
                <div type="submit" className="btn btn-primary">
                  <span className="flex items-center justify-center">
                    Login
                  </span>
                </div>
              </button>
              <p className="forgot-password text-right text-xs mt-1">
                New Register?{" "}
                <button
                  type="button"
                  className="text-blue-600"
                  onClick={handleRegisterClick}
                >
                  Register Here
                </button>
              </p>
              <SignUpGoogle/>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
