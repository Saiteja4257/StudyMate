import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import React from 'react';

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Workspace from "./pages/Workspace";
import StudyPlanner from "./pages/StudyPlanner";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Simple wrapper to redirect authenticated users away from public routes like login/register
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/space/:id"
        element={
          <ProtectedRoute>
            <Workspace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/study-planner"
        element={
          <ProtectedRoute>
            <StudyPlanner />
          </ProtectedRoute>
        }
      />

      {/* Legacy redirects */}
      <Route path="/workspace" element={<Navigate to="/home" replace />} />
      
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;