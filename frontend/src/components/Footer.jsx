import React from 'react';
import { Link } from 'react-router-dom';
import { BuildingIcon, LogoMark, MailIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-cream-200 bg-white dark:border-forest-800 dark:bg-forest-950">
      <div className="page-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terra-500 text-white">
                <LogoMark className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-forest-950 dark:text-cream-100">PawTrack</p>
                <p className="text-sm text-forest-500 dark:text-forest-400">Animal welfare initiative</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-forest-500 dark:text-forest-400">
              Explore
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                ['Animals', '/home/animals'],
                ['Donation Drives', '/home/donations'],
                ['Community Updates', '/home/explore'],
                ['Create Account', '/register'],
              ].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-forest-700 hover:text-terra-600 dark:text-forest-300 dark:hover:text-terra-300">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-forest-500 dark:text-forest-400">
              Contact
            </h4>
            <div className="space-y-3 text-sm text-forest-600 dark:text-forest-300">
              <div className="flex items-start gap-2.5">
                <BuildingIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-500" />
                  <p>Tezpur University</p>
              </div>
              <div className="flex items-center gap-2.5">
                <MailIcon className="h-4 w-4 flex-shrink-0 text-terra-500" />
                <p>campuspaws@test.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-cream-200 pt-6 text-sm text-forest-500 dark:border-forest-800 dark:text-forest-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 PawTrack. All rights reserved.</p>
          <p>Created by Ashlesha Sarma</p>
        </div>
      </div>
    </footer>
  );
}
