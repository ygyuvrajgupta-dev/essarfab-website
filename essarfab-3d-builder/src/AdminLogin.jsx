import { useState } from "react";
import { useNavigate } from "react-router-dom";

const VALID_EMAIL = "info@essarfabgreenindia.com";
const VALID_PASSWORD = "green@208006";
const VALID_ADMIN_ID = "essarfab100cr";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminId, setAdminId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (email !== VALID_EMAIL || password !== VALID_PASSWORD || adminId !== VALID_ADMIN_ID) {
      setError("Invalid admin credentials. Please try again.");
      return;
    }

    localStorage.setItem("isAdminAuthenticated", "true");
    navigate("/admin-dashboard");
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-logo">
          <img src="/Essarfab%20logo.png" alt="ESSARFAB GREEN INDIA" />
        </div>
        <h1 className="login-brand-name">ESSARFAB GREEN INDIA</h1>
        <p className="login-brand-tagline">Admin Panel Access</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Admin Login</h2>
        <p className="login-subtitle">Enter admin credentials to manage users</p>

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

        <label>
          <span className="label-text">Admin User ID</span>
          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            placeholder="Enter admin user ID"
            required
          />
        </label>

        <button type="submit" className="btn btn-primary full-width login-btn">
          <i className="fas fa-shield-alt"></i> Admin Sign In
        </button>

        <p className="login-hint">
          <a href="/login">← Back to User Login</a>
        </p>
      </form>

      <div className="login-footer">
        <p className="login-quote">"Innovation with Integrity — Building India's Green Future"</p>
        <p className="login-copyright">© 2026 ESSARFAB GREEN INDIA PVT LTD</p>
      </div>
    </div>
  );
}