'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePipelineStore } from '../../store/usePipelineStore';
import { TrainingMonitor } from '../../components/training/TrainingMonitor';

export default function TrainingPage() {
  const { currentProject } = usePipelineStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentProject) {
      router.push('/');
    }
  }, [currentProject, router]);

  if (!currentProject) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <TrainingMonitor />
    </div>
  );
}
