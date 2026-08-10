import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { refreshAccessToken, logoutUser } from "./api/authApi";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Groups from "./pages/Groups";
import GroupMap from "./pages/GroupMap";

function App() {
  const [user, setUser] = useState(undefined); // undefined = 초기 로딩 중

  useEffect(() => {
    // 페이지 로드 시 httpOnly 쿠키로 세션 복원 시도
    refreshAccessToken()
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

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
