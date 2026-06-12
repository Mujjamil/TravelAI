import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/common/ErrorBoundary'
import Layout from './components/Layout.jsx'
import ChatPage from './pages/ChatPage.jsx'
import TripsPage from './pages/TripsPage.jsx'
import ExplorePage from './pages/ExplorePage.jsx'
import TripDetailsPage from './pages/TripDetailsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import GuestRoute from './auth/GuestRoute.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login"          element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register"       element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat"              element={<ChatPage />} />
          <Route path="trips"             element={<TripsPage />} />
          <Route path="trips/:id/details" element={<TripDetailsPage />} />
          <Route path="explore"           element={<ExplorePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
