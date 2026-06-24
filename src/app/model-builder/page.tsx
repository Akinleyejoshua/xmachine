'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePipelineStore } from '../../store/usePipelineStore';
import { ModelBuilder } from '../../components/builder/ModelBuilder';
import { HyperparameterForm } from '../../components/builder/HyperparameterForm';

export default function ModelBuilderPage() {
  const { currentProject } = usePipelineStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentProject) {
      router.push('/');
    }
  }, [currentProject, router]);

  if (!currentProject) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <ModelBuilder />
      </div>
      <div>
        <HyperparameterForm />
      </div>
    </div>
  );
}
