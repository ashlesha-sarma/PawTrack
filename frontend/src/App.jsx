import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Portal       from './pages/Portal';
import UserLayout   from './components/UserLayout';
import AdminLayout  from './components/AdminLayout';

import Landing      from './pages/user/Landing';
import Animals      from './pages/user/Animals';
import AnimalDetail from './pages/user/AnimalDetail';
import AdoptionForm from './pages/user/AdoptionForm';
import Donations    from './pages/user/Donations';
import DriveDetail  from './pages/user/DriveDetail';
import DonateForm   from './pages/user/DonateForm';
import Login        from './pages/user/Login';
import Register     from './pages/user/Register';
import Profile      from './pages/user/Profile';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAnimals  from './pages/admin/ManageAnimals';
import ManageDrives   from './pages/admin/ManageDrives';
import Requests       from './pages/admin/Requests';
import AdminLogin     from './pages/admin/AdminLogin';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Gate Portal */}
          <Route path="/"            element={<Portal />} />

          {/* Auth */}
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Site / User App */}
          <Route path="/home" element={<UserLayout />}>
            <Route index element={<Landing />} />
            <Route path="animals"      element={<Animals />} />
            <Route path="animals/:id"  element={<AnimalDetail />} />
            <Route path="adopt/:id"    element={<AdoptionForm />} />
            <Route path="donations"    element={<Donations />} />
            <Route path="donations/:id" element={<DriveDetail />} />
            <Route path="donate/:id"   element={<DonateForm />} />
            <Route path="profile"      element={<Profile />} />
          </Route>

          {/* Admin App */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard"      element={<AdminDashboard />} />
            <Route path="manage-animals" element={<ManageAnimals />} />
            <Route path="manage-drives"  element={<ManageDrives />} />
            <Route path="requests"       element={<Requests />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
