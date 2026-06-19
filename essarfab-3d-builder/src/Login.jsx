import { useState } from "react";

const VALID_EMAIL = "info@essarfabgreenindia.com";
const VALID_PASSWORD = "green@208006";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      localStorage.setItem("isAuthenticated", "true");
      onLogin();
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-logo">
          <img src="C:\Users\Lenovo\OneDrive\Desktop\project 2030\ESSARFAB WEB SITE\essarfab-website\essarfab-3d-builder\src\assets\Essarfab logo.png" alt="ESSARFAB GREEN INDIA" />
        </div>
        <h1 className="login-brand-name">ESSARFAB GREEN INDIA</h1>
        <p className="login-brand-tagline">PUF Panel Calculator & 3D Builder</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>
        <p className="login-subtitle">Sign in to access the 3D Builder</p>

        {error && <div className="login-error-box"><span className="login-error-icon">⚠️</span> {error}</div>}

        <label>
          <span className="label-text">Email Address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </label>

        <label>
          <span className="label-text">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </label>

        <button type="submit" className="btn btn-primary full-width login-btn">
          <i className="fas fa-sign-in-alt"></i> Sign In
        </button>

        <p className="login-hint">
          Authorized personnel only. Contact <a href="mailto:info@essarfabgreenindia.com">admin</a> for access.
        </p>
      </form>

      <div className="login-footer">
        <p className="login-quote">"Innovation with Integrity — Building India's Green Future"</p>
        <p className="login-copyright">© 2026 ESSARFAB GREEN INDIA PVT LTD</p>
      </div>
    </div>
  );
}
