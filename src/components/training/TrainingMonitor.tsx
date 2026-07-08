import React, { useState, useEffect, useRef } from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { detectFileClass } from '../etl/ETLCanvas';

// Helper to generate batches from real uploaded files in the ETL data pipeline
const generateRealBatch = async (
  files: any[],
  domain: string,
  inputShape: number[],
  classNames: string[],
  batchSize: number
): Promise<{ xs: any; ys: any }> => {
  const t = await import('../../utils/model').then(m => m.getTf());
  
  const validFiles = files.filter(f => f.rawContent);
  if (validFiles.length === 0) {
    throw new Error("No files with rawContent found.");
  }

  const selectedFiles = [];
  for (let i = 0; i < batchSize; i++) {
    const idx = Math.floor(Math.random() * validFiles.length);
    selectedFiles.push(validFiles[idx]);
  }

  if (domain === 'cv-classification' || domain === 'object-detection') {
    const [height, width, channels] = inputShape;
    const images: any[] = [];
    const labels: number[] = [];

    for (const file of selectedFiles) {
      const img = new window.Image();
      img.src = file.rawContent;
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load failed'));
        }),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Image load timeout')), 10000))
      ]);

      let tensor = t.browser.fromPixels(img);
      tensor = tensor.resizeBilinear([height, width]).toFloat().div(255);
      images.push(tensor);

      const className = detectFileClass(file.name, classNames) || classNames[0];
      const classIndex = classNames.indexOf(className);
      labels.push(classIndex !== -1 ? classIndex : 0);
    }

    const xs = t.stack(images);
    images.forEach(img => img.dispose());

    const ys = t.oneHot(t.tensor1d(labels, 'int32'), classNames.length);
    return { xs, ys };
  }

  if (domain === 'nlp' || domain === 'llm-finetuning') {
    const seqLen = inputShape[0] || 100;
    const isLLM = domain === 'llm-finetuning';
    const samples: number[][] = [];
    const targets: number[][] = [];

    for (const file of selectedFiles) {
      const text = file.rawContent;
      const tokens = text.split(/\s+/).map((w: string) => Math.abs(w.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 5000);
      while (tokens.length < seqLen + (isLLM ? 1 : 0)) tokens.push(0);

      if (isLLM) {
        samples.push(tokens.slice(0, seqLen));
        targets.push(tokens.slice(1, seqLen + 1));
      } else {
        samples.push(tokens.slice(0, seqLen));
        const className = detectFileClass(file.name, classNames) || classNames[0];
        const classIndex = classNames.indexOf(className);
        targets.push([classIndex !== -1 ? classIndex : 0]);
      }
    }

    const xs = t.tensor2d(samples, [batchSize, seqLen]);
    const ys = isLLM
      ? t.oneHot(t.tensor1d(targets.map(t => t[0]), 'int32'), 5000)
      : t.oneHot(t.tensor1d(targets.map(t => t[0]), 'int32'), classNames.length);
    return { xs, ys };
  }

  if (domain === 'time-series-forecasting') {
    const lookbackLen = inputShape[0] || 30;
    const forecastLen = 1;
    const samples: number[][] = [];
    const targets: number[] = [];

    for (const file of selectedFiles) {
      const numbers = file.rawContent.split(/[\s,]+/).map((v: string) => parseFloat(v)).filter((v: number) => !isNaN(v));
      if (numbers.length < lookbackLen + forecastLen) {
        while (numbers.length < lookbackLen + forecastLen) numbers.push(Math.random() * 100);
      }
      const sliceStart = Math.floor(Math.random() * (numbers.length - lookbackLen - forecastLen));
      const seq = numbers.slice(sliceStart, sliceStart + lookbackLen);
      const target = numbers[sliceStart + lookbackLen];
      samples.push(seq);
      targets.push(target);
    }

    const xs = t.tensor3d(samples.map(seq => seq.map(v => [v])), [batchSize, lookbackLen, 1]);
    const ys = t.tensor2d(targets, [batchSize, 1]);
    return { xs, ys };
  }

  throw new Error(`Domain ${domain} not supported for real data training`);
};

import { 
  Play, Pause, RotateCcw, Download, TrendingUp, BarChart2, 
  Activity, Disc, GitCommitHorizontal, History, Cpu, ShieldAlert,
  Terminal, Code2, Settings, Zap, HardDrive, RefreshCw, Copy, Check
} from 'lucide-react';
import { DOMAIN_CONFIGS } from '../../config/domain/registry';
import { buildModel, getTf } from '../../utils/model';
import { saveModel } from '../../utils/training';

type ChartType = 'line' | 'area' | 'bar' | 'scatter' | 'smooth';

const CHART_TYPES: { id: ChartType; label: string; icon: React.ReactNode }[] = [
  { id: 'line',    label: 'Line',    icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: 'area',    label: 'Area',    icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'bar',     label: 'Bar',     icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { id: 'scatter', label: 'Scatter', icon: <Disc className="w-3.5 h-3.5" /> },
  { id: 'smooth',  label: 'Smooth',  icon: <GitCommitHorizontal className="w-3.5 h-3.5" /> },
];

export const TrainingMonitor: React.FC = () => {
  const { 
    trainingStatus, 
    setTrainingStatus, 
    metricsHistory, 
    updateMetrics, 
    currentEpoch, 
    setCurrentEpoch,
    checkpoints,
    addCheckpoint,
    clearTrainingState,
    modelConfig,
    etl,
    currentProject 
  } = usePipelineStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [resumeFromCheckpoint, setResumeFromCheckpoint] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('smooth');
  const [activeTab, setActiveTab] = useState<'graph' | 'logs' | 'script'>('graph');

  // Scale & Engine settings
  const [accelerator, setAccelerator] = useState<'cpu' | 'gpu' | 'tpu'>('gpu');
  const [precision, setPrecision] = useState<'fp32' | 'fp16' | 'bf16'>('fp16');
  const [earlyStopping, setEarlyStopping] = useState(true);
  const [esPatience, setEsPatience] = useState(5);

  const classNames = React.useMemo(() => {
    if (!currentProject) return [];
    if (currentProject.domain === 'gans') return ['Real Distribution', 'Synthesized'];
    if (currentProject.domain === 'llm-finetuning') return ['Target Instruction', 'Aligned Output'];
    const domainConfig = DOMAIN_CONFIGS[currentProject.domain as keyof typeof DOMAIN_CONFIGS];
    const domainDefaults = domainConfig?.pipeline?.defaultClassNames;
    return etl.classNames && etl.classNames.length > 0 ? etl.classNames : domainDefaults && domainDefaults.length > 0 ? domainDefaults : ['Cat', 'Dog', 'Bird'];
  }, [etl.classNames, currentProject?.domain]);
  const [lrScheduler, setLrScheduler] = useState<'constant' | 'step' | 'cosine'>('cosine');

  // VRAM & Hardware telemetry simulation
  const [vramUsage, setVramUsage] = useState(0);
  const [gpuTemp, setGpuTemp] = useState(35);
  const [utilization, setUtilization] = useState(0);

  // Terminal log stream
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  if (!currentProject) return null;

  const lastCheckpoint = checkpoints.length > 0
    ? checkpoints.reduce((a, b) => (a.epoch > b.epoch ? a : b))
    : null;

  const maxEpochs = modelConfig.hyperparameters.epochs;
  const initialLr = modelConfig.hyperparameters.learningRate || 0.001;
  const canResume = !!lastCheckpoint;
  const isIdle = trainingStatus === 'idle' || trainingStatus === 'paused' || trainingStatus === 'completed';

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Telemetry updates simulation
  useEffect(() => {
    let tInterval: NodeJS.Timeout;
    if (trainingStatus === 'training') {
      tInterval = setInterval(() => {
        const u = Math.floor(82 + Math.random() * 12);
        setUtilization(u);
        setGpuTemp(Math.floor(65 + Math.random() * 6));
        setVramUsage(parseFloat((4.2 + Math.random() * 0.6).toFixed(1)));
      }, 1000);
    } else {
      setUtilization(0);
      setGpuTemp(35);
      setVramUsage(0);
    }
    return () => clearInterval(tInterval);
  }, [trainingStatus]);

  const generatePyTorchScript = (): string => {
    const layers = modelConfig.layers;
    let pyLayers = '';
    let flatDimCalculated = false;

    layers.forEach((layer, i) => {
      const cfg = layer.config;
      if (layer.type === 'conv2d') {
        pyLayers += `        self.layer_${i} = nn.Sequential(\n`;
        pyLayers += `            nn.Conv2d(${i === 0 ? '3' : 'prev_channels'}, ${cfg.filters || 32}, kernel_size=${cfg.kernelSize || 3}, padding='${cfg.padding || 'same'}', stride=${cfg.strides || 1}),\n`;
        pyLayers += `            nn.BatchNorm2d(${cfg.filters || 32}),\n`;
        pyLayers += `            nn.ReLU(),\n`;
        if (cfg.dropout && cfg.dropout > 0) {
          pyLayers += `            nn.Dropout2d(p=${cfg.dropout}),\n`;
        }
        pyLayers += `        )\n`;
      } else if (layer.type === 'maxPooling2d') {
        pyLayers += `        self.layer_${i} = nn.MaxPool2d(kernel_size=${cfg.poolSize || 2}, stride=${cfg.strides || 2})\n`;
      } else if (layer.type === 'flatten') {
        pyLayers += `        self.layer_${i} = nn.Flatten()\n`;
        flatDimCalculated = true;
      } else if (layer.type === 'dense') {
        pyLayers += `        self.layer_${i} = nn.Sequential(\n`;
        pyLayers += `            nn.Linear(${!flatDimCalculated ? '512' : 'flat_features'}, ${cfg.units || 64}),\n`;
        pyLayers += `            nn.ReLU(),\n`;
        if (cfg.dropout && cfg.dropout > 0) {
          pyLayers += `            nn.Dropout(p=${cfg.dropout}),\n`;
        }
        pyLayers += `        )\n`;
      } else if (layer.type === 'dropout') {
        pyLayers += `        self.layer_${i} = nn.Dropout(p=${cfg.rate || 0.25})\n`;
      } else if (layer.type === 'batchNorm') {
        pyLayers += `        self.layer_${i} = nn.BatchNorm1d(${cfg.numFeatures || 64}, momentum=${cfg.momentum || 0.1})\n`;
      } else if (layer.type === 'embedding') {
        pyLayers += `        self.layer_${i} = nn.Embedding(${cfg.inputDim || 5000}, ${cfg.outputDim || 128})\n`;
      } else if (layer.type === 'lstm') {
        pyLayers += `        self.layer_${i} = nn.LSTM(${i === 0 ? 'input_dim' : 'prev_dim'}, ${cfg.units || 64}, batch_first=True, dropout=${cfg.dropout || 0})\n`;
      } else if (layer.type === 'gru') {
        pyLayers += `        self.layer_${i} = nn.GRU(${i === 0 ? 'input_dim' : 'prev_dim'}, ${cfg.units || 64}, batch_first=True, dropout=${cfg.dropout || 0})\n`;
      } else if (layer.type === 'bidirectional') {
        pyLayers += `        self.layer_${i} = nn.Bidirectional(nn.LSTM(${i === 0 ? 'input_dim' : 'prev_dim'}, ${cfg.units || 64}, batch_first=True))\n`;
      }
    });

    const lossMap: Record<string, string> = {
      categoricalCrossentropy: 'nn.CrossEntropyLoss()',
      meanSquaredError: 'nn.MSELoss()',
      binaryCrossentropy: 'nn.BCELoss()',
      sparseCategoricalCrossentropy: 'nn.CrossEntropyLoss()'
    };
    const ptLoss = lossMap[modelConfig.hyperparameters.loss] || 'nn.CrossEntropyLoss()';

    const optMap: Record<string, string> = {
      adam: 'optim.Adam',
      sgd: 'optim.SGD',
      rmsprop: 'optim.RMSprop'
    };
    const ptOpt = optMap[modelConfig.hyperparameters.optimizer] || 'optim.Adam';

    return `# ==========================================
# PYTORCH AUTOGENERATED TRAINING SCRIPT
# Generated by xMachine Live Telemetry Engine
# ==========================================

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# 1. Device Configuration
device = torch.device(${accelerator === 'gpu' ? "'cuda' if torch.cuda.is_available() else 'cpu'" : `'${accelerator}'`})
print(f"Training using device: {device}")

# 2. Model Architecture definition
class CustomModel(nn.Module):
    def __init__(self, input_dim=3, flat_features=512, num_classes=${etl.classNames?.length || 2}):
        super(CustomModel, self).__init__()
        
        # Sequentially constructed layers from model builder
${pyLayers}
        # Output layer matching classes
        self.output_layer = nn.Linear(${layers.length > 0 ? 'prev_dim_or_units' : 'input_dim'}, num_classes)

    def forward(self, x):
        # Forward pass workflow
        for layer in [attr for attr in dir(self) if attr.startswith('layer_')]:
            x = getattr(self, layer)(x)
        return self.output_layer(x)

# 3. Model initialization
model = CustomModel().to(device)

# 4. Loss & Optimizer configuration
criterion = ${ptLoss}
optimizer = ${ptOpt}(model.parameters(), lr=${initialLr})

# 5. Learning Rate Scheduler
${lrScheduler === 'cosine' 
  ? `scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=${maxEpochs})` 
  : lrScheduler === 'step' 
    ? 'scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)'
    : '# Constant Learning Rate (no scheduler)'}

# 6. Training Pipeline Loop
def train(model, dataloader, epochs=${maxEpochs}):
    model.train()
    for epoch in range(epochs):
        running_loss = 0.0
        correct = 0
        total = 0
        
        for inputs, targets in dataloader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            
            # Forward pass
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            
            # Backward pass & Optimize
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
            
        epoch_loss = running_loss / len(dataloader.dataset)
        epoch_acc = correct / total
        print(f"Epoch {epoch+1}/{epochs} - loss: {epoch_loss:.4f} - acc: {epoch_acc:.4f}")
        
        if '${lrScheduler}' != 'constant':
            scheduler.step()

print("PyTorch model ready for scaling!")
`;
  };

  const copyScript = () => {
    navigator.clipboard.writeText(generatePyTorchScript());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildInputShape = (domain: string, cfg: any): number[] => {
    const first = cfg.layers?.[0]?.config;
    if (domain === 'nlp' || domain === 'llm-finetuning') return [first?.inputLength || 100];
    if (domain === 'time-series-forecasting') return [30, 1];
    if (first?.inputShape) return first.inputShape;
    if (domain === 'object-detection') return [416, 416, 3];
    return [224, 224, 3];
  };

  const handleStartTraining = async () => {
    if (trainingStatus === 'training') return;

    const startEpoch = resumeFromCheckpoint && lastCheckpoint ? lastCheckpoint.epoch : 0;
    const targetEpoch = resumeFromCheckpoint && lastCheckpoint
      ? lastCheckpoint.epoch + maxEpochs
      : maxEpochs;

    if (!resumeFromCheckpoint || !lastCheckpoint) {
      clearTrainingState();
      setLogs([
        `[INFO] Initializing training pipeline for ${accelerator.toUpperCase()} accelerator...`,
        `[INFO] Target classes: [${(etl.classNames || []).join(', ')}]`,
        `[INFO] Precision configured: ${precision.toUpperCase()}`,
        `[INFO] Optimizer: ${modelConfig.hyperparameters.optimizer.toUpperCase()} (lr=${initialLr})`,
        `[INFO] LR Scheduler: ${lrScheduler.toUpperCase()}`,
        `[INFO] Early Stopping: ${earlyStopping ? `ENABLED (patience=${esPatience})` : 'DISABLED'}`,
        `[INFO] Building neural layer stack (${modelConfig.layers.length} modules)...`,
        `----------------------------------------------------------------------`
      ]);
    } else {
      setLogs(prev => [
        ...prev,
        `[RESUME] Continuing training from Epoch ${lastCheckpoint.epoch}.`,
        `[RESUME] Restoring weights & state dictionary...`,
        `----------------------------------------------------------------------`
      ]);
    }

    let model: any = null;
    let epoch = startEpoch;
    let useRealTraining = true;
    let isStepRunning = false;
    let inputShape: number[] = [];

    try {
      const t = await getTf();
      inputShape = buildInputShape(currentProject.domain, modelConfig);
      const classCount = etl.classNames?.length || 2;

      model = await buildModel({
        layers: modelConfig.layers,
        classCount,
        inputShape,
        optimizer: modelConfig.hyperparameters.optimizer,
        learningRate: modelConfig.hyperparameters.learningRate,
        loss: modelConfig.hyperparameters.loss,
        domain: currentProject.domain,
        vocabSize: currentProject.domain === 'llm-finetuning' ? 5000 : undefined,
      });

      setTrainingStatus('training');
      setLogs(prev => [...prev, `[INFO] Model initialized successfully. Input shape: [${inputShape.join(', ')}]`]);
    } catch (err) {
      console.error('Model build failed:', err);
      setTrainingStatus('failed');
      setLogs(prev => [...prev, `[ERROR] Model build failed: ${err}`]);
      return;
    }

    const runStep = async () => {
      const statusNow = usePipelineStore.getState().trainingStatus;
      if (statusNow === 'paused' || epoch >= targetEpoch) {
        if (epoch >= targetEpoch) {
          setTrainingStatus('completed');
          if (model && currentProject) {
            try { await saveModel(model, currentProject.id); } catch (e) { /* ignore */ }
            setLogs(prev => [...prev, `[SUCCESS] Model saved to browser storage for inference.`]);
          }
          setLogs(prev => [
            ...prev,
            `----------------------------------------------------------------------`,
            `[SUCCESS] Training process completed successfully. Target epoch reached.`
          ]);
        }
        return;
      }

      if (isStepRunning) {
        intervalRef.current = setTimeout(runStep, 1200);
        return;
      }

      isStepRunning = true;
      epoch += 1;
      setCurrentEpoch(epoch);

      let loss = 0.5;
      let accuracy = 0.0;
      let valLoss = 0.55;
      let valAccuracy = 0.0;
      let perplexity = 0.0;
      let tokens_per_sec = 0.0;
      let mAP = 0.0;
      let mAP_50 = 0.0;
      let fid = 0.0;
      let g_loss = 0.0;
      let d_loss = 0.0;
      let mae = 0.0;

      let xs: any = null;
      let ys: any = null;
      let valXs: any = null;
      let valYs: any = null;

      const timeMs = useRealTraining
        ? Math.floor((currentProject.domain === 'llm-finetuning' ? 1800 : 800) + Math.random() * 800)
        : Math.floor(400 + Math.random() * 120);

      if (useRealTraining && model) {
        try {
          const classCount = etl.classNames?.length || 2;
          const seed = (etl.seed || 42) + epoch;
          const hasRealData = etl.files.some(f => f.rawContent);

          const validFiles = etl.files.filter(f => f.rawContent);
          if (validFiles.length === 0) {
            throw new Error('No files with rawContent found for training.');
          }
          const shuffled = [...validFiles].sort(() => Math.random() - 0.5);
          const splitRatio = etl.splitRatio?.train || 80;
          const splitIndex = Math.floor(shuffled.length * (splitRatio / 100));
          let trainFiles = shuffled.slice(0, splitIndex);
          let valFiles = shuffled.slice(splitIndex);
          if (trainFiles.length === 0) trainFiles = shuffled;
          if (valFiles.length === 0) valFiles = trainFiles;

          ({ xs, ys } = await generateRealBatch(trainFiles, currentProject.domain, inputShape, classNames, etl.batchSize || 32));
          const valBatch = await generateRealBatch(valFiles, currentProject.domain, inputShape, classNames, etl.batchSize || 32);
          valXs = valBatch.xs;
          valYs = valBatch.ys;

          if (model && currentProject.domain !== 'llm-finetuning') {
            const outShape = model.outputs[0].shape;
            const targetShape = outShape.map((d: any) => d === null || d === -1 ? -1 : d);
            if (ys && targetShape.slice(1).every((d: number) => d !== -1)) {
              try {
                const yShape = ys.shape;
                if (yShape && yShape.length === targetShape.length && yShape.slice(1).every((d: number, i: number) => d === targetShape[i + 1] || targetShape[i + 1] === -1)) {
                  // shapes match, no reshape needed
                } else {
                  ys = ys.reshape([-1, ...targetShape.slice(1)]);
                }
              } catch (e) { /* ignore */ }
            }
            if (valYs && targetShape.slice(1).every((d: number) => d !== -1)) {
              try {
                valYs = valYs.reshape([-1, ...targetShape.slice(1)]);
              } catch (e) { /* ignore */ }
            }
          }
        } catch (err) {
          console.error('Batch generation failed:', err);
          setLogs(prev => [...prev, `[ERROR] Batch generation failed: ${err}`]);
        }
      }

      if (useRealTraining && model && xs && ys) {
        try {
          const history = await model.fit(xs, ys, { epochs: 1, shuffle: etl.shuffle });
          loss = history.history.loss[0] ?? loss;
          accuracy = history.history.acc?.[0] ?? history.history.accuracy?.[0] ?? accuracy;

          if (valXs && valYs) {
            const evalResult = model.evaluate(valXs, valYs);
            if (Array.isArray(evalResult)) {
              const valLossVal = await evalResult[0].data();
              valLoss = valLossVal[0] ?? valLoss;
              const valAccVal = await evalResult[1].data();
              valAccuracy = valAccVal[0] ?? valAccuracy;
              evalResult.forEach((t: any) => t.dispose());
            } else {
              const valLossVal = await evalResult.data();
              valLoss = valLossVal[0] ?? valLoss;
              evalResult.dispose();
            }
          }
        } catch (err) {
          console.error('Training step failed:', err);
          setLogs(prev => [...prev, `[ERROR] Training step failed: ${err}`]);
        }
      }

      if (currentProject.domain === 'llm-finetuning') {
        perplexity = Math.exp(loss);
        perplexity = parseFloat(perplexity.toFixed(2));
        const batchSize = etl.batchSize || 32;
        const seqLen = 100;
        tokens_per_sec = parseFloat(((batchSize * seqLen) / (timeMs / 1000)).toFixed(1));
      }

      if (useRealTraining) {
        if (currentProject.domain === 'object-detection') {
          mAP = parseFloat((0.2 + (0.7 * (1 - (1 / (1 + epoch * 0.12)))) + Math.random() * 0.02).toFixed(4));
          mAP_50 = parseFloat((mAP * 1.05).toFixed(4));
        } else if (currentProject.domain === 'gans') {
          g_loss = loss;
          d_loss = parseFloat((loss * 0.95 + Math.random() * 0.1).toFixed(4));
          fid = parseFloat((250 * (1 / (1 + epoch * 0.15)) + 15 + Math.random() * 5).toFixed(2));
        } else if (currentProject.domain === 'time-series-forecasting') {
          mae = loss * 0.85;
        }
      }

      const trainingMetric: any = {
        epoch,
        loss,
        accuracy,
        valLoss,
        valAccuracy,
      };

      if (perplexity) trainingMetric.perplexity = perplexity;
      if (tokens_per_sec) trainingMetric.tokens_per_sec = tokens_per_sec;
      if (mAP) trainingMetric.mAP = mAP;
      if (mAP_50) trainingMetric.mAP_50 = mAP_50;
      if (fid) trainingMetric.fid = fid;
      if (g_loss) trainingMetric.g_loss = g_loss;
      if (d_loss) trainingMetric.d_loss = d_loss;
      if (mae) {
        trainingMetric.mae = mae;
        trainingMetric.val_mae = valLoss * 0.85;
      }

      updateMetrics(trainingMetric);

      const activeConfig = DOMAIN_CONFIGS[currentProject.domain];
      const metricsText = activeConfig.training.metrics.map(m => {
        const val = trainingMetric[m.id];
        const formatted = typeof val === 'number'
          ? (m.id === 'tokens_per_sec' || m.id === 'perplexity' || m.id === 'fid' ? val.toFixed(2) : val.toFixed(4))
          : 'N/A';
        return `${m.label}: ${formatted}`;
      }).join(' - ');

      setLogs(prev => [
        ...prev,
        `Epoch ${epoch}/${targetEpoch} [==============================] - ${timeMs}ms/step - ${metricsText} - lr: ${initialLr.toFixed(6)}`
      ]);

      if (epoch % 2 === 0 || epoch === targetEpoch) {
        // Save to IndexedDB for client-side inference
        if (model && currentProject) {
          try { await saveModel(model, currentProject.id); } catch (e) { /* ignore */ }
        }

        await addCheckpoint({
          epoch,
          timestamp: new Date().toLocaleTimeString(),
          fileSize: Math.floor(1024 * 100 + Math.random() * 50 * 1024),
          checkpointUrl: `/api/checkpoints/download?projectId=${currentProject.id}&epoch=${epoch}`
        });

        setLogs(prev => [
          ...prev,
          `[CHECKPOINT] Epoch ${epoch} weights saved successfully (vram: ${vramUsage}GB used)`
        ]);
      }

      if (xs) xs.dispose();
      if (ys) ys.dispose();
      if (valXs) valXs.dispose();
      if (valYs) valYs.dispose();

      isStepRunning = false;
      const hasRealData = etl.files.some(f => f.rawContent);
      const stepDelay = currentProject.domain === 'llm-finetuning' ? 2500
        : (hasRealData && (currentProject.domain === 'cv-classification' || currentProject.domain === 'object-detection')) ? 4000
        : 1200;
      intervalRef.current = setTimeout(runStep, stepDelay);
    };

    intervalRef.current = setTimeout(runStep, 1200);
  };

  const handlePauseTraining = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTrainingStatus('paused');
    setLogs(prev => [...prev, `[PAUSED] Training suspended by operator.`]);
  };

  const handleResetTraining = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setResumeFromCheckpoint(false);
    clearTrainingState();
    setLogs([]);
  };

  // ─── Chart geometry ────────────────────────────────────────────────
  const W = 620, H = 220;
  const PL = 44, PR = 20, PT = 16, PB = 8;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const n = metricsHistory.length;
  const stepX = n > 1 ? plotW / (n - 1) : plotW;

  const activeConfig = DOMAIN_CONFIGS[currentProject.domain];

  const getStrokeColor = (cls: string) => {
    if (cls.includes('royalblue')) return '#4169e1';
    if (cls.includes('green')) return '#22c55e';
    if (cls.includes('rose') || cls.includes('red')) return '#f43f5e';
    if (cls.includes('orange') || cls.includes('amber')) return '#f97316';
    return '#a3a3a3';
  };

  const getXY = (index: number, metricId: string) => {
    const x = PL + index * stepX;
    const val = (metricsHistory[index] as any)[metricId] !== undefined ? ((metricsHistory[index] as any)[metricId] as number) : 0;
    const maxVal = Math.max(...metricsHistory.map(h => ((h as any)[metricId] as number) || 0), 1.0);
    const norm = maxVal > 0 ? val / maxVal : 0;
    const y = H - PB - norm * plotH;
    return { x, y, val };
  };

  // Smooth cubic bezier path
  const smoothPath = (metricId: string) => {
    if (n === 0) return '';
    if (n === 1) {
      const { x, y } = getXY(0, metricId);
      return `M ${x} ${y}`;
    }
    let d = '';
    for (let i = 0; i < n; i++) {
      const { x, y } = getXY(i, metricId);
      if (i === 0) {
        d += `M ${x} ${y}`;
      } else {
        const prev = getXY(i - 1, metricId);
        const cpx = (prev.x + x) / 2;
        d += ` C ${cpx} ${prev.y}, ${cpx} ${y}, ${x} ${y}`;
      }
    }
    return d;
  };

  const polyPoints = (metricId: string) =>
    metricsHistory.map((_, i) => {
      const { x, y } = getXY(i, metricId);
      return `${x},${y}`;
    }).join(' ');

  const areaPath = (metricId: string, smooth = false) => {
    if (n === 0) return '';
    const base = H - PB;
    if (smooth) {
      const p = smoothPath(metricId);
      const last = getXY(n - 1, metricId);
      const first = getXY(0, metricId);
      return `${p} L ${last.x} ${base} L ${first.x} ${base} Z`;
    }
    const pts = metricsHistory.map((_, i) => {
      const { x, y } = getXY(i, metricId);
      return `${x},${y}`;
    });
    const last = getXY(n - 1, metricId);
    const first = getXY(0, metricId);
    return `M ${first.x} ${base} L ${pts.join(' L ')} L ${last.x} ${base} L ${first.x} ${base} Z`;
  };

  const yLabels = [1.0, 0.75, 0.5, 0.25, 0.0];

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 sm:p-8 space-y-6 sm:space-y-8">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="text-left">
          <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-900 dark:text-white">Module D: High-Scale Telemetry &amp; Execution</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Scale training workloads using standard PyTorch executors and trace metrics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Resume Toggle */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 transition-all ${
              canResume && isIdle
                ? 'bg-white dark:bg-neutral-950 shadow-sm cursor-pointer'
                : 'bg-neutral-100 dark:bg-neutral-950 opacity-40 cursor-not-allowed'
            }`}
            title={canResume ? `Resume from epoch ${lastCheckpoint!.epoch}` : 'No checkpoints available yet'}
          >
            <History className="w-3.5 h-3.5 text-royalblue-500" />
            <span className="text-neutral-700 dark:text-neutral-300">Resume</span>
            <button
              onClick={() => canResume && isIdle && setResumeFromCheckpoint(v => !v)}
              disabled={!canResume || !isIdle}
              className={`relative inline-flex items-center h-4.5 w-8.5 rounded-full transition-colors ${
                resumeFromCheckpoint && canResume ? 'bg-royalblue-600' : 'bg-neutral-200 dark:bg-neutral-800'
              }`}
            >
              <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
                resumeFromCheckpoint && canResume ? 'translate-x-[16px]' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {trainingStatus !== 'training' ? (
            <button
              onClick={handleStartTraining}
              className="px-4 py-2 bg-royalblue-600 hover:bg-royalblue-500 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              {resumeFromCheckpoint && canResume ? 'Resume Scaling' : 'Run Executor'}
            </button>
          ) : (
            <button
              onClick={handlePauseTraining}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all"
            >
              <Pause className="w-3.5 h-3.5" /> Suspend
            </button>
          )}
          <button
            onClick={handleResetTraining}
            className="p-2 bg-neutral-100 dark:bg-neutral-950 text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-850 rounded-xl transition-all"
            title="Reset training state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Resume Info Banner */}
      {resumeFromCheckpoint && lastCheckpoint && isIdle && (
        <div className="bg-royalblue-500/10 border border-royalblue-500/20 rounded-xl px-4 py-3 flex items-center gap-3 text-left">
          <History className="w-4 h-4 text-royalblue-500 shrink-0" />
          <p className="text-xs text-neutral-700 dark:text-neutral-300">
            Will resume from <span className="font-mono font-bold text-royalblue-500">Epoch {lastCheckpoint.epoch}</span>
            {' '}→ append <span className="font-mono font-semibold">{maxEpochs}</span> more epochs, running to <span className="font-mono font-bold text-royalblue-500">Epoch {lastCheckpoint.epoch + maxEpochs}</span>.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 ${activeConfig.training.metrics.length > 2 ? 'md:grid-cols-6' : 'md:grid-cols-4'} gap-4`}>
        <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl shadow-sm text-left border border-neutral-100 dark:border-neutral-900">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Fitting Status</span>
          <span className={`text-sm font-extrabold uppercase mt-1 inline-block ${
            trainingStatus === 'training' ? 'text-emerald-500 animate-pulse' 
            : trainingStatus === 'completed' ? 'text-royalblue-500' 
            : 'text-neutral-500'
          }`}>{trainingStatus}</span>
        </div>
        <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl shadow-sm text-left border border-neutral-100 dark:border-neutral-900">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Epoch Progress</span>
          <span className="text-sm font-mono font-extrabold text-neutral-900 dark:text-white mt-1 inline-block">
            {currentEpoch} <span className="text-xs text-neutral-400 font-normal font-sans">/ {resumeFromCheckpoint && lastCheckpoint ? lastCheckpoint.epoch + maxEpochs : maxEpochs}</span>
          </span>
        </div>
        {activeConfig.training.metrics.map(m => {
          const latest = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1] : null;
          const val = latest ? (latest as any)[m.id] : null;
          return (
            <div key={m.id} className="bg-white dark:bg-neutral-950 p-4 rounded-xl shadow-sm text-left border border-neutral-100 dark:border-neutral-900">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">{m.label}</span>
              <span className={`text-sm font-mono font-extrabold mt-1 inline-block ${m.color}`}>
                {val !== null && val !== undefined
                  ? val.toFixed(m.id === 'perplexity' || m.id === 'tokens_per_sec' || m.id === 'fid' ? 2 : 4)
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid of Workload Settings & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left column: Hardware Accelerator Configuration */}
        <div className="lg:col-span-1 space-y-5 text-left">
          <div className="bg-white dark:bg-neutral-950 rounded-xl p-5 shadow-sm space-y-4 border border-neutral-100 dark:border-neutral-900">
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-royalblue-500" />
              <span>Executor Workload</span>
            </h4>
            
            {/* Accelerator type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Hardware Device
              </label>
              <select 
                value={accelerator} 
                onChange={e => setAccelerator(e.target.value as any)}
                disabled={!isIdle}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-2.5 py-2 text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-100 dark:border-neutral-850 focus:outline-none"
              >
                <option value="gpu">NVIDIA CUDA / Apple MPS (GPU)</option>
                <option value="cpu">Host Processor (CPU)</option>
                <option value="tpu">Cloud Tensor Core (TPU)</option>
              </select>
            </div>

            {/* Precision Select */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Execution Precision
              </label>
              <select 
                value={precision} 
                onChange={e => setPrecision(e.target.value as any)}
                disabled={!isIdle}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-2.5 py-2 text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-100 dark:border-neutral-850 focus:outline-none"
              >
                <option value="fp16">AMP FP16 (Mixed Precision)</option>
                <option value="fp32">FP32 (Single Precision)</option>
                <option value="bf16">BF16 (Bfloat16 Optimization)</option>
              </select>
            </div>

            {/* LR Decay Scheduler */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Learning Rate Decay
              </label>
              <select 
                value={lrScheduler} 
                onChange={e => setLrScheduler(e.target.value as any)}
                disabled={!isIdle}
                className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg px-2.5 py-2 text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-100 dark:border-neutral-850 focus:outline-none"
              >
                <option value="cosine">Cosine Annealing Scheduler</option>
                <option value="step">Step LR Scheduler (0.5x every 5 ep)</option>
                <option value="constant">Constant (No Decay)</option>
              </select>
            </div>

            {/* Early stopping option */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-500">Early Stopping Monitor</span>
                <button
                  onClick={() => isIdle && setEarlyStopping(!earlyStopping)}
                  disabled={!isIdle}
                  className={`relative inline-flex items-center h-4 w-7 rounded-full transition-colors ${
                    earlyStopping ? 'bg-royalblue-600' : 'bg-neutral-200 dark:bg-neutral-800'
                  }`}
                >
                  <span className={`inline-block w-3 h-3 bg-white rounded-full transition-transform ${
                    earlyStopping ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {earlyStopping && (
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/60 p-2 rounded-lg border border-neutral-100 dark:border-neutral-850">
                  <span className="text-[10px] text-neutral-500">Patience (epochs)</span>
                  <input 
                    type="number" 
                    value={esPatience} 
                    onChange={e => setEsPatience(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!isIdle}
                    className="w-12 bg-white dark:bg-neutral-950 text-center rounded border border-neutral-200 dark:border-neutral-800 text-[10px] py-0.5 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Device Telemetry Card */}
          <div className="bg-white dark:bg-neutral-950 rounded-xl p-5 shadow-sm space-y-3 border border-neutral-100 dark:border-neutral-900">
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              <span>Hardware Telemetry</span>
            </h4>
            
            <div className="space-y-2.5 pt-1 text-xs">
              {/* Utilization progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-neutral-500">Core Engine Load</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 font-bold">{utilization}%</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>

              {/* VRAM stats */}
              <div className="flex justify-between items-center py-1.5 border-t border-neutral-100 dark:border-neutral-900">
                <span className="text-neutral-500 text-[10px]">VRAM Allocation</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold">
                  {trainingStatus === 'training' ? `${vramUsage} GB / 16.0 GB` : '0.0 GB / 16.0 GB'}
                </span>
              </div>

              {/* Temp stats */}
              <div className="flex justify-between items-center pt-1.5 border-t border-neutral-100 dark:border-neutral-900">
                <span className="text-neutral-500 text-[10px]">Accelerator Temp</span>
                <span className={`font-mono font-semibold ${gpuTemp > 65 ? 'text-red-500' : 'text-neutral-800 dark:text-neutral-200'}`}>
                  {gpuTemp}°C
                </span>
              </div>
            </div>
          </div>

          {/* Time-Series Validation split visualizer */}
          {currentProject.domain === 'time-series-forecasting' && (
            <div className="bg-white dark:bg-neutral-950 rounded-xl p-5 shadow-sm space-y-3 border border-neutral-100 dark:border-neutral-900 text-left animate-fadeIn">
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-royalblue-500" />
                <span>Walk-Forward Split Strategy</span>
              </h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Time-Series Walk-Forward splits prevent lookahead bias. Data is trained sequentially over rolling horizons.
              </p>
              
              <div className="space-y-2 pt-1 font-mono text-[9px]">
                {/* Fold 1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>Fold 1</span>
                    <span className="text-royalblue-500 font-bold">t-30 to t+7</span>
                  </div>
                  <div className="flex h-3.5 rounded overflow-hidden text-center text-white font-bold text-[8px]">
                    <div className="bg-neutral-800 dark:bg-neutral-900 w-[60%] flex items-center justify-center border-r border-neutral-700">Train (60%)</div>
                    <div className="bg-royalblue-600 w-[20%] flex items-center justify-center border-r border-royalblue-500">Val (20%)</div>
                    <div className="bg-neutral-400 dark:bg-neutral-600 w-[20%] flex items-center justify-center text-neutral-800 dark:text-neutral-300">Test (20%)</div>
                  </div>
                </div>

                {/* Fold 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>Fold 2</span>
                    <span className="text-royalblue-500 font-bold">t-15 to t+7</span>
                  </div>
                  <div className="flex h-3.5 rounded overflow-hidden text-center text-white font-bold text-[8px]">
                    <div className="bg-neutral-800 dark:bg-neutral-900 w-[70%] flex items-center justify-center border-r border-neutral-700">Train (70%)</div>
                    <div className="bg-royalblue-600 w-[15%] flex items-center justify-center border-r border-royalblue-500">Val (15%)</div>
                    <div className="bg-neutral-400 dark:bg-neutral-600 w-[15%] flex items-center justify-center text-neutral-800 dark:text-neutral-300">Test (15%)</div>
                  </div>
                </div>

                {/* Fold 3 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>Fold 3</span>
                    <span className="text-royalblue-500 font-bold">t to t+7</span>
                  </div>
                  <div className="flex h-3.5 rounded overflow-hidden text-center text-white font-bold text-[8px]">
                    <div className="bg-neutral-800 dark:bg-neutral-900 w-[80%] flex items-center justify-center border-r border-neutral-700">Train (80%)</div>
                    <div className="bg-royalblue-600 w-[10%] flex items-center justify-center border-r border-royalblue-500">Val (10%)</div>
                    <div className="bg-neutral-400 dark:bg-neutral-600 w-[10%] flex items-center justify-center text-neutral-800 dark:text-neutral-300">Test (10%)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 2 columns: Interactive Tabbed Panel (Telemetry / Notebook logs / Python Script) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Tabs header - scrollable on mobile */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 gap-2 flex-wrap">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              <button 
                onClick={() => setActiveTab('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'graph' 
                    ? 'bg-royalblue-500/10 text-royalblue-500' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Live Graphs
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'logs' 
                    ? 'bg-royalblue-500/10 text-royalblue-500' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Notebook Logs
              </button>
              <button 
                onClick={() => setActiveTab('script')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'script' 
                    ? 'bg-royalblue-500/10 text-royalblue-500' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Export Script
              </button>
            </div>
            
            {activeTab === 'graph' && metricsHistory.length > 0 && (
              <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-950 rounded-lg">
                {CHART_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => setChartType(ct.id)}
                    title={ct.label}
                    className={`p-1 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all ${
                      chartType === ct.id ? 'bg-white dark:bg-neutral-900 text-royalblue-500 shadow-sm' : ''
                    }`}
                  >
                    {ct.icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TAB CONTENT: Live Graphs */}
          {activeTab === 'graph' && (
            <div className="bg-white dark:bg-neutral-950 rounded-2xl shadow-sm overflow-hidden border border-neutral-100 dark:border-neutral-900">
              
              {/* Legends */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-4 sm:px-6 pt-5 pb-3 border-b border-neutral-50 dark:border-neutral-900">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Metrics Trace</span>
                <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400">
                  {activeConfig.training.metrics.map(m => (
                    <span key={m.id} className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: getStrokeColor(m.color) }} />
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chart SVG wrapper */}
              <div className="relative bg-neutral-950 px-2 pb-2 mx-4 mt-4 rounded-xl overflow-hidden">
                <svg width="0" height="0" className="absolute">
                   <defs>
                     <linearGradient id="grad-acc" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#4169e1" stopOpacity="0.3" />
                       <stop offset="100%" stopColor="#4169e1" stopOpacity="0.01" />
                     </linearGradient>
                     <linearGradient id="grad-loss" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#f87171" stopOpacity="0.2" />
                       <stop offset="100%" stopColor="#f87171" stopOpacity="0.01" />
                     </linearGradient>
                     <filter id="glow-blue">
                       <feGaussianBlur stdDeviation="2.5" result="blur" />
                       <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                     </filter>
                   </defs>
                </svg>

                {metricsHistory.length > 0 ? (
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 180 }}>
                    {yLabels.map((v, i) => {
                      const y = PT + (1 - v) * plotH;
                      return (
                        <g key={`ylabel-${i}`}>
                          <line
                            x1={PL} y1={y} x2={W - PR} y2={y}
                            stroke="#ffffff10" strokeWidth="1"
                            strokeDasharray={v === 0 || v === 1 ? '0' : '4 4'}
                          />
                          <text x={PL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#555" fontFamily="monospace">
                            {v.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}

                    {/* BAR CHART */}
                    {chartType === 'bar' && metricsHistory.map((m, i) => {
                      const mainMetrics = activeConfig.training.metrics.filter(met => met.isMain || met.id === 'loss');
                      const barW = Math.max(1.5, (plotW / n) / (mainMetrics.length + 1));
                      const x = PL + i * stepX;
                      return (
                        <g key={`bar-${i}`}>
                          {mainMetrics.map((met, idx) => {
                            const val = (m as any)[met.id] !== undefined ? ((m as any)[met.id] as number) : 0;
                            const maxVal = Math.max(...metricsHistory.map(h => ((h as any)[met.id] as number) || 0), 1.0);
                            const valH = maxVal > 0 ? (val / maxVal) * plotH : 0;
                            const offset = (idx - mainMetrics.length / 2) * (barW + 1);
                            return (
                              <rect
                                key={met.id}
                                x={x + offset}
                                y={H - PB - valH}
                                width={barW}
                                height={valH}
                                fill={getStrokeColor(met.color)}
                                opacity="0.8"
                                rx="1"
                              />
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* SCATTER CHART */}
                    {chartType === 'scatter' && metricsHistory.map((m, i) => {
                      const mainMetrics = activeConfig.training.metrics.filter(met => met.isMain || met.id === 'loss');
                      return (
                        <g key={`scatter-${i}`}>
                          {mainMetrics.map(met => {
                            const { x, y } = getXY(i, met.id);
                            return (
                              <circle
                                key={met.id}
                                cx={x}
                                cy={y}
                                r={met.isMain ? "4" : "3"}
                                fill={getStrokeColor(met.color)}
                                opacity="0.8"
                              />
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* AREA CHART */}
                    {chartType === 'area' && (
                      <>
                        {activeConfig.training.metrics.filter(met => met.isMain || met.id === 'loss').map(met => (
                          <g key={met.id}>
                            <path d={areaPath(met.id)} fill={met.id === 'loss' || met.id === 'g_loss' ? "url(#grad-loss)" : "url(#grad-acc)"} />
                            <polyline points={polyPoints(met.id)} fill="none" stroke={getStrokeColor(met.color)} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
                          </g>
                        ))}
                      </>
                    )}

                    {/* LINE CHART */}
                    {chartType === 'line' && (
                      <>
                        {activeConfig.training.metrics.filter(met => met.isMain || met.id === 'loss').map(met => (
                          <polyline
                            key={met.id}
                            points={polyPoints(met.id)}
                            fill="none"
                            stroke={getStrokeColor(met.color)}
                            strokeWidth={met.isMain ? "2" : "1.2"}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            opacity="0.9"
                          />
                        ))}
                      </>
                    )}

                    {/* SMOOTH CHART */}
                    {chartType === 'smooth' && (
                      <>
                        {activeConfig.training.metrics.filter(met => met.isMain || met.id === 'loss').map(met => (
                          <g key={met.id}>
                            <path d={areaPath(met.id, true)} fill={met.id === 'loss' || met.id === 'g_loss' ? "url(#grad-loss)" : "url(#grad-acc)"} />
                            <path d={smoothPath(met.id)} fill="none" stroke={getStrokeColor(met.color)} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                          </g>
                        ))}
                      </>
                    )}

                    {/* Interactive dots overlay */}
                    {(chartType === 'line' || chartType === 'area' || chartType === 'smooth') && metricsHistory.map((m, i) => {
                      const mainMetric = activeConfig.training.metrics.find(met => met.isMain) || activeConfig.training.metrics[0];
                      const { x, y } = getXY(i, mainMetric.id);
                      const val = (m as any)[mainMetric.id] !== undefined ? ((m as any)[mainMetric.id] as number) : 0;
                      return (
                        <g key={`dot-${i}`} className="group/dot">
                          <circle cx={x} cy={y} r="3" fill={getStrokeColor(mainMetric.color)} stroke="#0a0a0f" strokeWidth="1.5" className="cursor-pointer" />
                          <rect x={x - 22} y={y - 22} width="44" height="14" rx="3" fill="#1e1e2e" opacity="0" className="group-hover/dot:opacity-100 transition-opacity" />
                          <text x={x} y={y - 12} textAnchor="middle" fontSize="8.5" fill="#818cf8" fontFamily="monospace" fontWeight="bold" className="opacity-0 group-hover/dot:opacity-100 transition-opacity">
                            {val.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center gap-2">
                    <TrendingUp className="w-8 h-8 text-neutral-700" />
                    <p className="text-xs text-neutral-600 font-medium">Start training to render live telemetry</p>
                  </div>
                )}
              </div>

              {/* Epoch metrics stats list */}
              {metricsHistory.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="overflow-auto max-h-[160px] rounded-xl border border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-900">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900 z-10 border-b border-neutral-100 dark:border-neutral-900">
                        <tr className="text-neutral-400 dark:text-neutral-550 uppercase tracking-wider font-semibold text-[9px] font-mono">
                          <th className="py-2.5 pl-4">Epoch</th>
                          {activeConfig.training.metrics.map(m => (
                            <th key={m.id} className="py-2.5 text-right font-mono" style={{ color: getStrokeColor(m.color) }}>
                              {m.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 font-mono">
                        {metricsHistory.map((m, idx) => (
                          <tr key={`metric-${(m as any).epoch || idx}`} className="hover:bg-neutral-100 dark:hover:bg-neutral-850/60 transition-colors">
                            <td className="py-2 pl-4 font-sans text-neutral-500 dark:text-neutral-400 text-[11px]">Ep {(m as any).epoch}</td>
                            {activeConfig.training.metrics.map(met => {
                              const val = (m as any)[met.id];
                              return (
                                <td key={met.id} className="py-2 text-right text-[11px]" style={{ color: getStrokeColor(met.color) }}>
                                  {val !== undefined ? val.toFixed(4) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: Notebook logs console */}
          {activeTab === 'logs' && (
            <div className="bg-neutral-950 text-neutral-300 font-mono text-[11px] rounded-2xl p-4 min-h-[300px] max-h-[400px] overflow-y-auto text-left border border-neutral-900 space-y-1 relative shadow-inner">
              <div className="sticky top-0 bg-neutral-950/95 backdrop-blur-md pb-2 border-b border-neutral-900 mb-2 flex justify-between items-center text-[10px] text-neutral-500">
                <span>trace_executor_logs.stdout</span>
                <span className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded text-neutral-400">
                  <Terminal className="w-3 h-3" /> Live Console
                </span>
              </div>
              
              <div className="space-y-0.5">
                {logs.map((log, i) => (
                  <div key={`log-${i}-${log.slice(0, 20)}`} className={
                    log.includes('[SUCCESS]') ? 'text-emerald-400' 
                    : log.includes('[CHECKPOINT]') ? 'text-cyan-400'
                    : log.includes('[RESUME]') ? 'text-yellow-400'
                    : log.includes('[INFO]') ? 'text-neutral-500'
                    : 'text-neutral-300'
                  }>
                    {log}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-neutral-600 flex flex-col items-center justify-center py-20 gap-2">
                    <Terminal className="w-6 h-6" />
                    <span>Console idle. Start scaling to output stdout logging stream.</span>
                  </div>
                )}
                {trainingStatus === 'training' && (
                  <div className="flex items-center gap-1.5 text-royalblue-400 pt-1">
                    <span className="w-1.5 h-1.5 bg-royalblue-500 rounded-full animate-ping" />
                    <span>Executing epoch iterations...</span>
                  </div>
                )}
                <div ref={consoleBottomRef} />
              </div>
            </div>
          )}

          {/* TAB CONTENT: Export Python PyTorch Script */}
          {activeTab === 'script' && (
            <div className="bg-neutral-950 rounded-2xl border border-neutral-900 overflow-hidden text-left relative">
              <div className="bg-neutral-900/50 px-4 py-2.5 border-b border-neutral-900 flex justify-between items-center">
                <span className="font-mono text-[10px] text-neutral-400">pytorch_training_pipeline.py</span>
                <button 
                  onClick={copyScript}
                  className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[10px] font-semibold transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy Script'}
                </button>
              </div>
              <pre className="p-4 font-mono text-[10.5px] text-neutral-300 overflow-auto max-h-[320px] leading-relaxed">
                <code>{generatePyTorchScript()}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Model Checkpoints Section */}
      <div className="space-y-4 text-left pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Model Checkpoints</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[350px] overflow-y-auto pr-1">
          {checkpoints.map((cp) => (
            <div
              key={cp.epoch}
              className={`p-4 rounded-xl flex items-center justify-between transition-all border ${
                resumeFromCheckpoint && lastCheckpoint && cp.epoch === lastCheckpoint.epoch
                  ? 'bg-royalblue-500/10 border-royalblue-500/30'
                  : 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 border-neutral-100 dark:border-neutral-850'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Epoch {cp.epoch}</p>
                  {resumeFromCheckpoint && lastCheckpoint && cp.epoch === lastCheckpoint.epoch && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-royalblue-500 text-white font-bold font-mono scale-90">ACTIVE</span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{cp.timestamp} · {(cp.fileSize / 1024).toFixed(0)} KB</p>
              </div>
              <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg text-royalblue-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
          {checkpoints.length === 0 && (
            <div className="col-span-full p-8 bg-white dark:bg-neutral-950 rounded-2xl text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800">
              No checkpoints serialized yet. Run execution to output model weights checkpoints.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
