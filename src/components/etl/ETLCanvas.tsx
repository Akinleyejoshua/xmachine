import React, { useState } from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { TransformAction } from '../../types/pipeline';
import { 
  Upload, 
  FolderPlus,
  Trash2, 
  Plus, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileText,
  Tags,
  Sliders,
  Shuffle,
  SplitSquareHorizontal,
  Hash,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';

export const detectFileClass = (fileName: string, classNames: string[]): string | null => {
  if (!classNames || classNames.length === 0) return null;
  const name = fileName.toLowerCase();

  for (const c of classNames) {
    const term = c.toLowerCase().trim();
    if (name.includes(term)) return c;
  }

  if (fileName.includes('/')) {
    const parts = fileName.split('/');
    if (parts.length > 1) {
      const parentFolder = parts[parts.length - 2].toLowerCase().trim();
      const matched = classNames.find(c => c.toLowerCase().trim() === parentFolder);
      if (matched) return matched;
      return parentFolder;
    }
  }
  return null;
};

// ─── Split Ratio Slider Component ─────────────────────────────────────────────
const SplitRatioControl: React.FC<{
  train: number; val: number; test: number;
  onChange: (t: number, v: number, te: number) => void;
}> = ({ train, val, test, onChange }) => {
  const [useTest, setUseTest] = useState(test > 0);

  const handleTrain = (newTrain: number) => {
    const clamped = Math.max(10, Math.min(90, newTrain));
    const remaining = 100 - clamped;
    if (useTest) {
      const newVal = Math.round(remaining * (val / (val + test || 1)));
      const newTest = remaining - newVal;
      onChange(clamped, newVal, newTest);
    } else {
      onChange(clamped, remaining, 0);
    }
  };

  const handleTestToggle = () => {
    if (useTest) {
      onChange(train, 100 - train, 0);
      setUseTest(false);
    } else {
      const newVal = Math.round((100 - train) * 0.75);
      const newTest = 100 - train - newVal;
      onChange(train, newVal, newTest);
      setUseTest(true);
    }
  };

  const handleVal = (newVal: number) => {
    if (!useTest) return;
    const maxVal = 100 - train - 5;
    const clamped = Math.max(5, Math.min(maxVal, newVal));
    onChange(train, clamped, 100 - train - clamped);
  };

  const segments = useTest
    ? [
        { label: 'Train', value: train, color: '#4169e1' },
        { label: 'Val', value: val, color: '#22c55e' },
        { label: 'Test', value: test, color: '#f59e0b' },
      ]
    : [
        { label: 'Train', value: train, color: '#4169e1' },
        { label: 'Val', value: val, color: '#22c55e' },
      ];

  return (
    <div className="space-y-4">
      {/* Visual bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
        {segments.map(s => (
          <div
            key={s.label}
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${s.value}%`, backgroundColor: s.color }}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex items-center gap-3 flex-wrap">
        {segments.map(s => (
          <span key={s.label} className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
            <span className="text-neutral-600 dark:text-neutral-400">{s.label}</span>
            <span className="text-neutral-800 dark:text-neutral-200">{s.value}%</span>
          </span>
        ))}
        <button
          onClick={handleTestToggle}
          className={`ml-auto text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
            useTest
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500'
          }`}
        >
          {useTest ? 'Hide Test Split' : '+ Add Test Split'}
        </button>
      </div>

      {/* Train slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-neutral-500">
          <span>Train ratio</span><span className="font-mono font-bold text-royalblue-500">{train}%</span>
        </div>
        <input
          type="range" min={10} max={90} step={5} value={train}
          onChange={e => handleTrain(parseInt(e.target.value))}
          className="w-full accent-royalblue-500 h-1.5 rounded-full"
        />
      </div>

      {/* Val slider (only visible when test is enabled) */}
      {useTest && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span>Val ratio</span><span className="font-mono font-bold text-green-500">{val}%</span>
          </div>
          <input
            type="range" min={5} max={100 - train - 5} step={5} value={val}
            onChange={e => handleVal(parseInt(e.target.value))}
            className="w-full accent-green-500 h-1.5 rounded-full"
          />
        </div>
      )}
    </div>
  );
};

// ─── Main ETLCanvas ───────────────────────────────────────────────────────────
export const ETLCanvas: React.FC = () => {
  const { etl, addFiles, removeFile, addAction, removeAction, toggleAction, updateActionParams, setClassNames, updateEtlConfig, currentProject } = usePipelineStore();
  const [dragActive, setDragActive] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [datasetFormat, setDatasetFormat] = useState<string>('standard');
  const [classInput, setClassInput] = useState((etl.classNames || []).join(', '));
  const [settingsOpen, setSettingsOpen] = useState(true);

  React.useEffect(() => {
    setClassInput((etl.classNames || []).join(', '));
  }, [etl.classNames]);

  if (!currentProject) return null;

  const isCV = currentProject.domain === 'cv-classification' || currentProject.domain === 'object-detection';
  const split = etl.splitRatio || { train: 80, val: 20, test: 0 };
  const totalFiles = etl.files.length;
  const trainCount = Math.round(totalFiles * split.train / 100);
  const valCount = Math.round(totalFiles * split.val / 100);
  const testCount = totalFiles - trainCount - valCount;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleUploadedFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleUploadedFiles(Array.from(e.target.files));
  };

  const handleUploadedFiles = (files: File[]) => {
    const newFiles = files.map(file => {
      let type: 'csv' | 'json' | 'txt' | 'image' = 'txt';
      if (file.type.includes('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)) type = 'image';
      else if (file.name.endsWith('.csv')) type = 'csv';
      else if (file.name.endsWith('.json') || file.name.endsWith('.xml')) type = 'json';
      return {
        id: Math.random().toString(36).substring(7),
        name: (file as any).webkitRelativePath || file.name,
        size: file.size, type,
      };
    });
    addFiles(newFiles);
  };

  const handleAddAction = () => {
    if (!selectedActionType) return;
    const newAction: TransformAction = {
      id: Math.random().toString(36).substring(7),
      type: selectedActionType as any,
      params: selectedActionType === 'resize' ? { width: 224, height: 224 }
        : selectedActionType === 'tokenize' ? { vocabularySize: 5000, sequenceLength: 100 }
        : selectedActionType === 'missing-values-impute' ? { strategy: 'mean' }
        : selectedActionType === 'standard-scale' ? { withMean: true, withStd: true }
        : selectedActionType === 'augment-rotate' ? { maxAngle: 30 }
        : selectedActionType === 'augment-brightness' ? { factor: 0.2 }
        : selectedActionType === 'augment-zoom' ? { factor: 0.2 }
        : {},
      enabled: true,
    };
    addAction(newAction);
    setSelectedActionType('');
  };

  const handleClassesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const classes = classInput.split(',').map(c => c.trim()).filter(c => c.length > 0);
    setClassNames(classes);
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
        <div className="text-left">
          <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-900 dark:text-white">Module B: Data Ingestion &amp; ETL</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Upload dataset, configure splits, transforms, and preprocessing pipeline.</p>
        </div>
        <span className="px-3 py-1 bg-royalblue-500/10 text-royalblue-500 text-xs rounded-full font-mono font-medium shrink-0">
          {totalFiles > 0 ? `${totalFiles} files` : 'Ready for Ingestion'}
        </span>
      </div>

      {/* ── Section 1: Format & Class Config ── */}
      <div className="bg-white dark:bg-neutral-950 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-royalblue-500" />
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Dataset Configuration</span>
          </div>
          {settingsOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {settingsOpen && (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-neutral-100 dark:border-neutral-900 pt-4">
            {/* Dataset Format */}
            <div className="text-left space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-royalblue-500" />
                <span>Ingestion Format</span>
              </label>
              <select
                value={datasetFormat}
                onChange={e => setDatasetFormat(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
              >
                <option value="standard">Standard (Images / CSV / JSON)</option>
                <option value="yolo">YOLO (Images + TXT labels)</option>
                <option value="voc">Pascal VOC (Images + XML annotations)</option>
                <option value="coco">COCO JSON (Annotations + Images)</option>
              </select>
            </div>

            {/* Class Names */}
            <div className="text-left space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <Tags className="w-3.5 h-3.5 text-royalblue-500" />
                <span>Target Class Names</span>
              </label>
              <form onSubmit={handleClassesSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Cat, Dog, Bird"
                  value={classInput}
                  onChange={e => setClassInput(e.target.value)}
                  className="flex-1 bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2.5 text-xs text-neutral-900 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
                />
                <button type="submit" className="px-3 py-2 bg-royalblue-600 hover:bg-royalblue-500 text-white rounded-lg text-xs font-semibold transition-colors">
                  Set
                </button>
              </form>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(etl.classNames || []).map((name, i) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded font-mono">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Raw Data Ingestion + Transforms ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

        {/* Left: Upload */}
        <div className="space-y-4 text-left">
          <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">1. Raw Data Ingestion</h4>
          
          <div
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            className={`rounded-xl p-8 text-center transition-all ${
              dragActive ? 'bg-royalblue-500/5' : 'bg-white dark:bg-neutral-950 shadow-sm'
            }`}
          >
            <input type="file" multiple onChange={handleFileInput} className="hidden" id="file-upload" />
            <input type="file" multiple onChange={handleFileInput} className="hidden" id="folder-upload"
              {...({ webkitdirectory: '', directory: '' } as any)} />
            <div className="space-y-4">
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 font-semibold">Drag &amp; drop files or folders</p>
                <p className="text-xs text-neutral-500 mt-1">CSV, JSON, TXT, XML, or Image sequences</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2">
                <label htmlFor="file-upload" className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer transition-all">
                  Browse Files
                </label>
                <label htmlFor="folder-upload" className="px-3 py-1.5 bg-royalblue-500/10 hover:bg-royalblue-500/20 text-royalblue-600 dark:text-royalblue-300 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all">
                  <FolderPlus className="w-3.5 h-3.5" /><span>Browse Folder</span>
                </label>
              </div>
            </div>
          </div>

          {etl.files.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {etl.files.map(file => {
                const detectedClass = detectFileClass(file.name, etl.classNames);
                return (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-950 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      {file.type === 'image' && <ImageIcon className="w-4 h-4 text-royalblue-500 shrink-0" />}
                      {file.type === 'csv' && <FileSpreadsheet className="w-4 h-4 text-neutral-500 shrink-0" />}
                      {(file.type === 'txt' || file.type === 'json') && <FileText className="w-4 h-4 text-neutral-500 shrink-0" />}
                      <div className="text-left min-w-0">
                        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-300 truncate max-w-[160px]" title={file.name}>{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-neutral-400">{(file.size / 1024).toFixed(1)} KB</span>
                          {detectedClass && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-royalblue-500/10 text-royalblue-600 dark:text-royalblue-400 rounded font-semibold uppercase">{detectedClass}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeFile(file.id)} className="text-neutral-400 hover:text-red-500 transition-colors p-1 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Transform Pipeline */}
        <div className="space-y-4 text-left">
          <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">2. Transformation Pipeline</h4>

          <div className="flex gap-2">
            <select
              value={selectedActionType}
              onChange={e => setSelectedActionType(e.target.value)}
              className="flex-1 bg-white dark:bg-neutral-950 rounded-lg px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500 shadow-sm"
            >
              <option value="">Select Transformation...</option>
              {isCV ? (
                <>
                  <optgroup label="Preprocessing">
                    <option value="resize">Resize Image</option>
                    <option value="grayscale">Convert to Grayscale</option>
                    <option value="pixel-normalize-0-1">Pixel Scale [0, 1]</option>
                    <option value="pixel-normalize-1-1">Pixel Scale [-1, 1]</option>
                    <option value="standard-scale">Standard Scale (z-score)</option>
                  </optgroup>
                  <optgroup label="Augmentation">
                    <option value="augment-flip">Augment: Horizontal Flip</option>
                    <option value="augment-rotate">Augment: Random Rotation</option>
                    <option value="augment-brightness">Augment: Brightness Jitter</option>
                    <option value="augment-zoom">Augment: Random Zoom</option>
                  </optgroup>
                </>
              ) : (
                <>
                  <optgroup label="Text Preprocessing">
                    <option value="lowercase">To Lowercase</option>
                    <option value="tokenize">Tokenize Sequence</option>
                    <option value="remove-stopwords">Remove Stopwords</option>
                  </optgroup>
                  <optgroup label="Feature Engineering">
                    <option value="missing-values-impute">Impute Missing Values</option>
                    <option value="standard-scale">Standard Scale (z-score)</option>
                    <option value="normalize">Min-Max Normalize</option>
                  </optgroup>
                </>
              )}
            </select>
            <button
              onClick={handleAddAction}
              disabled={!selectedActionType}
              className="px-3 py-2 bg-royalblue-600 hover:bg-royalblue-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
            {etl.actions.length === 0 && (
              <div className="p-6 bg-white dark:bg-neutral-950 rounded-xl text-center text-xs text-neutral-400 shadow-sm">
                No transforms configured yet.
              </div>
            )}
            {etl.actions.map((action, index) => (
              <div
                key={action.id}
                className={`p-4 rounded-xl flex items-start justify-between transition-all shadow-sm ${
                  action.enabled ? 'bg-white dark:bg-neutral-950' : 'bg-neutral-50 dark:bg-neutral-950 opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-neutral-500 shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="text-left space-y-1.5">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 capitalize">{action.type.replace(/-/g, ' ')}</p>
                    
                    {/* Inline param editors */}
                    {action.type === 'resize' && (
                      <div className="flex items-center gap-2">
                        <input type="number" value={action.params.width || 224}
                          onChange={e => updateActionParams(action.id, { width: parseInt(e.target.value) || 0 })}
                          className="w-14 bg-neutral-50 dark:bg-neutral-900 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
                        <span className="text-[10px] text-neutral-400">×</span>
                        <input type="number" value={action.params.height || 224}
                          onChange={e => updateActionParams(action.id, { height: parseInt(e.target.value) || 0 })}
                          className="w-14 bg-neutral-50 dark:bg-neutral-900 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
                        <span className="text-[10px] text-neutral-400">px</span>
                      </div>
                    )}
                    {action.type === 'tokenize' && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-neutral-400">Vocab</span>
                          <input type="number" value={action.params.vocabularySize || 5000}
                            onChange={e => updateActionParams(action.id, { vocabularySize: parseInt(e.target.value) })}
                            className="w-16 bg-neutral-50 dark:bg-neutral-900 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-neutral-400">Seq</span>
                          <input type="number" value={action.params.sequenceLength || 100}
                            onChange={e => updateActionParams(action.id, { sequenceLength: parseInt(e.target.value) })}
                            className="w-16 bg-neutral-50 dark:bg-neutral-900 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
                        </div>
                      </div>
                    )}
                    {action.type === 'augment-rotate' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-neutral-400">Max angle</span>
                        <input type="number" value={action.params.maxAngle || 30}
                          onChange={e => updateActionParams(action.id, { maxAngle: parseInt(e.target.value) })}
                          className="w-14 bg-neutral-50 dark:bg-neutral-900 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
                        <span className="text-[9px] text-neutral-400">°</span>
                      </div>
                    )}
                    {(action.type === 'augment-brightness' || action.type === 'augment-zoom') && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-neutral-400">Factor</span>
                        <input type="number" step="0.05" min="0.05" max="0.5" value={action.params.factor || 0.2}
                          onChange={e => updateActionParams(action.id, { factor: parseFloat(e.target.value) })}
                          className="w-16 bg-neutral-50 dark:bg-neutral-900 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500" />
                      </div>
                    )}
                    {action.type === 'missing-values-impute' && (
                      <select value={action.params.strategy || 'mean'}
                        onChange={e => updateActionParams(action.id, { strategy: e.target.value })}
                        className="bg-neutral-50 dark:bg-neutral-900 rounded px-2 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-300 focus:outline-none">
                        <option value="mean">Mean</option>
                        <option value="median">Median</option>
                        <option value="mode">Mode</option>
                        <option value="zero">Zero fill</option>
                        <option value="drop">Drop rows</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => toggleAction(action.id)}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all ${
                      action.enabled ? 'bg-royalblue-500/10 text-royalblue-500' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500'
                    }`}
                  >
                    {action.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => removeAction(action.id)} className="text-neutral-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Dataset Split & Loader Config ── */}
      <div className="bg-white dark:bg-neutral-950 rounded-xl shadow-sm p-5 space-y-6 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="w-4 h-4 text-royalblue-500" />
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Dataset Split &amp; Loader</span>
          </div>
          {totalFiles > 0 && (
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-royalblue-500 font-bold">{trainCount} train</span>
              <span className="text-green-500 font-bold">{valCount} val</span>
              {split.test > 0 && <span className="text-amber-500 font-bold">{testCount} test</span>}
            </div>
          )}
        </div>

        <SplitRatioControl
          train={split.train} val={split.val} test={split.test}
          onChange={(t, v, te) => updateEtlConfig({ splitRatio: { train: t, val: v, test: te } })}
        />

        {/* Loader options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
          
          {/* Batch size */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3" /> Batch Size
            </label>
            <select
              value={etl.batchSize}
              onChange={e => updateEtlConfig({ batchSize: parseInt(e.target.value) })}
              className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
            >
              {[8, 16, 32, 64, 128, 256].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Random seed */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3" /> Random Seed
            </label>
            <input
              type="number"
              value={etl.seed ?? 42}
              onChange={e => updateEtlConfig({ seed: parseInt(e.target.value) })}
              className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-royalblue-500"
            />
          </div>

          {/* Shuffle toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <Shuffle className="w-3 h-3" /> Shuffle
            </label>
            <button
              onClick={() => updateEtlConfig({ shuffle: !etl.shuffle })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                etl.shuffle
                  ? 'bg-royalblue-500/10 text-royalblue-600 dark:text-royalblue-400'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500'
              }`}
            >
              {etl.shuffle ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Stratified toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-3 h-3" /> Stratified
            </label>
            <button
              onClick={() => updateEtlConfig({ stratified: !etl.stratified })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                etl.stratified
                  ? 'bg-royalblue-500/10 text-royalblue-600 dark:text-royalblue-400'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500'
              }`}
            >
              {etl.stratified ? 'Enabled' : 'Disabled'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
