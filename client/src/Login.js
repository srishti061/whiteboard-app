import React, { useState } from "react";
import axios from "axios";

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async () => {
  try {
    if (isLogin) {
      // LOGIN
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", res.data); // ✅ ADD THIS

      localStorage.setItem("token", res.data.token);
      setUser(true);
    } else {
      // SIGNUP
      const res = await axios.post("http://localhost:5000/api/auth/signup", {
        username,
        email,
        password,
      });

      console.log("SIGNUP RESPONSE:", res.data); // ✅ ADD THIS

      alert("Signup successful! Now login.");
      setIsLogin(true);
    }
  } catch (err) {
  console.log("ERROR:", err.response); // 👈 ADD THIS

  alert(err.response?.data?.message || "Error");
}
};

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>{isLogin ? "Login" : "Sign Up"}</h2>

      {!isLogin && (
        <>
          <input
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
          />
          <br /><br />
        </>
      )}

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleSubmit}>
        {isLogin ? "Login" : "Sign Up"}
      </button>

      <p
        style={{ cursor: "pointer", marginTop: "10px" }}
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin
          ? "New user? Sign Up"
          : "Already have an account? Login"}
      </p>
    </div>
  );
};

export default Login;