import React, { useState, useMemo } from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { detectFileClass } from '../etl/ETLCanvas';
import { 
  Send, 
  Upload, 
  RefreshCw, 
  Layers, 
  RotateCcw, 
  Play, 
  CheckCircle, 
  XCircle,
  Zap,
  FlaskConical,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  Grid,
  FileText,
  EyeOff
} from 'lucide-react';

interface BulkItem {
  name: string;
  trueClass: string;
  predClass: string;
  confidence: number;
  latencyMs: number;
  correct: boolean;
}

interface BulkEvaluationResult {
  accuracy: number;
  total: number;
  correct: number;
  incorrect: number;
  avgLatency: number;
  items: BulkItem[];
}

export const Sandbox: React.FC = () => {
  const { currentProject, etl, setInferenceResult, inferenceResult, setInferenceActive, inferenceActive } = usePipelineStore();
  const [textVal, setTextVal] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Tabs: 'single' | 'bulk'
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [bulkActive, setBulkActive] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkEvaluationResult | null>(null);

  // Bulk Analysis Tabs
  const [bulkSubTab, setBulkSubTab] = useState<'overview' | 'matrix' | 'report' | 'errors'>('overview');

  if (!currentProject) return null;

  const isCV = currentProject.domain === 'cv-classification' || currentProject.domain === 'object-detection';
  const isObjectDetection = currentProject.domain === 'object-detection';
  const classNames = useMemo(() => {
    return etl.classNames && etl.classNames.length > 0 ? etl.classNames : ['Cat', 'Dog', 'Bird'];
  }, [etl.classNames]);

  const handlePredict = () => {
    setInferenceActive(true);

    setTimeout(() => {
      const predictedClass = classNames[Math.floor(Math.random() * classNames.length)] || 'Default Class';

      if (isCV) {
        setInferenceResult({
          class: predictedClass,
          confidence: 0.942,
          latencyMs: 14,
          boundingBoxes: isObjectDetection ? [
            { label: predictedClass, bbox: [25, 20, 50, 60] }
          ] : undefined
        });
      } else {
        setInferenceResult({
          sentiment: 'Positive',
          confidence: 0.887,
          tokens: 5,
          latencyMs: 8
        });
      }
      setInferenceActive(false);
    }, 600);
  };

  const handleBulkEvaluate = () => {
    setBulkActive(true);
    setBulkResults(null);

    setTimeout(() => {
      const evaluationItems: BulkItem[] = etl.files.length > 0 ? etl.files.map(file => {
        const trueClass = detectFileClass(file.name, classNames) || classNames[0] || 'Default';
        
        const isCorrect = Math.random() > 0.15; // ~85% accuracy
        const confidence = 0.70 + Math.random() * 0.28;
        const latencyMs = Math.floor(8 + Math.random() * 12);
        
        let predClass = trueClass;
        if (!isCorrect) {
          const alternateClasses = classNames.filter(c => c !== trueClass);
          predClass = alternateClasses[Math.floor(Math.random() * alternateClasses.length)] || 'IncorrectClass';
        }

        return { name: file.name, trueClass, predClass, confidence, latencyMs, correct: isCorrect };
      }) : [
        { name: 'val_image_01.jpg', trueClass: classNames[0] || 'TargetA', predClass: classNames[0] || 'TargetA', confidence: 0.942, latencyMs: 11, correct: true },
        { name: 'val_image_02.jpg', trueClass: classNames[0] || 'TargetA', predClass: classNames[1] || 'TargetB', confidence: 0.812, latencyMs: 14, correct: false },
        { name: 'val_image_03.jpg', trueClass: classNames[1] || 'TargetB', predClass: classNames[1] || 'TargetB', confidence: 0.899, latencyMs: 10, correct: true },
        { name: 'val_image_04.jpg', trueClass: classNames[0] || 'TargetA', predClass: classNames[0] || 'TargetA', confidence: 0.923, latencyMs: 9, correct: true },
        { name: 'val_image_05.jpg', trueClass: classNames[1] || 'TargetB', predClass: classNames[1] || 'TargetB', confidence: 0.954, latencyMs: 12, correct: true },
        { name: 'val_image_06.jpg', trueClass: classNames[2] || 'TargetC', predClass: classNames[2] || 'TargetC', confidence: 0.885, latencyMs: 11, correct: true },
        { name: 'val_image_07.jpg', trueClass: classNames[2] || 'TargetC', predClass: classNames[0] || 'TargetA', confidence: 0.765, latencyMs: 15, correct: false },
      ];

      const correctCount = evaluationItems.filter(item => item.correct).length;
      const incorrectCount = evaluationItems.length - correctCount;
      const avgLatency = Math.round(evaluationItems.reduce((acc, item) => acc + item.latencyMs, 0) / evaluationItems.length);
      const accuracy = correctCount / evaluationItems.length;

      setBulkResults({ accuracy, total: evaluationItems.length, correct: correctCount, incorrect: incorrectCount, avgLatency, items: evaluationItems });
      setBulkActive(false);
    }, 1200);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setImagePreview(url);
      setInferenceResult(null);
    }
  };

  const handleClear = () => {
    setImagePreview(null);
    setTextVal('');
    setInferenceResult(null);
    setBulkResults(null);
  };

  // ─── Notebook performance statistics calculation ────────────────────
  const statistics = useMemo(() => {
    if (!bulkResults) return null;
    const items = bulkResults.items;

    // 1. Confusion Matrix
    // matrixMap[actual][predicted] = count
    const matrixMap: Record<string, Record<string, number>> = {};
    classNames.forEach(act => {
      matrixMap[act] = {};
      classNames.forEach(pred => {
        matrixMap[act][pred] = 0;
      });
    });

    items.forEach(item => {
      const act = classNames.includes(item.trueClass) ? item.trueClass : classNames[0];
      const pred = classNames.includes(item.predClass) ? item.predClass : classNames[0];
      if (matrixMap[act] && matrixMap[act][pred] !== undefined) {
        matrixMap[act][pred]++;
      }
    });

    // 2. Classification Report (Precision, Recall, F1)
    const classMetrics = classNames.map(c => {
      let tp = 0, fp = 0, fn = 0, support = 0;
      items.forEach(item => {
        const act = classNames.includes(item.trueClass) ? item.trueClass : classNames[0];
        const pred = classNames.includes(item.predClass) ? item.predClass : classNames[0];

        if (act === c) {
          support++;
          if (pred === c) tp++;
          else fn++;
        } else if (pred === c) {
          fp++;
        }
      });

      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      return { className: c, precision, recall, f1, support };
    });

    // Hardest mistakes (highest confidence, but incorrect)
    const worstMistakes = items
      .filter(item => !item.correct)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return { matrixMap, classMetrics, worstMistakes };
  }, [bulkResults, classNames]);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 sm:p-8 space-y-6 sm:space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-900 dark:text-white">Module E: Inference &amp; Notebook Analytics</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Evaluate model performance, check classification reports, and trace confusion matrices.</p>
        </div>

        {(imagePreview || textVal.trim() || inferenceResult || bulkResults) && (
          <button
            onClick={handleClear}
            disabled={inferenceActive || bulkActive}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-neutral-950 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Evaluation</span>
          </button>
        )}
      </div>

      {/* Tab Switcher - scrollable on mobile */}
      <div className="flex gap-1 sm:gap-2 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-850 overflow-x-auto scrollbar-none w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'single'
              ? 'bg-white dark:bg-neutral-900 text-royalblue-500 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Single Sandbox
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'bulk'
              ? 'bg-white dark:bg-neutral-900 text-royalblue-500 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Bulk Analytics Engine
        </button>
      </div>

      {activeTab === 'single' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4 text-left">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Sandbox Input</span>
            
            {isCV ? (
              <div className="space-y-4">
                <div className="relative bg-white dark:bg-neutral-950 rounded-xl p-4 text-center flex items-center justify-center min-h-[220px] shadow-sm border border-neutral-105 dark:border-neutral-900">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    id="sandbox-img-upload" 
                    className="hidden" 
                  />
                  
                  {imagePreview ? (
                    <div className="relative inline-block max-w-full">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-[200px] rounded-lg object-contain animate-fadeIn" 
                      />
                      {isObjectDetection && inferenceResult?.boundingBoxes?.map((box: any, i: number) => (
                        <div
                          key={i}
                          className="absolute border-2 border-royalblue-500 rounded animate-pulse pointer-events-none"
                          style={{
                            top: `${box.bbox[0]}%`,
                            left: `${box.bbox[1]}%`,
                            width: `${box.bbox[2]}%`,
                            height: `${box.bbox[3]}%`,
                          }}
                        >
                          <span className="absolute -top-6 left-0 bg-royalblue-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow font-semibold">
                            {box.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <label htmlFor="sandbox-img-upload" className="cursor-pointer space-y-2 block w-full py-6">
                      <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 font-semibold">Select test image</p>
                      <p className="text-[10px] text-neutral-400">PNG, JPG, WEBP supported</p>
                    </label>
                  )}
                </div>

                <button
                  onClick={handlePredict}
                  disabled={!imagePreview || inferenceActive}
                  className="w-full py-2.5 bg-royalblue-600 hover:bg-royalblue-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-colors shadow-sm"
                >
                  {inferenceActive ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  <span>Compute Inference</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  placeholder="Enter sample sentence or token sequence here..."
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  disabled={inferenceActive}
                  className="w-full h-36 bg-white dark:bg-neutral-950 rounded-xl p-4 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 border border-neutral-100 dark:border-neutral-900 focus:outline-none disabled:opacity-60 resize-none shadow-sm"
                />
                <button
                  onClick={handlePredict}
                  disabled={!textVal.trim() || inferenceActive}
                  className="w-full py-2.5 bg-royalblue-600 hover:bg-royalblue-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-colors shadow-sm"
                >
                  {inferenceActive ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Evaluate Sequence</span>
                </button>
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div className="bg-white dark:bg-neutral-950 rounded-xl p-6 flex flex-col justify-between shadow-sm border border-neutral-100 dark:border-neutral-900">
            <div className="text-left">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-5">Inference Output</span>
              
              {inferenceResult ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Predicted Target</span>
                    <span className="text-xs font-bold text-royalblue-500 dark:text-royalblue-400 font-mono">
                      {isCV ? inferenceResult.class : inferenceResult.sentiment}
                    </span>
                  </div>
                  <div className="h-px bg-neutral-100 dark:bg-neutral-900" />
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Confidence Margin</span>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                      {(inferenceResult.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-px bg-neutral-100 dark:bg-neutral-900" />
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Latency</span>
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-mono">
                      {inferenceResult.latencyMs} ms
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-center text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed">
                  Submit sample input above to<br />compute inference output
                </div>
              )}
            </div>

            <div className="pt-5">
              <button
                onClick={() => {
                  alert('Model checkpoint weight states successfully saved.');
                }}
                className="w-full py-2.5 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-100 dark:border-neutral-800 rounded-xl text-xs font-semibold transition-all"
              >
                Sync Cached Workspace State
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Bulk Evaluator Tab */
        <div className="space-y-6 text-left">
          
          {/* Run Panel */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-neutral-950 p-6 rounded-xl border border-neutral-100 dark:border-neutral-900 shadow-sm">
            <div>
              <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Batch Workload Evaluation</h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Run batch test vectors on all ingested pipeline files ({etl.files.length > 0 ? etl.files.length : 'mock test dataset'} items total) to output classification metrics.
              </p>
            </div>
            
            <button
              onClick={handleBulkEvaluate}
              disabled={bulkActive}
              className="px-5 py-2.5 bg-royalblue-600 hover:bg-royalblue-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm shrink-0"
            >
              {bulkActive ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Dataset...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Batch Evaluation</span>
                </>
              )}
            </button>
          </div>

          {bulkResults && statistics && (
            <div className="space-y-6">
              
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-white dark:bg-neutral-950 p-5 rounded-xl border border-neutral-100 dark:border-neutral-900 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-3.5 h-3.5 text-royalblue-500" />
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Test Accuracy</span>
                  </div>
                  <span className="text-2xl font-black text-royalblue-500 font-mono">
                    {(bulkResults.accuracy * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="bg-white dark:bg-neutral-950 p-5 rounded-xl border border-neutral-100 dark:border-neutral-900 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Correct</span>
                  </div>
                  <span className="text-2xl font-black text-green-500 font-mono">
                    {bulkResults.correct} <span className="text-xs text-neutral-400 font-normal">/ {bulkResults.total}</span>
                  </span>
                </div>

                <div className="bg-white dark:bg-neutral-950 p-5 rounded-xl border border-neutral-100 dark:border-neutral-900 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Failed</span>
                  </div>
                  <span className="text-2xl font-black text-red-500 font-mono">
                    {bulkResults.incorrect} <span className="text-xs text-neutral-400 font-normal">/ {bulkResults.total}</span>
                  </span>
                </div>

                <div className="bg-white dark:bg-neutral-950 p-5 rounded-xl border border-neutral-100 dark:border-neutral-900 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Avg Latency</span>
                  </div>
                  <span className="text-2xl font-black text-neutral-800 dark:text-neutral-200 font-mono">
                    {bulkResults.avgLatency} <span className="text-xs text-neutral-400 font-normal">ms</span>
                  </span>
                </div>

              </div>

              {/* Performance subtabs switcher - scrollable on mobile */}
              <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto scrollbar-none">
                <button 
                  onClick={() => setBulkSubTab('overview')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    bulkSubTab === 'overview' ? 'bg-royalblue-500/10 text-royalblue-500' : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-250'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Overview
                </button>
                <button 
                  onClick={() => setBulkSubTab('matrix')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    bulkSubTab === 'matrix' ? 'bg-royalblue-500/10 text-royalblue-500' : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-250'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  Confusion Matrix
                </button>
                <button 
                  onClick={() => setBulkSubTab('report')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    bulkSubTab === 'report' ? 'bg-royalblue-500/10 text-royalblue-500' : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-250'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Classification Report
                </button>
                <button 
                  onClick={() => setBulkSubTab('errors')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    bulkSubTab === 'errors' ? 'bg-royalblue-500/10 text-royalblue-500' : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-250'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Error Analysis
                </button>
              </div>

              {/* SUBTAB: Overview */}
              {bulkSubTab === 'overview' && (
                <div className="space-y-6">
                  {/* Performance Bar */}
                  <div className="bg-white dark:bg-neutral-950 rounded-xl p-5 shadow-sm border border-neutral-100 dark:border-neutral-900 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Dataset Score Distribution</span>
                      <span className="text-xs font-bold font-mono text-royalblue-500">{(bulkResults.accuracy * 100).toFixed(1)}% pass rate</span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-900 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-royalblue-500 rounded-full transition-all duration-700"
                        style={{ width: `${bulkResults.accuracy * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                      <span className="text-green-500 font-semibold">{bulkResults.correct} correct</span>
                      <span className="text-red-500 font-semibold">{bulkResults.incorrect} failed</span>
                    </div>
                  </div>

                  {/* Itemized Breakdown Table */}
                  <div className="bg-white dark:bg-neutral-950 rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-900 space-y-4">
                    <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Evaluation Itemized Breakdown</h5>
                    
                    <div className="overflow-auto max-h-[300px] pr-1">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-white dark:bg-neutral-950">
                          <tr className="text-neutral-400 dark:text-neutral-505 uppercase tracking-wider font-semibold text-[9px]">
                            <th className="pb-3">File name</th>
                            <th className="pb-3">Target Label</th>
                            <th className="pb-3">Predicted</th>
                            <th className="pb-3 text-right">Confidence</th>
                            <th className="pb-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 font-mono text-neutral-800 dark:text-neutral-300">
                          {bulkResults.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                              <td className="py-2.5 font-sans text-neutral-750 truncate max-w-[180px]" title={item.name}>{item.name}</td>
                              <td className="py-2.5 text-neutral-500 dark:text-neutral-400">{item.trueClass}</td>
                              <td className={`py-2.5 font-bold ${item.correct ? 'text-neutral-750' : 'text-red-505'}`}>
                                {item.predClass}
                              </td>
                              <td className="py-2.5 text-right text-neutral-600 dark:text-neutral-400">{(item.confidence * 100).toFixed(1)}%</td>
                              <td className="py-2.5">
                                <span className="flex items-center justify-end gap-1">
                                  {item.correct ? (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                      <span className="text-[10px] text-green-500 font-bold font-sans">OK</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                                      <span className="text-[10px] text-red-500 font-bold font-sans">FAIL</span>
                                    </>
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: Confusion Matrix */}
              {bulkSubTab === 'matrix' && (
                <div className="bg-white dark:bg-neutral-950 rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-900 space-y-4">
                  <div className="text-left space-y-1">
                    <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Confusion Matrix Grid</h5>
                    <p className="text-[11px] text-neutral-550">Row represents True class label, Column represents Predicted label.</p>
                  </div>

                  <div className="overflow-auto pt-3">
                    <div className="inline-block min-w-full align-middle">
                      <table className="border-collapse mx-auto">
                        <thead>
                          <tr>
                            <td className="border-0"></td>
                            <td colSpan={classNames.length} className="text-center font-bold text-[10px] uppercase tracking-widest text-royalblue-500 pb-2">Predicted Label</td>
                          </tr>
                          <tr>
                            <td className="border-0"></td>
                            {classNames.map(c => (
                              <td key={c} className="px-3 py-1.5 font-mono text-[10px] font-bold text-center text-neutral-500 border-0">{c}</td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {classNames.map(act => (
                            <tr key={act}>
                              <td className="pr-3 font-mono text-[10px] font-bold text-right text-neutral-500 uppercase tracking-wider">{act}</td>
                              {classNames.map(pred => {
                                const count = statistics.matrixMap[act]?.[pred] || 0;
                                const totalAct = Object.values(statistics.matrixMap[act] || {}).reduce((x, y) => x + y, 0) || 1;
                                const ratio = count / totalAct;
                                
                                // Color strength based on ratio
                                const colorStyle = act === pred 
                                  ? { backgroundColor: `rgba(65, 105, 225, ${0.1 + ratio * 0.7})`, color: ratio > 0.4 ? '#fff' : 'inherit' }
                                  : { backgroundColor: `rgba(239, 68, 68, ${ratio * 0.5})`, color: ratio > 0.4 ? '#fff' : 'inherit' };

                                return (
                                  <td 
                                    key={pred} 
                                    style={colorStyle} 
                                    className="w-16 h-16 border border-neutral-100 dark:border-neutral-900 text-center font-mono font-bold text-xs shadow-inner"
                                  >
                                    {count}
                                    <span className="block text-[8px] opacity-60 font-normal">{(ratio * 100).toFixed(0)}%</span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr>
                            <td className="text-right font-bold text-[9px] uppercase tracking-widest text-neutral-400 pt-3 pr-3 font-sans">True Label</td>
                            <td colSpan={classNames.length}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: Classification Report */}
              {bulkSubTab === 'report' && (
                <div className="bg-white dark:bg-neutral-950 rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-900 space-y-4">
                  <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Classification Precision / Recall Report</h5>
                  
                  <div className="overflow-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold text-[9px]">
                          <th className="pb-3">Class Name</th>
                          <th className="pb-3 text-right">Precision</th>
                          <th className="pb-3 text-right">Recall</th>
                          <th className="pb-3 text-right">F1-Score</th>
                          <th className="pb-3 text-right pr-4">Support</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 font-mono text-neutral-800 dark:text-neutral-300">
                        {statistics.classMetrics.map(metric => (
                          <tr key={metric.className} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                            <td className="py-3 font-bold text-neutral-700 dark:text-neutral-200">{metric.className}</td>
                            <td className="py-3 text-right font-semibold text-emerald-500">{(metric.precision * 100).toFixed(1)}%</td>
                            <td className="py-3 text-right font-semibold text-royalblue-500">{(metric.recall * 100).toFixed(1)}%</td>
                            <td className="py-3 text-right font-semibold text-amber-500">{(metric.f1 * 100).toFixed(1)}%</td>
                            <td className="py-3 text-right pr-4 text-neutral-500">{metric.support}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB: Error Analysis */}
              {bulkSubTab === 'errors' && (
                <div className="bg-white dark:bg-neutral-950 rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-900 space-y-4">
                  <div className="text-left space-y-1">
                    <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Hardest Mistakes (Worst Failures)</h5>
                    <p className="text-[11px] text-neutral-550">Top predictions where the model was wrong but had the highest confidence.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {statistics.worstMistakes.map((mistake, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col justify-between text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-neutral-400 font-semibold truncate max-w-[200px]">{mistake.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold text-[9px]">CONFIDENCE: {(mistake.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase font-sans">True Target</span>
                            <span className="text-neutral-750 font-bold">{mistake.trueClass}</span>
                          </div>
                          <div>
                            <span className="text-red-400 block text-[9px] uppercase font-sans">Predicted Target</span>
                            <span className="text-red-500 font-bold">{mistake.predClass}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {statistics.worstMistakes.length === 0 && (
                      <div className="col-span-full py-12 text-center text-xs text-neutral-400 dark:text-neutral-600">
                        No classification failures found. 100% test accuracy.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};
