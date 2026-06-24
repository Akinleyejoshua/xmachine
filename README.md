# ML-Studio-Web

ML-Studio-Web is an end-to-end, browser-based AI Pipeline Platform built with Next.js (App Router), TypeScript, Zustand, Tailwind CSS, and MongoDB. The platform empowers developers and machine learning engineers to ingest data, chain ETL preprocessing actions, visually construct deep learning layers, monitor fitting telemetry in real time, run advanced bulk analytics, and download production-ready TensorFlow/Keras Python notebooks mapping the custom pipeline.

---

## 🛠 Technology Stack & Core Architecture

* **Framework:** Next.js 16 (App Router), TypeScript
* **State Management:** Zustand (ephemeral local workspace state synchronized to database)
* **Database Persistency:** MongoDB & Mongoose (projects state, dataset parameters, hyper-parameters, target classes, training metrics history, checkpoints)
* **Styles & Theme:** Tailwind CSS & Lucide Icons (Strict Black, White, and Royal Blue accent theme; supports native Light/Dark modes)
* **Machine Learning Engine:** TensorFlow.js (`@tensorflow/tfjs`) for client-side model compiling, training, and sandbox inference testing

---

## 📂 Project Routing & Folders

ML-Studio-Web has modular App Router sub-routes. The onboarding wizard controls domain-specific presets globally.

```text
/xmachine
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root Layout (integrates Navigation & Bricolage Font)
│   │   ├── page.tsx                # Onboarding domain setup route
│   │   ├── etl/
│   │   │   └── page.tsx            # Data processing workspace (Module B)
│   │   ├── model-builder/
│   │   │   └── page.tsx            # Visual layer editor (Module C)
│   │   ├── training/
│   │   │   └── page.tsx            # Telemetry monitor (Module D)
│   │   ├── sandbox/
│   │   │   └── page.tsx            # Prediction playground (Module E)
│   │   ├── docs/
│   │   │   └── page.tsx            # Workspace user guide & code exporter (Module F)
│   │   └── api/
│   │       ├── projects/route.ts   # CRUD routes for workspace properties
│   │       └── checkpoints/route.ts# Training checkpoints synchronization
│   ├── components/
│   │   ├── Navigation.tsx          # Dynamic sub-route navigation bar
│   │   ├── ProjectWizard.tsx       # Domain picker modal
│   │   ├── etl/
│   │   │   └── ETLCanvas.tsx       # Folder and file drag-and-drop transform sequence
│   │   ├── builder/
│   │   │   ├── ModelBuilder.tsx    # Neural layers compiler
│   │   │   └── HyperparameterForm.tsx
│   │   ├── training/
│   │   │   └── TrainingMonitor.tsx # Epoch progression chart
│   │   └── inference/
│   │       └── Sandbox.tsx         # Bounding boxes / sequence evaluator
│   ├── store/
│   │   └── usePipelineStore.ts     # Global state and API fetch bindings
│   ├── types/
│   │   └── pipeline.ts             # TypeScript state typings
│   ├── models/
│   │   └── Project.ts              # Mongoose schema mapping
│   └── utils/
│       └── db.ts                   # Cached Mongoose connection helper
```

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Node.js (v18+)
- MongoDB connection string (local instance or MongoDB Atlas cluster)

### 2. Configure Environment Variables
Create a `.env.local` file in the root folder:
```env
MONGODB_URI=mongodb://localhost:27017/ml-studio
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the active port reported in terminal) to configure your workspace.

---

## 🎯 Key Capabilities

* **Onboarding Presets:** Selecting a domain (e.g., Computer Vision, Object Detection, NLP, GANs, LLM Fine-Tuning) updates default layers (Conv2D vs. LSTM) and ETL sequences automatically.
* **Persistent Class & Label Ingestion:** Auto-detects class names from loaded parent folders and persistently saves/reloads target labels directly via MongoDB.
* **Interactive Layer Designer & Hyperparameter Tuning:** Drag, drop, add, and reconfigure Conv2D, MaxPooling, Dense, LSTM, Dropout, and Flatten layers with real-time PyTorch output generation.
* **Telemetry & Live Training Monitor:** Adjust Epoch counts dynamically and use the Resume/Pause controls to track loss, validation loss, and accuracy progression charts in real time.
* **Inference Sandbox & Bulk Analytics:**
  * **Single Sandbox:** Input text prompts or upload custom images to test immediate, live predictions.
  * **Bulk Analytics Engine:** Run complete batch evaluations to calculate detailed **Confusion Matrices** (heatmap with counts/ratios), **Classification Reports** (Precision, Recall, F1-Score, Support per class), and **Error Analysis** identifying the hardest mistakes.
* **Notebook Exporter & Docs:** A built-in user guide featuring a downloadable, fully-mapped **TensorFlow/Keras Python Notebook Template** to export your visually built pipeline straight to production code.
* **Mobile-First UX Optimization:** Handcrafted styling utilizing Tailwind CSS variables, a responsive slide-out navigation menu, adaptive grid systems, and custom scrollbar properties designed for premium experiences on mobile viewports.
