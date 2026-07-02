import { DomainConfig } from './types';
import { ProjectDomain } from '../../types/pipeline';

export const DOMAIN_CONFIGS: Record<ProjectDomain, DomainConfig> = {
  'cv-classification': {
    id: 'cv-classification',
    displayName: 'Computer Vision (Classification)',
    description: 'Classify images using deep convolutional networks (CNNs). Configured for image scaling, gray-scaling, and dataset augmentation.',
    pipeline: {
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      allowedFileTypes: ['image'],
      ingestionFormats: [
        { id: 'standard', label: 'Standard (Images)' },
        { id: 'coco', label: 'COCO JSON (Annotations + Images)' }
      ],
      preprocessingOptions: [
        { id: 'resize', type: 'resize', label: 'Resize Image', category: 'Preprocessing', description: 'Scale spatial dimensions of images.', defaultParams: { width: 224, height: 224 } },
        { id: 'grayscale', type: 'grayscale', label: 'Convert to Grayscale', category: 'Preprocessing', description: 'Remove color channels.', defaultParams: {} },
        { id: 'pixel-normalize-0-1', type: 'pixel-normalize-0-1', label: 'Pixel Scale [0, 1]', category: 'Preprocessing', description: 'Normalize pixel values from [0, 255] to [0.0, 1.0].', defaultParams: {} },
        { id: 'pixel-normalize-1-1', type: 'pixel-normalize-1-1', label: 'Pixel Scale [-1, 1]', category: 'Preprocessing', description: 'Normalize pixel values to [-1.0, 1.0] for GAN compatibility.', defaultParams: {} },
        { id: 'augment-flip', type: 'augment-flip', label: 'Augment: Horizontal Flip', category: 'Augmentation', description: 'Mirror image horizontally.', defaultParams: {} },
        { id: 'augment-rotate', type: 'augment-rotate', label: 'Augment: Random Rotation', category: 'Augmentation', description: 'Randomly rotate image within angle bounds.', defaultParams: { maxAngle: 30 } },
        { id: 'augment-brightness', type: 'augment-brightness', label: 'Augment: Brightness Jitter', category: 'Augmentation', description: 'Randomly alter brightness.', defaultParams: { factor: 0.2 } },
        { id: 'augment-zoom', type: 'augment-zoom', label: 'Augment: Random Zoom', category: 'Augmentation', description: 'Randomly crop and resize.', defaultParams: { factor: 0.2 } }
      ],
      defaultActions: [
        { id: 'img-resize', type: 'resize', params: { width: 224, height: 224 }, enabled: true },
        { id: 'img-norm', type: 'pixel-normalize-0-1', params: {}, enabled: true }
      ],
      defaultClassNames: ['Cat', 'Dog', 'Bird']
    },
    modelBuilder: {
      layerOptions: [
        { id: 'conv2d', label: 'Conv2D — Convolutional', description: '2D Spatial filtering layer.', category: 'Convolutional', defaultParams: { filters: 32, kernelSize: 3, activation: 'relu', padding: 'same', strides: 1, dropout: 0 } },
        { id: 'maxPooling2d', label: 'MaxPooling2D', description: 'Spatial pooling layer to downsample representations.', category: 'Convolutional', defaultParams: { poolSize: 2, strides: 2 } },
        { id: 'flatten', label: 'Flatten', description: 'Flatten spatial tensors to dense vectors.', category: 'Convolutional', defaultParams: {} },
        { id: 'dense', label: 'Dense — Fully Connected', description: 'Standard linear/dense block.', category: 'Fully Connected', defaultParams: { units: 64, activation: 'relu', dropout: 0, l2: 0 } },
        { id: 'dropout', label: 'Dropout', description: 'Randomly drop connections to mitigate overfitting.', category: 'Fully Connected', defaultParams: { rate: 0.25 } },
        { id: 'batchNorm', label: 'Batch Normalization', description: 'Normalize activations at previous layers.', category: 'Fully Connected', defaultParams: { momentum: 0.99, epsilon: 0.001 } }
      ],
      lossFunctions: [
        { id: 'categoricalCrossentropy', label: 'Categorical Crossentropy (Multiclass)', description: 'Best for mutual exclusive multi-label outputs.' },
        { id: 'binaryCrossentropy', label: 'Binary Crossentropy (Binary Classification)', description: 'Best for single output sigmoid classification.' },
        { id: 'sparseCategoricalCrossentropy', label: 'Sparse Categorical Crossentropy', description: 'Alternative for integer-encoded classification labels.' }
      ],
      defaultLayers: [
        { id: 'conv-1', type: 'conv2d', config: { filters: 32, kernelSize: 3, activation: 'relu', padding: 'same', strides: 1, inputShape: [224, 224, 3] } },
        { id: 'pool-1', type: 'maxPooling2d', config: { poolSize: 2, strides: 2 } },
        { id: 'flatten-1', type: 'flatten', config: {} },
        { id: 'dense-1', type: 'dense', config: { units: 64, activation: 'relu' } },
        { id: 'output', type: 'dense', config: { units: 3, activation: 'softmax' } }
      ],
      defaultHyperparameters: {
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        learningRate: 0.001,
        batchSize: 32,
        epochs: 10
      }
    },
    training: {
      metrics: [
        { id: 'loss', label: 'Train Loss', color: 'text-neutral-500', isMain: false },
        { id: 'accuracy', label: 'Top-1 Accuracy', color: 'text-royalblue-500', isMain: true },
        { id: 'valLoss', label: 'Val Loss', color: 'text-rose-500', isMain: false },
        { id: 'valAccuracy', label: 'Val Accuracy', color: 'text-green-500', isMain: true }
      ],
      generateMockMetrics: (epoch, maxEpochs, initialLr) => {
        const factor = 1 / (1 + epoch * 0.15);
        const loss = parseFloat((0.8 * factor + Math.random() * 0.03).toFixed(4));
        const accuracy = parseFloat((0.2 + (0.75 * (1 - factor)) + Math.random() * 0.02).toFixed(4));
        const valLoss = parseFloat((0.85 * factor + Math.random() * 0.05).toFixed(4));
        const valAccuracy = parseFloat((0.18 + (0.72 * (1 - factor)) + Math.random() * 0.03).toFixed(4));
        return { loss, accuracy, valLoss, valAccuracy };
      }
    },
    sandbox: {
      inputType: 'image',
      outputType: 'classification',
      inputTitle: 'Computer Vision Sandbox Ingestion',
      inputPlaceholder: 'PNG, JPG, WEBP supported',
      primaryBtnText: 'Compute Image Inference',
      outputTitle: 'Classification Output',
      defaultMockResult: (input, classNames) => {
        const predictedClass = classNames[Math.floor(Math.random() * classNames.length)] || 'Cat';
        return {
          class: predictedClass,
          confidence: 0.942,
          latencyMs: 14
        };
      },
      bulkMockResult: (fileName, classNames) => {
        const trueClass = classNames[Math.floor(Math.random() * classNames.length)] || 'Cat';
        const isCorrect = Math.random() > 0.15;
        const confidence = 0.70 + Math.random() * 0.28;
        const latencyMs = Math.floor(8 + Math.random() * 12);
        let predClass = trueClass;
        if (!isCorrect) {
          const alternates = classNames.filter(c => c !== trueClass);
          predClass = alternates[Math.floor(Math.random() * alternates.length)] || 'IncorrectClass';
        }
        return { name: fileName, trueClass, predClass, confidence, latencyMs, correct: isCorrect };
      }
    }
  },

  'object-detection': {
    id: 'object-detection',
    displayName: 'Object Detection',
    description: 'Locate and classify multiple objects in an image. Integrates bounding box annotations and tensor-based transformations.',
    pipeline: {
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
      allowedFileTypes: ['image'],
      ingestionFormats: [
        { id: 'yolo', label: 'YOLO (Images + TXT labels)' },
        { id: 'voc', label: 'Pascal VOC (Images + XML annotations)' },
        { id: 'coco', label: 'COCO JSON (Annotations + Images)' }
      ],
      preprocessingOptions: [
        { id: 'resize', type: 'resize', label: 'Resize Image', category: 'Preprocessing', description: 'Scale images while adjusting annotations.', defaultParams: { width: 416, height: 416 } },
        { id: 'pixel-normalize-0-1', type: 'pixel-normalize-0-1', label: 'Pixel Scale [0, 1]', category: 'Preprocessing', description: 'Normalize pixels to floating point range.', defaultParams: {} },
        { id: 'augment-flip', type: 'augment-flip', label: 'Augment: Bounding Box Flip', category: 'Augmentation', description: 'Flip image and mirror bounding box annotations.', defaultParams: {} },
        { id: 'augment-rotate', type: 'augment-rotate', label: 'Augment: Random Rotation', category: 'Augmentation', description: 'Rotate image and transform annotations.', defaultParams: { maxAngle: 15 } }
      ],
      defaultActions: [
        { id: 'det-resize', type: 'resize', params: { width: 416, height: 416 }, enabled: true },
        { id: 'det-norm', type: 'pixel-normalize-0-1', params: {}, enabled: true }
      ],
      defaultClassNames: ['Car', 'Pedestrian', 'Signal']
    },
    modelBuilder: {
      layerOptions: [
        { id: 'conv2d', label: 'Conv2D — Feature Extractor', description: 'Convolutional layers to pull visual features.', category: 'Convolutional', defaultParams: { filters: 64, kernelSize: 3, activation: 'relu', padding: 'same', strides: 1, dropout: 0 } },
        { id: 'maxPooling2d', label: 'MaxPooling2D', description: 'Downsampling features.', category: 'Convolutional', defaultParams: { poolSize: 2, strides: 2 } },
        { id: 'flatten', label: 'Flatten', description: 'Flatten for localization head.', category: 'Convolutional', defaultParams: {} },
        { id: 'dense', label: 'Dense — Localization/Class Head', description: 'Fully connected prediction layer.', category: 'Fully Connected', defaultParams: { units: 128, activation: 'relu', dropout: 0, l2: 0 } },
        { id: 'dropout', label: 'Dropout', description: 'Regularization rate.', category: 'Fully Connected', defaultParams: { rate: 0.3 } },
        { id: 'batchNorm', label: 'Batch Normalization', description: 'Scale tensor outputs.', category: 'Fully Connected', defaultParams: { momentum: 0.99, epsilon: 0.001 } }
      ],
      lossFunctions: [
        { id: 'categoricalCrossentropy', label: 'Smooth L1 / IoU + Categorical Crossentropy', description: 'Localization (Bbox regression) + Class Classification.' },
        { id: 'meanSquaredError', label: 'MSE Bounding Box Regression', description: 'Standard MSE on box coordinates.' }
      ],
      defaultLayers: [
        { id: 'conv-1', type: 'conv2d', config: { filters: 32, kernelSize: 3, activation: 'relu', padding: 'same', inputShape: [416, 416, 3] } },
        { id: 'pool-1', type: 'maxPooling2d', config: { poolSize: 2, strides: 2 } },
        { id: 'conv-2', type: 'conv2d', config: { filters: 64, kernelSize: 3, activation: 'relu', padding: 'same' } },
        { id: 'pool-2', type: 'maxPooling2d', config: { poolSize: 2, strides: 2 } },
        { id: 'flatten-1', type: 'flatten', config: {} },
        { id: 'dense-head', type: 'dense', config: { units: 128, activation: 'relu' } },
        { id: 'output', type: 'dense', config: { units: 4, activation: 'sigmoid' } } // 4 box coordinates
      ],
      defaultHyperparameters: {
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        learningRate: 0.0005,
        batchSize: 16,
        epochs: 15
      }
    },
    training: {
      metrics: [
        { id: 'loss', label: 'Train Loss', color: 'text-neutral-500', isMain: false },
        { id: 'mAP', label: 'Mean AP (mAP)', color: 'text-royalblue-500', isMain: true },
        { id: 'valLoss', label: 'Val Loss', color: 'text-rose-500', isMain: false },
        { id: 'mAP_50', label: 'mAP @ 0.50', color: 'text-green-500', isMain: true }
      ],
      generateMockMetrics: (epoch, maxEpochs, initialLr) => {
        const factor = 1 / (1 + epoch * 0.12);
        const loss = parseFloat((1.2 * factor + Math.random() * 0.05).toFixed(4));
        const mAP = parseFloat((0.15 + (0.7 * (1 - factor)) + Math.random() * 0.02).toFixed(4));
        const valLoss = parseFloat((1.25 * factor + Math.random() * 0.06).toFixed(4));
        const mAP_50 = parseFloat((0.2 + (0.72 * (1 - factor)) + Math.random() * 0.03).toFixed(4));
        return { loss, mAP, valLoss, mAP_50 };
      }
    },
    sandbox: {
      inputType: 'image',
      outputType: 'object-detection',
      inputTitle: 'Object Detection Sandbox Ingestion',
      inputPlaceholder: 'Upload image and check annotations overlay',
      primaryBtnText: 'Run Object Detector',
      outputTitle: 'Detected Object Tensors',
      defaultMockResult: (input, classNames) => {
        const predictedClass = classNames[Math.floor(Math.random() * classNames.length)] || 'Person';
        return {
          class: predictedClass,
          confidence: 0.895,
          latencyMs: 28,
          boundingBoxes: [
            { label: predictedClass, bbox: [25, 20, 50, 60] }, // [top, left, width, height] percentage-based
            { label: classNames[(classNames.indexOf(predictedClass) + 1) % classNames.length] || 'Car', bbox: [10, 60, 30, 25] }
          ]
        };
      },
      bulkMockResult: (fileName, classNames) => {
        const trueClass = classNames[Math.floor(Math.random() * classNames.length)] || 'Person';
        const isCorrect = Math.random() > 0.2;
        const confidence = 0.65 + Math.random() * 0.32;
        const latencyMs = Math.floor(18 + Math.random() * 20);
        let predClass = trueClass;
        if (!isCorrect) {
          const alternates = classNames.filter(c => c !== trueClass);
          predClass = alternates[Math.floor(Math.random() * alternates.length)] || 'Incorrect';
        }
        return { name: fileName, trueClass, predClass, confidence, latencyMs, correct: isCorrect };
      }
    }
  },

  'nlp': {
    id: 'nlp',
    displayName: 'Natural Language Processing (NLP)',
    description: 'Sequence classification, tokenization, stop-word filtering, and recurrent architectures (LSTM/GRU).',
    pipeline: {
      allowedExtensions: ['.txt', '.csv', '.json'],
      allowedFileTypes: ['txt', 'csv', 'json'],
      ingestionFormats: [
        { id: 'standard', label: 'Tabular / Text Dataset (.csv, .json, .txt)' }
      ],
      preprocessingOptions: [
        { id: 'lowercase', type: 'lowercase', label: 'To Lowercase', category: 'Text Preprocessing', description: 'Convert text corpus to lowercase.', defaultParams: {} },
        { id: 'remove-stopwords', type: 'remove-stopwords', label: 'Remove Stopwords', category: 'Text Preprocessing', description: 'Filter out functional words (the, a, and).', defaultParams: {} },
        { id: 'tokenize', type: 'tokenize', label: 'Tokenize Sequence', category: 'Text Preprocessing', description: 'Map words to integer tokens.', defaultParams: { vocabularySize: 5000, sequenceLength: 100 } }
      ],
      defaultActions: [
        { id: 'text-lower', type: 'lowercase', params: {}, enabled: true },
        { id: 'text-tokenize', type: 'tokenize', params: { vocabularySize: 5000, sequenceLength: 100 }, enabled: true }
      ],
      defaultClassNames: ['Positive', 'Negative', 'Neutral']
    },
    modelBuilder: {
      layerOptions: [
        { id: 'embedding', label: 'Embedding', description: 'Map tokens to continuous semantic vectors.', category: 'Sequence / Embedding', defaultParams: { inputDim: 5000, outputDim: 128, inputLength: 100 } },
        { id: 'lstm', label: 'LSTM Module', description: 'Long Short-Term Memory recurrent block.', category: 'Sequence / Embedding', defaultParams: { units: 64, returnSequences: false, dropout: 0.1, recurrentDropout: 0 } },
        { id: 'gru', label: 'GRU Module', description: 'Gated Recurrent Unit block.', category: 'Sequence / Embedding', defaultParams: { units: 64, returnSequences: false, dropout: 0.1 } },
        { id: 'bidirectional', label: 'Bidirectional LSTM', description: 'Process sequences forward and backward.', category: 'Sequence / Embedding', defaultParams: { units: 64, returnSequences: false } },
        { id: 'dense', label: 'Dense Layer', description: 'Output classification projection.', category: 'Fully Connected', defaultParams: { units: 2, activation: 'softmax', dropout: 0 } },
        { id: 'dropout', label: 'Dropout Regularizer', description: 'Drop connection weights.', category: 'Fully Connected', defaultParams: { rate: 0.2 } }
      ],
      lossFunctions: [
        { id: 'binaryCrossentropy', label: 'Binary Crossentropy (Sentiment/Binary Classification)', description: 'Best for two-class outputs.' },
        { id: 'categoricalCrossentropy', label: 'Categorical Crossentropy (Multiclass)', description: 'Multi-category NLP classification.' },
        { id: 'sparseCategoricalCrossentropy', label: 'Sparse Categorical Crossentropy', description: 'Integer encoded multi-class loss.' }
      ],
      defaultLayers: [
        { id: 'embed-1', type: 'embedding', config: { inputDim: 5000, outputDim: 128, inputLength: 100 } },
        { id: 'lstm-1', type: 'lstm', config: { units: 64, returnSequences: false } },
        { id: 'output', type: 'dense', config: { units: 2, activation: 'softmax' } }
      ],
      defaultHyperparameters: {
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        learningRate: 0.001,
        batchSize: 64,
        epochs: 5
      }
    },
    training: {
      metrics: [
        { id: 'loss', label: 'Train Loss', color: 'text-neutral-500', isMain: false },
        { id: 'accuracy', label: 'Accuracy', color: 'text-royalblue-500', isMain: true },
        { id: 'valLoss', label: 'Val Loss', color: 'text-rose-500', isMain: false },
        { id: 'valAccuracy', label: 'Val Accuracy', color: 'text-green-500', isMain: true }
      ],
      generateMockMetrics: (epoch, maxEpochs, initialLr) => {
        const factor = 1 / (1 + epoch * 0.2);
        const loss = parseFloat((0.6 * factor + Math.random() * 0.02).toFixed(4));
        const accuracy = parseFloat((0.4 + (0.55 * (1 - factor)) + Math.random() * 0.015).toFixed(4));
        const valLoss = parseFloat((0.65 * factor + Math.random() * 0.03).toFixed(4));
        const valAccuracy = parseFloat((0.38 + (0.52 * (1 - factor)) + Math.random() * 0.02).toFixed(4));
        return { loss, accuracy, valLoss, valAccuracy };
      }
    },
    sandbox: {
      inputType: 'text',
      outputType: 'classification',
      inputTitle: 'NLP Sequence Playground',
      inputPlaceholder: 'Enter a review or sentence to classify...',
      primaryBtnText: 'Evaluate Sequence',
      outputTitle: 'Classification/Sentiment Result',
      defaultMockResult: (input, classNames) => {
        const predictedSentiment = Math.random() > 0.4 ? 'Positive' : 'Negative';
        return {
          sentiment: predictedSentiment,
          confidence: 0.887,
          tokens: input.split(' ').length,
          latencyMs: 8
        };
      },
      bulkMockResult: (fileName, classNames) => {
        const trueClass = classNames[Math.floor(Math.random() * classNames.length)] || 'Positive';
        const isCorrect = Math.random() > 0.12;
        const confidence = 0.75 + Math.random() * 0.22;
        const latencyMs = Math.floor(4 + Math.random() * 8);
        let predClass = trueClass;
        if (!isCorrect) {
          const alternates = classNames.filter(c => c !== trueClass);
          predClass = alternates[Math.floor(Math.random() * alternates.length)] || 'Negative';
        }
        return { name: fileName, trueClass, predClass, confidence, latencyMs, correct: isCorrect };
      }
    }
  },

  'gans': {
    id: 'gans',
    displayName: 'Generative Adversarial Networks (GANs)',
    description: 'Generative and Discriminative network coupling. Pre-configured for noise sampling and standard pixel outputs.',
    pipeline: {
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
      allowedFileTypes: ['image'],
      ingestionFormats: [
        { id: 'standard', label: 'Real Images Sequence (Target Distribution)' }
      ],
      preprocessingOptions: [
        { id: 'resize', type: 'resize', label: 'Resize Image', category: 'Preprocessing', description: 'Scale target image dimensions.', defaultParams: { width: 64, height: 64 } },
        { id: 'pixel-normalize-1-1', type: 'pixel-normalize-1-1', label: 'Pixel Scale [-1, 1]', category: 'Preprocessing', description: 'Normalize pixels to match generator tanh outputs.', defaultParams: {} }
      ],
      defaultActions: [
        { id: 'gan-resize', type: 'resize', params: { width: 64, height: 64 }, enabled: true },
        { id: 'gan-norm', type: 'pixel-normalize-1-1', params: {}, enabled: true }
      ],
      defaultClassNames: ['Real Distribution', 'Synthesized']
    },
    modelBuilder: {
      layerOptions: [
        { id: 'dense', label: 'Dense Block (Generator/Discriminator)', description: 'Linear layer mapping latent noise vector.', category: 'Fully Connected', defaultParams: { units: 256, activation: 'leakyRelu', dropout: 0 } },
        { id: 'dropout', label: 'Dropout', description: 'Drop connection ratios in Discriminator.', category: 'Fully Connected', defaultParams: { rate: 0.3 } },
        { id: 'batchNorm', label: 'Batch Normalization', description: 'Stabilize GAN training dynamics.', category: 'Fully Connected', defaultParams: { momentum: 0.9, epsilon: 0.001 } }
      ],
      lossFunctions: [
        { id: 'meanSquaredError', label: 'Wasserstein Distance (WGAN Loss)', description: 'Best for stabilizing adversarial updates.' },
        { id: 'binaryCrossentropy', label: 'Binary Crossentropy Minimax Loss', description: 'Standard Minimax adversarial criterion.' }
      ],
      defaultLayers: [
        { id: 'dense-gen', type: 'dense', config: { units: 256, activation: 'leakyRelu', inputShape: [100] } },
        { id: 'dense-gen-out', type: 'dense', config: { units: 784, activation: 'tanh' } }
      ],
      defaultHyperparameters: {
        optimizer: 'rmsprop',
        loss: 'meanSquaredError',
        learningRate: 0.0002,
        batchSize: 128,
        epochs: 50
      }
    },
    training: {
      metrics: [
        { id: 'g_loss', label: 'Generator Loss (G_Loss)', color: 'text-royalblue-500', isMain: true },
        { id: 'd_loss', label: 'Discriminator Loss (D_Loss)', color: 'text-neutral-500', isMain: true },
        { id: 'fid', label: 'FID Score', color: 'text-green-500', isMain: true },
        { id: 'd_acc', label: 'D Accuracy (Real/Fake)', color: 'text-rose-500', isMain: false }
      ],
      generateMockMetrics: (epoch, maxEpochs, initialLr) => {
        // GAN loss fluctuates and doesn't just go down. FID score decreases steadily.
        const factor = 1 / (1 + epoch * 0.05);
        const g_loss = parseFloat((1.5 + Math.sin(epoch / 3) * 0.2 + Math.random() * 0.05).toFixed(4));
        const d_loss = parseFloat((0.5 + Math.cos(epoch / 3) * 0.1 + Math.random() * 0.03).toFixed(4));
        const fid = parseFloat((250 * factor + 15 + Math.random() * 2).toFixed(2));
        const d_acc = parseFloat((0.45 + Math.random() * 0.1).toFixed(4));
        // map keys back to training monitor expects loss/accuracy for basic charting fallback
        return { g_loss, d_loss, fid, d_acc, loss: g_loss, accuracy: 1 - d_acc }; 
      }
    },
    sandbox: {
      inputType: 'noise',
      outputType: 'image-generation',
      inputTitle: 'Adversarial Latent Vector Generator',
      inputPlaceholder: '100-dim Noise Distribution',
      primaryBtnText: 'Generate Synthetic Tensor',
      outputTitle: 'Generator Synthesized Image',
      defaultMockResult: (input, classNames) => {
        return {
          generatedImageUrl: '/api/placeholder/224/224', // we can render canvas grid block dynamically
          fidScore: 24.5,
          gLoss: 1.42,
          latencyMs: 38
        };
      },
      bulkMockResult: (fileName, classNames) => {
        const confidence = 0.5 + Math.random() * 0.5;
        const latencyMs = Math.floor(25 + Math.random() * 15);
        return { name: fileName, trueClass: 'Real Distribution', predClass: 'Synthesized', confidence, latencyMs, correct: true };
      }
    }
  },

  'llm-finetuning': {
    id: 'llm-finetuning',
    displayName: 'Large Language Models (LoRA/Fine-Tuning)',
    description: 'Parameter-efficient fine-tuning (LoRA) and text generation setup. Best for custom prompts and weights optimization.',
    pipeline: {
      allowedExtensions: ['.json', '.jsonl', '.txt'],
      allowedFileTypes: ['json', 'txt'],
      ingestionFormats: [
        { id: 'standard', label: 'Instruction dataset (Instruction, Input, Output)' }
      ],
      preprocessingOptions: [
        { id: 'tokenize', type: 'tokenize', label: 'Llama-style tokenizer', category: 'Text Preprocessing', description: 'Pre-train mapping tokens with standard BPE.', defaultParams: { tokenizer: 'llama-style' } }
      ],
      defaultActions: [
        { id: 'llm-tokenize', type: 'tokenize', params: { tokenizer: 'llama-style' }, enabled: true }
      ],
      defaultClassNames: ['Target Instruction', 'Aligned Output']
    },
    modelBuilder: {
      layerOptions: [
        { id: 'dense', label: 'LoRA Adapter (r, loraAlpha, target)', description: 'Low-Rank Adaptation projection adapter layer.', category: 'Adapters / Attention', defaultParams: { r: 8, loraAlpha: 16, targetModules: ['q_proj', 'v_proj'] } },
        { id: 'embedding', label: 'Embedding', description: 'Vocabulary token projection.', category: 'Sequence / Embedding', defaultParams: { inputDim: 32000, outputDim: 4096 } }
      ],
      lossFunctions: [
        { id: 'sparseCategoricalCrossentropy', label: 'Cross-Entropy (Next Token Prediction Loss)', description: 'Standard language modeling objective.' },
        { id: 'categoricalCrossentropy', label: 'BLEU/DPO Alignment Loss', description: 'Optimization against target outputs.' }
      ],
      defaultLayers: [
        { id: 'llm-lora-adapter', type: 'dense', config: { r: 8, loraAlpha: 16, targetModules: ['q_proj', 'v_proj'] } }
      ],
      defaultHyperparameters: {
        optimizer: 'adam',
        loss: 'sparseCategoricalCrossentropy',
        learningRate: 0.0002,
        batchSize: 8,
        epochs: 3
      }
    },
    training: {
      metrics: [
        { id: 'loss', label: 'Token Cross-Entropy Loss', color: 'text-neutral-500', isMain: false },
        { id: 'perplexity', label: 'Perplexity (PPL)', color: 'text-royalblue-500', isMain: true },
        { id: 'tokens_per_sec', label: 'Speed (Tokens/s)', color: 'text-green-500', isMain: false }
      ],
      generateMockMetrics: (epoch, maxEpochs, initialLr) => {
        const factor = 1 / (1 + epoch * 0.3);
        const loss = parseFloat((2.5 * factor + Math.random() * 0.05).toFixed(4));
        const perplexity = parseFloat((50.4 * factor + 3.5 + Math.random() * 0.5).toFixed(2));
        const tokens_per_sec = parseFloat((120 + Math.random() * 10).toFixed(1));
        return { loss, perplexity, tokens_per_sec, accuracy: 1 / loss }; // mapping accuracy mock
      }
    },
    sandbox: {
      inputType: 'text',
      outputType: 'text-generation',
      inputTitle: 'LoRA Text Generation Sandbox',
      inputPlaceholder: 'Enter prompt query (e.g. Write a quicksort in Rust)...',
      primaryBtnText: 'Generate Completion',
      outputTitle: 'Causal Autoregressive Output',
      defaultMockResult: (input, classNames) => {
        return {
          text: `## Completed Response for "${input}"\n\nGenerated using fine-tuned weights:\n\`\`\`rust\nfn quicksort<T: Ord>(mut vec: Vec<T>) -> Vec<T> {\n    if vec.len() <= 1 { return vec; }\n    let pivot = vec.remove(0);\n    let (smaller, larger): (Vec<T>, Vec<T>) = vec.into_iter().partition(|x| x <= &pivot);\n    let mut sorted = quicksort(smaller);\n    sorted.push(pivot);\n    sorted.extend(quicksort(larger));\n    sorted\n}\n\`\`\`\n\n*Sequence evaluation latency: 280ms · Generation Speed: 125.4 tokens/s · Total tokens: 112*`,
          perplexity: 4.85,
          latencyMs: 280,
          tokens: 112
        };
      },
      bulkMockResult: (fileName, classNames) => {
        const confidence = 0.8 + Math.random() * 0.15;
        const latencyMs = Math.floor(180 + Math.random() * 120);
        return { name: fileName, trueClass: 'Target Instruction', predClass: 'Aligned Output', confidence, latencyMs, correct: true };
      }
    }
  },
  'time-series-forecasting': {
    id: 'time-series-forecasting',
    displayName: 'Time-Series Forecasting',
    description: 'Predict sequence metrics over temporal horizons. Configured for seasonal decomposition, sequence windowing, and regression modeling.',
    pipeline: {
      allowedExtensions: ['.csv', '.json', '.txt'],
      allowedFileTypes: ['csv', 'json', 'txt'],
      ingestionFormats: [
        { id: 'tabular', label: 'Tabular CSV / Text' },
        { id: 'nested-json', label: 'Nested JSON Time-Series' }
      ],
      preprocessingOptions: [
        { id: 'temporal-alignment', type: 'temporal-alignment', label: 'Temporal Alignment', category: 'Preprocessing', description: 'Define timestamps and target variables.', defaultParams: { timestampCol: 'timestamp', targetCol: 'target', frequency: 'Daily' } },
        { id: 'sequence-windowing', type: 'sequence-windowing', label: 'Sequence Windowing', category: 'Preprocessing', description: 'Define history length and prediction size.', defaultParams: { lookbackWindow: 30, forecastHorizon: 7 } },
        { id: 'stationarity-transforms', type: 'stationarity-transforms', label: 'Stationarity Transforms', category: 'Preprocessing', description: 'Apply differencing or log transforms.', defaultParams: { differencing: 'none', logTransform: false, seasonalDecomp: false } },
        { id: 'sequence-imputation', type: 'sequence-imputation', label: 'Sequence Imputation', category: 'Preprocessing', description: 'Impute missing values in sequential order.', defaultParams: { method: 'linear' } }
      ],
      defaultActions: [
        { id: 'ts-alignment', type: 'temporal-alignment', params: { timestampCol: 'timestamp', targetCol: 'target', frequency: 'Daily' }, enabled: true },
        { id: 'ts-windowing', type: 'sequence-windowing', params: { lookbackWindow: 30, forecastHorizon: 7 }, enabled: true },
        { id: 'ts-impute', type: 'sequence-imputation', params: { method: 'linear' }, enabled: true }
      ],
      defaultClassNames: ['Value']
    },
    modelBuilder: {
      layerOptions: [
        { id: 'lstm', label: 'LSTM — Long Short-Term Memory', description: 'Recurrent sequence network layer.', category: 'Sequence / Embedding', defaultParams: { units: 64, recurrentDropout: 0.1, returnSequences: true } },
        { id: 'gru', label: 'GRU — Gated Recurrent Unit', description: 'Simplified recurrent sequence layer.', category: 'Sequence / Embedding', defaultParams: { units: 64, recurrentDropout: 0.1, returnSequences: true } },
        { id: 'conv1d', label: 'Conv1D / TCN Layer', description: 'Temporal Convolutional filter layer.', category: 'Convolutional', defaultParams: { filters: 64, kernelSize: 3, dilationRate: 1, activation: 'relu' } },
        { id: 'attention', label: 'Self-Attention Head', description: 'Multi-Head Attention block for forecasting.', category: 'Adapters / Attention', defaultParams: { numHeads: 4, keyDim: 16, dropout: 0.1 } },
        { id: 'dense', label: 'Dense projection head', description: 'Predicts target regression values.', category: 'Fully Connected', defaultParams: { units: 1, activation: 'linear' } }
      ],
      lossFunctions: [
        { id: 'meanSquaredError', label: 'Mean Squared Error (MSE)', description: 'Best for standard regression fitting.' },
        { id: 'meanAbsoluteError', label: 'Mean Absolute Error (MAE)', description: 'Robust loss for reducing outliers impact.' },
        { id: 'quantileLoss', label: 'Quantile Loss', description: 'Supports probabilistic and interval predictions.' }
      ],
      defaultLayers: [
        { id: 'lstm-seq', type: 'lstm', config: { units: 64, recurrentDropout: 0.1, returnSequences: false } },
        { id: 'dense-projection', type: 'dense', config: { units: 1, activation: 'linear' } }
      ],
      defaultHyperparameters: {
        optimizer: 'adam',
        loss: 'meanSquaredError',
        learningRate: 0.001,
        batchSize: 32,
        epochs: 15
      }
    },
    training: {
      metrics: [
        { id: 'loss', label: 'Train Loss', color: 'text-neutral-500', isMain: false },
        { id: 'rmse', label: 'RMSE', color: 'text-royalblue-500', isMain: true },
        { id: 'mae', label: 'MAE', color: 'text-green-500', isMain: true },
        { id: 'mape', label: 'MAPE (%)', color: 'text-orange-500', isMain: false },
        { id: 'dir_acc', label: 'Directional Accuracy', color: 'text-rose-500', isMain: false }
      ],
      generateMockMetrics: (epoch, maxEpochs, initialLr) => {
        const factor = 1 / (1 + epoch * 0.18);
        const loss = parseFloat((0.9 * factor + Math.random() * 0.04).toFixed(4));
        const rmse = parseFloat((1.5 * factor + 0.1 + Math.random() * 0.05).toFixed(4));
        const mae = parseFloat((1.1 * factor + 0.08 + Math.random() * 0.04).toFixed(4));
        const mape = parseFloat((15.0 * factor + 2.0 + Math.random() * 0.8).toFixed(2));
        const dir_acc = parseFloat((0.55 + (0.3 * (1 - factor)) + Math.random() * 0.02).toFixed(4));
        return { loss, rmse, mae, mape, dir_acc };
      }
    },
    sandbox: {
      inputType: 'time-series',
      outputType: 'time-series',
      inputTitle: 'Time-Series Sequence Sandbox',
      inputPlaceholder: 'Enter numeric sequence or drop a CSV file of values...',
      primaryBtnText: 'Generate Forecast Horizon',
      outputTitle: 'Continuous Forecast Chart',
      defaultMockResult: (input, classNames) => {
        const lookbackPoints = 30;
        const forecastPoints = 10;
        const lookback = [];
        const forecast = [];
        const confidenceLower = [];
        const confidenceUpper = [];
        
        let val = 100 + Math.random() * 20;
        for (let i = 0; i < lookbackPoints; i++) {
          val = val + (Math.random() - 0.45) * 5;
          lookback.push(parseFloat(val.toFixed(2)));
        }
        
        let lastVal = lookback[lookback.length - 1];
        for (let i = 0; i < forecastPoints; i++) {
          lastVal = lastVal + 2 + (Math.random() - 0.5) * 4;
          forecast.push(parseFloat(lastVal.toFixed(2)));
          const uncertainty = (i + 1) * 1.5;
          confidenceLower.push(parseFloat((lastVal - uncertainty).toFixed(2)));
          confidenceUpper.push(parseFloat((lastVal + uncertainty).toFixed(2)));
        }
        
        return {
          lookback,
          forecast,
          confidenceLower,
          confidenceUpper,
          latencyMs: 18,
          rmse: 1.24,
          mae: 0.96
        };
      },
      bulkMockResult: (fileName, classNames) => {
        const confidence = 0.8 + Math.random() * 0.15;
        const latencyMs = Math.floor(10 + Math.random() * 8);
        return { name: fileName, trueClass: 'Actual sequence', predClass: 'Actual sequence', confidence, latencyMs, correct: true };
      }
    }
  }
};
