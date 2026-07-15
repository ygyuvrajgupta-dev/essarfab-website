import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, onAuthChange, logout } from "./services/authService";
import { verifyUserByEmail, upsertDevice } from "./services/userService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(email.trim(), password);
      
      const userData = await verifyUserByEmail(email.trim());
      
      await upsertDevice(userData.userId, {
        deviceType: getDeviceType(),
        browser: getBrowser(),
      });
      
      navigate("/");
    } catch (err) {
      if (err.message === "User not found") {
        setError("User not found. Please contact admin.");
      } else if (err.message === "Account is inactive") {
        setError("Your account is inactive. Contact admin.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Firebase Connection Error. Check your internet.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return "Mobile";
    return "Desktop";
  };

  const getBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes("Edg/")) return "Edge";
    if (ua.includes("Chrome/")) return "Chrome";
    if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox/")) return "Firefox";
    return "Unknown";
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-logo">
          <img src="/Essarfab%20logo.png" alt="ESSARFAB GREEN INDIA" />
        </div>
        <h1 className="login-brand-name">ESSARFAB GREEN INDIA</h1>
        <p className="login-brand-tagline">3D Panel Builder</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>
        <p className="login-subtitle">Sign in to access the 3D Builder</p>

        {error && <div className="login-error-box"><span className="login-error-icon">⚠️</span> {error}</div>}

        <label>
          <span className="label-text">Email</span>
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

        <button type="submit" className="btn btn-primary full-width login-btn" disabled={loading}>
          <i className="fas fa-sign-in-alt"></i> {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="login-hint">
          <a href="/admin-login">Admin Login →</a>
        </p>
      </form>

      <div className="login-footer">
        <p className="login-quote">"Innovation with Integrity — Building India's Green Future"</p>
        <p className="login-copyright">© 2026 ESSARFAB GREEN INDIA PVT LTD</p>
      </div>
    </div>
  );
}