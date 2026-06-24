'use client';

import React from 'react';
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
  Moon
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { currentProject, resetProject, theme, toggleTheme } = usePipelineStore();

  if (!currentProject) return null;

  const links = [
    { href: '/etl', label: 'ETL Pipeline', icon: <Database className="w-4 h-4" /> },
    { href: '/model-builder', label: 'Model Builder', icon: <Cpu className="w-4 h-4" /> },
    { href: '/training', label: 'Live Training', icon: <PlayCircle className="w-4 h-4" /> },
    { href: '/sandbox', label: 'Inference Sandbox', icon: <Terminal className="w-4 h-4" /> },
    { href: '/docs', label: 'Documentation', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-white dark:bg-neutral-900 sticky top-0 z-40 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Project Info */}
          <Link href="/" className="flex items-center gap-3">
            <div className="p-1.5 bg-royalblue-500/10 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-royalblue-600 dark:text-royalblue-400" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-xs tracking-wider text-neutral-900 dark:text-white uppercase font-mono">
                {currentProject.name}
              </span>
              <p className="text-[9px] text-neutral-500 dark:text-neutral-400 font-sans leading-none uppercase">
                {currentProject.domain.replace(/-/g, ' ')}
              </p>
            </div>
          </Link>

          {/* Links */}
          <nav className="hidden md:flex space-x-1">
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

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-300 rounded-lg transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-royalblue-600" />}
            </button>

            <button
              onClick={resetProject}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 dark:hover:text-white rounded-lg text-xs font-semibold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
