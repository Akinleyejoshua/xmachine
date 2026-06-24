import React, { useState, useMemo } from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { ModelLayer, LayerType } from '../../types/pipeline';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Network,
  Cpu, Layers, BarChart3, Save, RefreshCw, Info
} from 'lucide-react';

// ─── Layer colour map ──────────────────────────────────────────────────────────
const LAYER_COLORS: Record<string, string> = {
  conv2d:        'bg-royalblue-500/10 text-royalblue-600 dark:text-royalblue-400 border-royalblue-500/20',
  maxPooling2d:  'bg-purple-500/10   text-purple-600   dark:text-purple-400   border-purple-500/20',
  flatten:       'bg-neutral-500/10  text-neutral-600  dark:text-neutral-400  border-neutral-500/20',
  dense:         'bg-green-500/10    text-green-600    dark:text-green-400    border-green-500/20',
  dropout:       'bg-orange-500/10   text-orange-600   dark:text-orange-400   border-orange-500/20',
  embedding:     'bg-cyan-500/10     text-cyan-600     dark:text-cyan-400     border-cyan-500/20',
  lstm:          'bg-pink-500/10     text-pink-600     dark:text-pink-400     border-pink-500/20',
  gru:           'bg-rose-500/10     text-rose-600     dark:text-rose-400     border-rose-500/20',
  bidirectional: 'bg-amber-500/10    text-amber-600    dark:text-amber-400    border-amber-500/20',
  batchNorm:     'bg-teal-500/10     text-teal-600     dark:text-teal-400     border-teal-500/20',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const computeParamCount = (layer: ModelLayer, prev?: ModelLayer): number => {
  const cfg = layer.config;
  switch (layer.type) {
    case 'dense':
      return ((prev?.config?.units || 128) + 1) * (cfg.units || 64);
    case 'conv2d':
      return ((cfg.kernelSize || 3) ** 2 * (prev?.config?.filters || 3) + 1) * (cfg.filters || 32);
    case 'embedding':
      return (cfg.inputDim || 5000) * (cfg.outputDim || 128);
    case 'lstm':
    case 'gru': {
      const inputSize = prev?.config?.outputDim || prev?.config?.units || 64;
      const u = cfg.units || 64;
      const gate = layer.type === 'lstm' ? 4 : 3;
      return gate * ((inputSize + u) * u + u);
    }
    default: return 0;
  }
};

const formatParams = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

const ACTIVATION_OPTIONS = ['relu', 'sigmoid', 'softmax', 'tanh', 'leaky_relu', 'elu', 'selu', 'linear'];

const FieldInput: React.FC<{
  label: string; value: number | string; type?: string;
  step?: number; min?: number; max?: number;
  onChange: (v: any) => void;
}> = ({ label, value, type = 'number', step, min, max, onChange }) => (
  <div className="text-left">
    <label className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider block mb-1">{label}</label>
    <input
      type={type} step={step} min={min} max={max} value={value}
      onChange={e => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
      className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
    />
  </div>
);

const FieldSelect: React.FC<{
  label: string; value: string; options: string[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="text-left">
    <label className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider block mb-1">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const ModelBuilder: React.FC = () => {
  const {
    modelConfig, addLayer, removeLayer, updateLayerConfig, reorderLayers,
    updateHyperparameters, currentProject, etl, saveProjectProgress
  } = usePipelineStore();

  const [selectedLayerType, setSelectedLayerType] = useState<LayerType | ''>('');
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'hyperparams' | 'summary'>('layers');

  if (!currentProject) return null;

  const isCV = currentProject.domain === 'cv-classification' || currentProject.domain === 'object-detection';
  const hp = modelConfig.hyperparameters;
  const layers = modelConfig.layers;
  const classCount = etl.classNames?.length || 0;

  // ── Computed model stats ──
  const totalParams = useMemo(() =>
    layers.reduce((sum, layer, i) => sum + computeParamCount(layer, layers[i - 1]), 0),
    [layers]
  );
  const layerCount = layers.length;

  const handleAddLayer = () => {
    if (!selectedLayerType) return;
    const defaults: Record<string, Record<string, any>> = {
      conv2d:        { filters: 32, kernelSize: 3, activation: 'relu', padding: 'same', dropout: 0 },
      maxPooling2d:  { poolSize: 2, strides: 2 },
      flatten:       {},
      dense:         { units: 64, activation: 'relu', dropout: 0, l2: 0 },
      dropout:       { rate: 0.25 },
      embedding:     { inputDim: 5000, outputDim: 128, inputLength: 100 },
      lstm:          { units: 64, returnSequences: false, dropout: 0, recurrentDropout: 0 },
      gru:           { units: 64, returnSequences: false, dropout: 0 },
      bidirectional: { units: 64, returnSequences: false },
      batchNorm:     { momentum: 0.99, epsilon: 0.001 },
    };
    const newLayer: ModelLayer = {
      id: Math.random().toString(36).substring(7),
      type: selectedLayerType as LayerType,
      config: defaults[selectedLayerType] || {},
    };
    addLayer(newLayer);
    setSelectedLayerType('');
    setExpandedLayer(newLayer.id);
  };

  const moveLayer = (index: number, dir: 'up' | 'down') => {
    const arr = [...layers];
    const ti = dir === 'up' ? index - 1 : index + 1;
    if (ti < 0 || ti >= arr.length) return;
    [arr[index], arr[ti]] = [arr[ti], arr[index]];
    reorderLayers(arr);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await saveProjectProgress(); } finally { setSaving(false); }
  };

  const TAB_BTN = (id: typeof activeTab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
        activeTab === id
          ? 'bg-white dark:bg-neutral-950 text-royalblue-500 shadow-sm'
          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
      }`}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-900 dark:text-white">Module C: Neural Network Architect</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Design your model topology, hyperparameters, and inspect the model summary.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-royalblue-600 hover:bg-royalblue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Model
        </button>
      </div>

      {/* Quick stat strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Layers', value: layerCount, icon: <Layers className="w-3.5 h-3.5 text-royalblue-500" /> },
          { label: 'Parameters', value: formatParams(totalParams), icon: <Cpu className="w-3.5 h-3.5 text-green-500" /> },
          { label: 'Output Classes', value: classCount || '—', icon: <BarChart3 className="w-3.5 h-3.5 text-amber-500" /> },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-neutral-950 rounded-xl p-4 text-center shadow-sm">
            <div className="flex justify-center mb-1.5">{s.icon}</div>
            <p className="text-lg font-black text-neutral-900 dark:text-white font-mono">{s.value}</p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar - scrollable on mobile */}
      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl overflow-x-auto scrollbar-none w-full sm:w-fit">
        {TAB_BTN('layers',      'Layer Stack',     <Network className="w-3.5 h-3.5" />)}
        {TAB_BTN('hyperparams', 'Hyperparams', <Cpu className="w-3.5 h-3.5" />)}
        {TAB_BTN('summary',     'Summary',   <BarChart3 className="w-3.5 h-3.5" />)}
      </div>

      {/* ── TAB: Layers ── */}
      {activeTab === 'layers' && (
        <div className="space-y-5">
          {/* Add layer bar */}
          <div className="flex gap-2">
            <select
              value={selectedLayerType}
              onChange={e => setSelectedLayerType(e.target.value as LayerType)}
              className="flex-1 bg-white dark:bg-neutral-950 rounded-xl px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500 shadow-sm"
            >
              <option value="">Add layer to architecture...</option>
              {isCV ? (
                <>
                  <optgroup label="Convolutional">
                    <option value="conv2d">Conv2D — Convolutional</option>
                    <option value="maxPooling2d">MaxPooling2D</option>
                    <option value="flatten">Flatten</option>
                  </optgroup>
                  <optgroup label="Fully Connected">
                    <option value="dense">Dense — Fully Connected</option>
                    <option value="dropout">Dropout</option>
                    <option value="batchNorm">Batch Normalization</option>
                  </optgroup>
                </>
              ) : (
                <>
                  <optgroup label="Sequence / Embedding">
                    <option value="embedding">Embedding</option>
                    <option value="lstm">LSTM</option>
                    <option value="gru">GRU</option>
                    <option value="bidirectional">Bidirectional</option>
                  </optgroup>
                  <optgroup label="Fully Connected">
                    <option value="dense">Dense — Fully Connected</option>
                    <option value="dropout">Dropout</option>
                    <option value="batchNorm">Batch Normalization</option>
                  </optgroup>
                </>
              )}
            </select>
            <button
              onClick={handleAddLayer}
              disabled={!selectedLayerType}
              className="px-4 py-2.5 bg-royalblue-600 hover:bg-royalblue-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Append
            </button>
          </div>

          {/* Layers */}
          <div className="space-y-3">
            {layers.length === 0 && (
              <div className="p-10 bg-white dark:bg-neutral-950 rounded-2xl text-center text-xs text-neutral-400 shadow-sm">
                <Network className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                No layers yet. Select a layer type above and click Append.
              </div>
            )}

            {layers.map((layer, index) => {
              const colorCls = LAYER_COLORS[layer.type] || LAYER_COLORS.dense;
              const params = computeParamCount(layer, layers[index - 1]);
              const isExpanded = expandedLayer === layer.id;

              return (
                <div key={layer.id} className="bg-white dark:bg-neutral-950 rounded-xl shadow-sm overflow-hidden">
                  {/* Layer header row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                    onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900 text-[9px] font-mono font-bold text-neutral-500">
                        {index}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono uppercase ${colorCls}`}>
                        {layer.type}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono hidden sm:block">
                        {layer.type === 'dense' && `units=${layer.config.units} · act=${layer.config.activation}`}
                        {layer.type === 'conv2d' && `filters=${layer.config.filters} · k=${layer.config.kernelSize}×${layer.config.kernelSize}`}
                        {layer.type === 'maxPooling2d' && `pool=${layer.config.poolSize}×${layer.config.poolSize}`}
                        {layer.type === 'dropout' && `rate=${layer.config.rate}`}
                        {(layer.type === 'lstm' || layer.type === 'gru') && `units=${layer.config.units}`}
                        {layer.type === 'embedding' && `${layer.config.inputDim}→${layer.config.outputDim}`}
                        {layer.type === 'batchNorm' && `mom=${layer.config.momentum}`}
                        {layer.type === 'flatten' && 'flattens spatial dims'}
                        {layer.type === 'bidirectional' && `units=${layer.config.units}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {params > 0 && (
                        <span className="text-[10px] text-neutral-400 font-mono hidden sm:block">{formatParams(params)} params</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); moveLayer(index, 'up'); }} disabled={index === 0}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-white disabled:opacity-20 transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); moveLayer(index, 'down'); }} disabled={index === layers.length - 1}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-white disabled:opacity-20 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                        className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
                    </div>
                  </div>

                  {/* Expanded params */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-neutral-900">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-3">

                        {/* Conv2D */}
                        {layer.type === 'conv2d' && (<>
                          <FieldInput label="Filters" value={layer.config.filters || 32} min={1}
                            onChange={v => updateLayerConfig(layer.id, { filters: v })} />
                          <FieldInput label="Kernel Size" value={layer.config.kernelSize || 3} min={1}
                            onChange={v => updateLayerConfig(layer.id, { kernelSize: v })} />
                          <FieldSelect label="Activation" value={layer.config.activation || 'relu'} options={ACTIVATION_OPTIONS}
                            onChange={v => updateLayerConfig(layer.id, { activation: v })} />
                          <FieldSelect label="Padding" value={layer.config.padding || 'same'} options={['same', 'valid']}
                            onChange={v => updateLayerConfig(layer.id, { padding: v })} />
                          <FieldInput label="Stride" value={layer.config.strides || 1} min={1}
                            onChange={v => updateLayerConfig(layer.id, { strides: v })} />
                          <FieldInput label="Dropout After" value={layer.config.dropout || 0} step={0.05} min={0} max={0.9}
                            onChange={v => updateLayerConfig(layer.id, { dropout: v })} />
                        </>)}

                        {/* MaxPool */}
                        {layer.type === 'maxPooling2d' && (<>
                          <FieldInput label="Pool Size" value={layer.config.poolSize || 2} min={1}
                            onChange={v => updateLayerConfig(layer.id, { poolSize: v })} />
                          <FieldInput label="Strides" value={layer.config.strides || 2} min={1}
                            onChange={v => updateLayerConfig(layer.id, { strides: v })} />
                        </>)}

                        {/* Dense */}
                        {layer.type === 'dense' && (<>
                          <FieldInput label="Units" value={layer.config.units || 64} min={1}
                            onChange={v => updateLayerConfig(layer.id, { units: v })} />
                          <FieldSelect label="Activation" value={layer.config.activation || 'relu'} options={ACTIVATION_OPTIONS}
                            onChange={v => updateLayerConfig(layer.id, { activation: v })} />
                          <FieldInput label="Dropout" value={layer.config.dropout || 0} step={0.05} min={0} max={0.9}
                            onChange={v => updateLayerConfig(layer.id, { dropout: v })} />
                          <FieldInput label="L2 Reg" value={layer.config.l2 || 0} step={0.0001} min={0}
                            onChange={v => updateLayerConfig(layer.id, { l2: v })} />
                        </>)}

                        {/* Dropout */}
                        {layer.type === 'dropout' && (
                          <FieldInput label="Rate (0–1)" value={layer.config.rate || 0.25} step={0.05} min={0} max={0.9}
                            onChange={v => updateLayerConfig(layer.id, { rate: v })} />
                        )}

                        {/* Embedding */}
                        {layer.type === 'embedding' && (<>
                          <FieldInput label="Input Dim (vocab)" value={layer.config.inputDim || 5000} min={1}
                            onChange={v => updateLayerConfig(layer.id, { inputDim: v })} />
                          <FieldInput label="Output Dim" value={layer.config.outputDim || 128} min={1}
                            onChange={v => updateLayerConfig(layer.id, { outputDim: v })} />
                          <FieldInput label="Input Length" value={layer.config.inputLength || 100} min={1}
                            onChange={v => updateLayerConfig(layer.id, { inputLength: v })} />
                        </>)}

                        {/* LSTM */}
                        {layer.type === 'lstm' && (<>
                          <FieldInput label="Units" value={layer.config.units || 64} min={1}
                            onChange={v => updateLayerConfig(layer.id, { units: v })} />
                          <FieldSelect label="Return Sequences" value={String(layer.config.returnSequences || false)} options={['true', 'false']}
                            onChange={v => updateLayerConfig(layer.id, { returnSequences: v === 'true' })} />
                          <FieldInput label="Dropout" value={layer.config.dropout || 0} step={0.05} min={0} max={0.9}
                            onChange={v => updateLayerConfig(layer.id, { dropout: v })} />
                          <FieldInput label="Recurrent Dropout" value={layer.config.recurrentDropout || 0} step={0.05} min={0} max={0.9}
                            onChange={v => updateLayerConfig(layer.id, { recurrentDropout: v })} />
                        </>)}

                        {/* GRU */}
                        {layer.type === 'gru' && (<>
                          <FieldInput label="Units" value={layer.config.units || 64} min={1}
                            onChange={v => updateLayerConfig(layer.id, { units: v })} />
                          <FieldSelect label="Return Sequences" value={String(layer.config.returnSequences || false)} options={['true', 'false']}
                            onChange={v => updateLayerConfig(layer.id, { returnSequences: v === 'true' })} />
                          <FieldInput label="Dropout" value={layer.config.dropout || 0} step={0.05} min={0} max={0.9}
                            onChange={v => updateLayerConfig(layer.id, { dropout: v })} />
                        </>)}

                        {/* Bidirectional */}
                        {layer.type === 'bidirectional' && (<>
                          <FieldInput label="Units" value={layer.config.units || 64} min={1}
                            onChange={v => updateLayerConfig(layer.id, { units: v })} />
                          <FieldSelect label="Return Sequences" value={String(layer.config.returnSequences || false)} options={['true', 'false']}
                            onChange={v => updateLayerConfig(layer.id, { returnSequences: v === 'true' })} />
                        </>)}

                        {/* BatchNorm */}
                        {layer.type === 'batchNorm' && (<>
                          <FieldInput label="Momentum" value={layer.config.momentum || 0.99} step={0.001} min={0} max={1}
                            onChange={v => updateLayerConfig(layer.id, { momentum: v })} />
                          <FieldInput label="Epsilon" value={layer.config.epsilon || 0.001} step={0.0001} min={0}
                            onChange={v => updateLayerConfig(layer.id, { epsilon: v })} />
                        </>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Hyperparameters ── */}
      {activeTab === 'hyperparams' && (
        <div className="bg-white dark:bg-neutral-950 rounded-2xl p-6 shadow-sm space-y-5 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Optimizer</label>
              <select value={hp.optimizer} onChange={e => updateHyperparameters({ optimizer: e.target.value as any })}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500">
                <option value="adam">Adam — Adaptive Moment Estimation</option>
                <option value="sgd">SGD — Stochastic Gradient Descent</option>
                <option value="rmsprop">RMSprop — Root Mean Square Prop</option>
                <option value="adamw">AdamW — Adam with Weight Decay</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Loss Function</label>
              <select value={hp.loss} onChange={e => updateHyperparameters({ loss: e.target.value as any })}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500">
                <option value="categoricalCrossentropy">Categorical Crossentropy (multiclass)</option>
                <option value="binaryCrossentropy">Binary Crossentropy (binary)</option>
                <option value="sparseCategoricalCrossentropy">Sparse Categorical Crossentropy</option>
                <option value="meanSquaredError">Mean Squared Error (MSE)</option>
                <option value="meanAbsoluteError">Mean Absolute Error (MAE)</option>
                <option value="huber">Huber Loss (robust regression)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Learning Rate</label>
              <input type="number" step="0.0001" min="0.00001" max="1" value={hp.learningRate}
                onChange={e => updateHyperparameters({ learningRate: parseFloat(e.target.value) || 0.001 })}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl px-3 py-2.5 text-xs font-mono text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
              <div className="flex gap-1.5 pt-1">
                {[0.1, 0.01, 0.001, 0.0001].map(v => (
                  <button key={v} onClick={() => updateHyperparameters({ learningRate: v })}
                    className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                      hp.learningRate === v ? 'bg-royalblue-500/10 text-royalblue-500' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Batch Size</label>
              <select value={hp.batchSize} onChange={e => updateHyperparameters({ batchSize: parseInt(e.target.value) })}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500">
                {[8, 16, 32, 64, 128, 256, 512].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Epochs</label>
              <input type="number" min={1} max={5000} value={hp.epochs}
                onChange={e => updateHyperparameters({ epochs: parseInt(e.target.value) || 10 })}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl px-3 py-2.5 text-xs font-mono text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
              <div className="flex gap-1.5 pt-1">
                {[10, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => updateHyperparameters({ epochs: v })}
                    className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                      hp.epochs === v ? 'bg-royalblue-500/10 text-royalblue-500' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Metrics to Track</label>
              <div className="flex flex-wrap gap-2">
                {['accuracy', 'val_accuracy', 'precision', 'recall', 'f1_score', 'auc'].map(m => (
                  <span key={m} className="text-[10px] px-2 py-0.5 rounded-md bg-royalblue-500/10 text-royalblue-500 font-mono font-semibold">
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-neutral-400 mt-1">Standard metrics tracked during fitting. Extend in backend configuration.</p>
            </div>

          </div>
        </div>
      )}

      {/* ── TAB: Model Summary ── */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {layers.length === 0 ? (
            <div className="p-10 bg-white dark:bg-neutral-950 rounded-2xl text-center text-xs text-neutral-400 shadow-sm">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
              Add layers to see the model summary.
            </div>
          ) : (
            <div className="bg-neutral-950 rounded-2xl overflow-hidden shadow-lg">
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-royalblue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Model: {currentProject.name}</span>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono">Domain: {currentProject.domain} · Optimizer: {hp.optimizer} · Loss: {hp.loss}</p>
              </div>

              {/* Summary table */}
              <div className="px-4 sm:px-6 py-2 overflow-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] text-neutral-500 uppercase tracking-widest border-b border-white/5">
                      <th className="py-3 pr-4">#</th>
                      <th className="py-3 pr-4">Layer (type)</th>
                      <th className="py-3 pr-4 text-right">Output Shape</th>
                      <th className="py-3 text-right">Param #</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {layers.map((layer, i) => {
                      const params = computeParamCount(layer, layers[i - 1]);
                      const colorCls = LAYER_COLORS[layer.type] || LAYER_COLORS.dense;

                      const outputShape = (() => {
                        if (layer.type === 'dense') return `(None, ${layer.config.units})`;
                        if (layer.type === 'conv2d') return `(None, ?, ?, ${layer.config.filters})`;
                        if (layer.type === 'maxPooling2d') return `(None, ?, ?, ?)`;
                        if (layer.type === 'flatten') return `(None, ?)`;
                        if (layer.type === 'dropout') return 'same as input';
                        if (layer.type === 'batchNorm') return 'same as input';
                        if (layer.type === 'embedding') return `(None, ${layer.config.inputLength}, ${layer.config.outputDim})`;
                        if (layer.type === 'lstm' || layer.type === 'gru')
                          return layer.config.returnSequences ? `(None, ?, ${layer.config.units})` : `(None, ${layer.config.units})`;
                        if (layer.type === 'bidirectional') return `(None, ${(layer.config.units || 64) * 2})`;
                        return '(None, ?)';
                      })();

                      return (
                        <tr key={layer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2.5 pr-4 text-neutral-600">{i}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-bold font-mono ${colorCls}`}>
                              {layer.type}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-right text-neutral-400 text-[10px]">{outputShape}</td>
                          <td className={`py-2.5 text-right text-[10px] font-bold ${params > 0 ? 'text-white' : 'text-neutral-600'}`}>
                            {params > 0 ? params.toLocaleString() : '0'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10">
                      <td colSpan={3} className="pt-3 pb-2 text-[10px] text-neutral-500 uppercase tracking-wider">Total Trainable Parameters</td>
                      <td className="pt-3 pb-2 text-right font-bold text-royalblue-400 font-mono text-xs">{totalParams.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="pb-4 text-[10px] text-neutral-500 uppercase tracking-wider">Estimated Memory (fp32)</td>
                      <td className="pb-4 text-right text-neutral-400 font-mono text-[10px]">{(totalParams * 4 / 1024 / 1024).toFixed(2)} MB</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
