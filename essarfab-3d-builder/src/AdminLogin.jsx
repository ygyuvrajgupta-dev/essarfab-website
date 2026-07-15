import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase/firebase";

const VALID_ADMIN_ID = "efgi@208006";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminId, setAdminId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      if (adminId.trim() !== VALID_ADMIN_ID) {
        setError("Invalid Admin User ID");
        setLoading(false);
        return;
      }
      
      localStorage.setItem("isAdminAuthenticated", "true");
      navigate("/admin-dashboard");
    } catch (err) {
      const code = err.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid Email or Password");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else if (code === "auth/network-request-failed") {
        setError("Firebase Connection Error. Check your internet.");
      } else {
        setError("Access Denied. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
          />
        </label>

        <button type="submit" className="btn btn-primary full-width login-btn" disabled={loading}>
          <i className="fas fa-shield-alt"></i> {loading ? "Signing in..." : "Admin Sign In"}
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