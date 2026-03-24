import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import AppLayout from './components/AppLayout';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Redirect authenticated users away from auth pages
function AuthRoute({ children }) {
  const token = localStorage.getItem('token');

  if (token) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthRoute>
              <Signup />
            </AuthRoute>
          }
        />

        {/* Protected routes — share the AppLayout shell (sidebar) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
}

export default App;