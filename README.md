# ML-Studio-Web

ML-Studio-Web is an end-to-end, browser-based AI Pipeline Platform built with Next.js (App Router), TypeScript, Zustand, Tailwind CSS, and MongoDB. The platform empowers users to ingest data, chain ETL preprocessing actions, visually construct deep learning layers, monitor fitting telemetry in real time, and query checkpoints inside an interactive sandbox playground.

---

## 🛠 Technology Stack & Core Architecture

* **Framework:** Next.js 14 (App Router), TypeScript
* **State Management:** Zustand (ephemeral local workspace state)
* **Database Persistency:** MongoDB & Mongoose (projects state, dataset parameters, hyper-parameters, training metrics history, checkpoints)
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
│   │   │   └── page.tsx            # Workspace user guide
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

* **Onboarding Presets:** Selecting a domain (e.g. CV vs. NLP) updates default layers (Conv2D vs. LSTM) and ETL sequences automatically.
* **Directory Imports:** Click **Browse Folder** under Module B to select entire folders containing image or text sequences.
* **Toggled Schemes:** Supports native dark and light mode themes built using tailwind styling variables.
* **Checkpoints Saving:** Serializes training progress metrics and checkpoint structures in Mongoose at the end of epochs.
