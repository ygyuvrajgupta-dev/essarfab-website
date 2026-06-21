import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "allowedUsers";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [newUserId, setNewUserId] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdminAuthenticated");
    if (!isAdmin) {
      navigate("/admin-login");
    }
    loadUsers();
  }, [navigate]);

  const loadUsers = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUsers(JSON.parse(stored));
      } catch (e) {
        setUsers([]);
      }
    }
  };

  const saveUsers = (userList) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userList));
    setUsers(userList);
  };

  const addUser = (e) => {
    e.preventDefault();
    if (!newUserId.trim() || !newUsername.trim()) {
      alert("Please enter both User ID and Username");
      return;
    }
    if (users.some(u => u.userId === newUserId.trim())) {
      alert("User ID already exists!");
      return;
    }
    saveUsers([...users, { userId: newUserId.trim(), username: newUsername.trim() }]);
    setNewUserId("");
    setNewUsername("");
  };

  const removeUser = (userId) => {
    if (window.confirm(`Are you sure you want to remove user "${userId}"?`)) {
      saveUsers(users.filter(u => u.userId !== userId));
    }
  };

  const startEdit = (user) => {
    setEditingUserId(user.userId);
    setEditUsername(user.username);
  };

  const saveEdit = () => {
    if (!editUsername.trim()) return;
    const updated = users.map(u => 
      u.userId === editingUserId ? { ...u, username: editUsername.trim() } : u
    );
    saveUsers(updated);
    setEditingUserId(null);
    setEditUsername("");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditUsername("");
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdminAuthenticated");
    navigate("/login");
  };

  return (
    <div className="admin-dashboard-page">
      <div className="admin-header">
        <div className="admin-brand">
          <h1>ESSARFAB ADMIN PANEL</h1>
          <p>Manage Users for 3D Builder Access</p>
        </div>
        <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
      </div>

      <div className="admin-content">
        <div className="admin-section">
          <h3>Add New User</h3>
          <form onSubmit={addUser} className="add-user-form">
            <input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="User ID (e.g., sales001)"
              required
              style={{ flex: 1 }}
            />
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username (e.g., Rahul Gupta)"
              required
              style={{ flex: 1.5 }}
            />
            <button type="submit" className="btn btn-primary">Add User</button>
          </form>
        </div>

        <div className="admin-section">
          <h3>Authorized Users ({users.length})</h3>
          {users.length === 0 ? (
            <div className="empty-state">No users created yet. Add one above.</div>
          ) : (
            <div className="user-list">
              {users.map((user, index) => (
                <div key={index} className="user-item">
                  {editingUserId === user.userId ? (
                    <div className="user-edit-row">
                      <span className="user-id-text" style={{ minWidth: "100px" }}>{user.userId}</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="Username"
                        autoFocus
                        style={{ flex: 1.5 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                      <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <div className="user-display-row">
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="user-id-text">{user.userId}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.username}</span>
                      </div>
                      <div className="user-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => startEdit(user)}>Rename</button>
                        <button className="btn btn-remove btn-sm" onClick={() => removeUser(user.userId)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
