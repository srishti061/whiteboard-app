import React, { useState } from "react";
import axios from "axios";

const Login = ({ setUser, theme, toggleTheme }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post(
          "https://whiteboard-app-ic5d.onrender.com/api/auth/login",
          {
            email,
            password,
          },
        );
        localStorage.setItem("token", res.data.token);
        setUser(true);
      } else {
        await axios.post(
          "https://whiteboard-app-ic5d.onrender.com/api/auth/signup",
          {
            username,
            email,
            password,
          },
        );
        alert("Signup successful! Please sign in.");
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="login-page">
      {/* Theme toggle — top right corner */}
      <button className="theme-toggle login-theme-toggle" onClick={toggleTheme}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div className="login-box">
        <div className="login-brand">
          <div className="login-brand-icon">✏️</div>
          <span className="login-brand-name">Whiteboard</span>
        </div>

        <div className="login-title">
          {isLogin ? "Welcome back" : "Create account"}
        </div>
        <div className="login-sub">
          {isLogin
            ? "Sign in to your workspace"
            : "Start collaborating in real-time"}
        </div>

        {!isLogin && (
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={onKey}
            />
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKey}
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKey}
          />
        </div>

        <button
          className="login-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>

        <div className="login-footer">
          {isLogin ? "No account? " : "Already have one? "}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
