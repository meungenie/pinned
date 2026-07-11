import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getToken, removeToken } from "./utils/auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Groups from "./pages/Groups";
import GroupMap from "./pages/GroupMap";

const BASE_URL = "http://localhost:5001";

function App() {
  const [user, setUser] = useState(undefined); // undefined = 초기 로딩 중

  useEffect(() => {
    const token = getToken();
    if (!token) { setUser(null); return; }

    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setUser(data.success ? data.user : null))
      .catch(() => setUser(null));
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { removeToken(); setUser(null); };

  if (user === undefined) return null;

  const isLoggedIn = !!user;

  return (
    <Router>
      <Routes>
        {!isLoggedIn && (
          <>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
        {isLoggedIn && (
          <>
            <Route path="/groups" element={<Groups user={user} onLogout={handleLogout} />} />
            <Route path="/groups/:groupId" element={<GroupMap />} />
            <Route path="*" element={<Navigate to="/groups" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
