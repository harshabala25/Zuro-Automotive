import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import LoadingScreen from "./pages/LoadingScreen";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CarBuy from "./pages/CarBuy";
import Profile from "./pages/Profile";
import CarSell from "./pages/CarSell";
import CarListing from "./pages/CarListing";
import PrivacyPolicy from "./pages/Privacy";
import TermsOfService from "./pages/Terms";
import Message from "./pages/Messages";
import AdminPanel from "./pages/AdminPanel";
import '@tabler/icons-webfont/dist/tabler-icons.css'

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event === 'TOKEN_REFRESHED')) {
        navigate('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/buy" element={<CarBuy />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/sell" element={<CarSell />} />
      <Route path="/listing/:id" element={<CarListing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/messages" element={<Message />} />
    </Routes>
  );
}

export default function App() {
  return <AppContent />;
}