'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePipelineStore } from '../../store/usePipelineStore';
import { 
  BookOpen, 
  Database, 
  Cpu, 
  PlayCircle, 
  Terminal, 
  Compass,
  ArrowRight
} from 'lucide-react';

export default function DocsPage() {
  const { currentProject } = usePipelineStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentProject) {
      router.push('/');
    }
  }, [currentProject, router]);

  if (!currentProject) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-left">
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-8 space-y-8 shadow-sm">
        
        {/* Title */}
        <div className="flex items-center gap-3 pb-6">
          <div className="p-2 bg-royalblue-500/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-royalblue-600 dark:text-royalblue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Workspace User Guide</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Step-by-step instructions to train models using the ML-Studio-Web engine.</p>
          </div>
        </div>

        {/* Introduction */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-royalblue-500" />
            <span>Introduction</span>
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            ML-Studio-Web is an end-to-end playground designed to build, pre-process, train, and test TensorFlow.js networks directly inside your web application. The platform coordinates client-side execution using web worker threads and synchronizes checkpoint progress logs with your Mongoose/MongoDB backend database.
          </p>
        </div>

        {/* Modules Breakdown */}
        <div className="space-y-6">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Workspace Operations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Step 1 */}
            <div className="p-6 rounded-xl space-y-2 bg-white dark:bg-neutral-950 shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-royalblue-500" />
                <span className="text-xs font-bold text-neutral-800 dark:text-white">1. ETL & Data Processing</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Import CSVs, JSON arrays, text corpora, or raw image files. You can select entire directories/folders via the <strong>Browse Folder</strong> button. Add transformations to clean, scale, and resize inputs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl space-y-2 bg-white dark:bg-neutral-950 shadow-sm">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-royalblue-500" />
                <span className="text-xs font-bold text-neutral-800 dark:text-white">2. Layer Architecting</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Stack layer dimensions dynamically. Computer Vision modes load convolutional layers, pooling, flattening, and dense outputs. NLP domains load embeddings, LSTMs, or GRUs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl space-y-2 bg-white dark:bg-neutral-950 shadow-sm">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-royalblue-500" />
                <span className="text-xs font-bold text-neutral-800 dark:text-white">3. Training Configuration</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Tune epochs, optimizer configurations (Adam, SGD, RMSprop), and learning rates. Click <strong>Start Training</strong> to run fitting sessions. Checkpoint data automatically updates in your DB.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-xl space-y-2 bg-white dark:bg-neutral-950 shadow-sm">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-royalblue-500" />
                <span className="text-xs font-bold text-neutral-800 dark:text-white">4. Sandbox Testing</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Upload raw test items or enter text phrases. Run prediction calls on local parameters to check accuracy levels and latency statistics.
              </p>
            </div>

          </div>
        </div>

        {/* Getting Started Quick Link */}
        <div className="pt-6 flex justify-end">
          <button
            onClick={() => router.push('/etl')}
            className="flex items-center gap-2 px-4 py-2.5 bg-royalblue-600 hover:bg-royalblue-500 text-white rounded-lg text-xs font-semibold transition-all group"
          >
            <span>Proceed to Ingestion</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </div>
  );
}
