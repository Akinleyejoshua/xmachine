'use client';

import React, { useEffect } from 'react';
import { usePipelineStore } from '../store/usePipelineStore';
import { ProjectWizard } from '../components/ProjectWizard';
import { ETLCanvas } from '../components/etl/ETLCanvas';
import { ModelBuilder } from '../components/builder/ModelBuilder';
import { HyperparameterForm } from '../components/builder/HyperparameterForm';
import { TrainingMonitor } from '../components/training/TrainingMonitor';
import { Sandbox } from '../components/inference/Sandbox';
import { BrainCircuit, LogOut, Sun, Moon } from 'lucide-react';

export default function WorkspacePage() {
  const { currentProject, resetProject, theme, toggleTheme } = usePipelineStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  return (
    <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans pb-16 transition-colors duration-200">
      {/* onboarding Wizard forces initialization */}
      <ProjectWizard />

      {/* Main Workspace Frame */}
      {currentProject && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 pt-4 sm:pt-8 animate-in fade-in duration-500">
          
          {/* Header Dashboard */}
          <header className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl px-4 sm:px-6 py-4 sm:py-5 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-royalblue-500/10 rounded-lg shrink-0">
                <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-royalblue-600 dark:text-royalblue-400" />
              </div>
              <div className="text-left min-w-0">
                <h1 className="font-extrabold text-sm tracking-wide text-neutral-900 dark:text-white font-mono uppercase truncate">{currentProject.name}</h1>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">Domain: <span className="font-semibold text-royalblue-600 dark:text-royalblue-400 capitalize">{currentProject.domain.replace(/-/g, ' ')}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-black dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-300 rounded-lg transition-all"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-royalblue-600" />}
              </button>

              <button
                onClick={resetProject}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-black text-neutral-600 dark:text-neutral-400 dark:hover:text-white rounded-lg text-xs font-semibold transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Exit</span>
              </button>
            </div>
          </header>

          {/* ETL Ingestion */}
          <section className="bg-transparent overflow-hidden">
            <ETLCanvas />
          </section>

          {/* Model Customizer & Architectures */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
            <div className="xl:col-span-2 bg-transparent overflow-hidden">
              <ModelBuilder />
            </div>
            <div className="bg-transparent overflow-hidden">
              <HyperparameterForm />
            </div>
          </section>

          {/* Training Monitor */}
          <section className="bg-transparent overflow-hidden">
            <TrainingMonitor />
          </section>

          {/* Sandbox Playground */}
          <section className="bg-transparent overflow-hidden">
            <Sandbox />
          </section>

        </div>
      )}
    </main>
  );
}
