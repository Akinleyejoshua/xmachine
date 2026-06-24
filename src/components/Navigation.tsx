'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePipelineStore } from '../store/usePipelineStore';
import { 
  Database, 
  Cpu, 
  PlayCircle, 
  Terminal, 
  BookOpen, 
  BrainCircuit, 
  LogOut,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { currentProject, resetProject, theme, toggleTheme } = usePipelineStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  if (!currentProject) return null;

  const links = [
    { href: '/etl', label: 'ETL Pipeline', icon: <Database className="w-4 h-4" /> },
    { href: '/model-builder', label: 'Model Builder', icon: <Cpu className="w-4 h-4" /> },
    { href: '/training', label: 'Live Training', icon: <PlayCircle className="w-4 h-4" /> },
    { href: '/sandbox', label: 'Inference Sandbox', icon: <Terminal className="w-4 h-4" /> },
    { href: '/docs', label: 'Documentation', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="bg-white dark:bg-neutral-900 sticky top-0 z-40 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Logo / Project Info */}
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-royalblue-500/10 rounded-lg shrink-0">
                <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-royalblue-600 dark:text-royalblue-400" />
              </div>
              <div className="text-left min-w-0">
                <span className="font-extrabold text-[11px] sm:text-xs tracking-wider text-neutral-900 dark:text-white uppercase font-mono truncate block max-w-[120px] sm:max-w-none">
                  {currentProject.name}
                </span>
                <p className="text-[9px] text-neutral-500 dark:text-neutral-400 font-sans leading-none uppercase hidden xs:block">
                  {currentProject.domain.replace(/-/g, ' ')}
                </p>
              </div>
            </Link>

            {/* Desktop Links */}
            <nav className="hidden lg:flex space-x-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-royalblue-500/10 text-royalblue-600 dark:text-royalblue-400'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg transition-all"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-royalblue-600" />}
              </button>

              {/* Desktop Exit Button */}
              <button
                onClick={resetProject}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 dark:hover:text-white rounded-lg text-xs font-semibold transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Exit</span>
              </button>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="lg:hidden p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg transition-all"
                aria-label="Open menu"
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white dark:bg-neutral-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
        mobileOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-royalblue-500/10 rounded-lg">
              <BrainCircuit className="w-4 h-4 text-royalblue-600 dark:text-royalblue-400" />
            </div>
            <span className="font-extrabold text-xs tracking-wider text-neutral-900 dark:text-white uppercase font-mono">
              ML-Studio
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project badge */}
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono mb-0.5">Active Project</p>
          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{currentProject.name}</p>
          <p className="text-[10px] text-royalblue-500 capitalize">{currentProject.domain.replace(/-/g, ' ')}</p>
        </div>

        {/* Nav Links */}
        <nav className="px-3 py-4 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-royalblue-500/10 text-royalblue-600 dark:text-royalblue-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-royalblue-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={() => { resetProject(); setMobileOpen(false); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-xl text-sm font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            Exit Project
          </button>
        </div>
      </aside>
    </>
  );
};
