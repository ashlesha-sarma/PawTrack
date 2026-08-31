import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function UserLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-100 dark:bg-forest-950">
      <Navbar />
      <main className="flex-1 pt-[4.5rem]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
