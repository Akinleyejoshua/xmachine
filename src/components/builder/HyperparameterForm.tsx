import React from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { OptimizerType, LossFunctionType } from '../../types/pipeline';
import { DOMAIN_CONFIGS } from '../../config/domain/registry';

export const HyperparameterForm: React.FC = () => {
  const { modelConfig, updateHyperparameters, currentProject } = usePipelineStore();

  if (!currentProject) return null;

  const { hyperparameters } = modelConfig;
  const activeConfig = DOMAIN_CONFIGS[currentProject.domain];
  const lossFunctions = activeConfig?.modelBuilder.lossFunctions || [];

  const handleParamChange = (name: string, value: any) => {
    updateHyperparameters({ [name]: value });
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6 space-y-6">
      <div className="pb-4 text-left">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Hyperparameters Config</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Configure parameters for compiling and fitting the TensorFlow.js model.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 text-left">
        
        <div>
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">Optimizer</label>
          <select
            value={hyperparameters.optimizer}
            onChange={(e) => handleParamChange('optimizer', e.target.value as OptimizerType)}
            className="w-full bg-white dark:bg-black rounded-lg px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
          >
            <option value="adam">Adam (Adaptive Moment Estimation)</option>
            <option value="sgd">SGD (Stochastic Gradient Descent)</option>
            <option value="rmsprop">RMSprop (Root Mean Squared Propagation)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">Loss Function</label>
          <select
            value={hyperparameters.loss}
            onChange={(e) => handleParamChange('loss', e.target.value as LossFunctionType)}
            className="w-full bg-white dark:bg-black rounded-lg px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
          >
            {lossFunctions.map(lf => (
              <option key={lf.id} value={lf.id}>{lf.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">Learning Rate</label>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            max="1"
            value={hyperparameters.learningRate}
            onChange={(e) => handleParamChange('learningRate', parseFloat(e.target.value) || 0.001)}
            className="w-full bg-white dark:bg-black rounded-lg px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">Batch Size</label>
          <input
            type="number"
            min="1"
            max="1024"
            value={hyperparameters.batchSize}
            onChange={(e) => handleParamChange('batchSize', parseInt(e.target.value) || 32)}
            className="w-full bg-white dark:bg-black rounded-lg px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">Epochs</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={hyperparameters.epochs}
            onChange={(e) => handleParamChange('epochs', parseInt(e.target.value) || 10)}
            className="w-full bg-white dark:bg-black rounded-lg px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
          />
        </div>

      </div>
    </div>
  );
};
