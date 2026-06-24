import React, { useState, useEffect } from 'react';
import { usePipelineStore } from '../store/usePipelineStore';
import { ProjectDomain } from '../types/pipeline';
import { 
  Eye, 
  Binary, 
  MessageSquare, 
  Cpu, 
  Layers, 
  Sparkles,
  ArrowRight,
  Download,
  Trash2,
  Upload,
  FolderOpen,
  RefreshCw,
  Plus
} from 'lucide-react';

interface DomainOption {
  id: ProjectDomain;
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  badge: string;
}

const DOMAINS: DomainOption[] = [
  {
    id: 'cv-classification',
    title: 'Computer Vision (Classification)',
    description: 'Classify images using deep convolutional networks (CNNs). Configured for image scaling, gray-scaling, and dataset augmentation.',
    icon: <Eye className="w-6 h-6 text-royalblue-500" />,
    colorClass: 'hover:bg-neutral-100 dark:hover:bg-neutral-900 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200',
    badge: 'CV',
  },
  {
    id: 'object-detection',
    title: 'Object Detection',
    description: 'Locate and classify multiple objects in an image. Integrates bounding box annotations and tensor-based transformations.',
    icon: <Layers className="w-6 h-6 text-royalblue-500" />,
    colorClass: 'hover:bg-neutral-100 dark:hover:bg-neutral-900 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200',
    badge: 'CV/Detection',
  },
  {
    id: 'nlp',
    title: 'Natural Language Processing (NLP)',
    description: 'Sequence-to-sequence classification, tokenization, stop-word filtering, and recurrent architectures (LSTM/GRU).',
    icon: <MessageSquare className="w-6 h-6 text-royalblue-500" />,
    colorClass: 'hover:bg-neutral-100 dark:hover:bg-neutral-900 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200',
    badge: 'NLP',
  },
  {
    id: 'gans',
    title: 'Generative Adversarial Networks (GANs)',
    description: 'Generative and Discriminative network coupling. Pre-configured for noise sampling and standard pixel outputs.',
    icon: <Sparkles className="w-6 h-6 text-royalblue-500" />,
    colorClass: 'hover:bg-neutral-100 dark:hover:bg-neutral-900 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200',
    badge: 'Generative',
  },
  {
    id: 'llm-finetuning',
    title: 'Large Language Models (LoRA/Fine-Tuning)',
    description: 'Parameter-efficient fine-tuning (LoRA) and text generation setup. Best for custom prompts and weights optimization.',
    icon: <Cpu className="w-6 h-6 text-royalblue-500" />,
    colorClass: 'hover:bg-neutral-100 dark:hover:bg-neutral-900 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200',
    badge: 'LLM',
  },
];

export const ProjectWizard: React.FC = () => {
  const { initProject, loadProject, wizardOpen } = usePipelineStore();
  const [projectName, setProjectName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ProjectDomain | null>(null);
  const [error, setError] = useState('');
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (wizardOpen) {
      fetchProjects();
    }
  }, [wizardOpen]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const json = await res.json();
      if (json.success) {
        setSavedProjects(json.data);
      }
    } catch (err) {
      console.error('Failed to load projects list', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  if (!wizardOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Please provide a project name.');
      return;
    }
    if (!selectedDomain) {
      setError('Please select a project domain.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await initProject(projectName, selectedDomain);
    } catch (err) {
      setError('Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async (project: any) => {
    setActionLoadingId(project._id);
    try {
      loadProject(project);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to delete project', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBackup = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `project-backup-${project.name.toLowerCase().replace(/ /g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importedData = JSON.parse(event.target?.result as string);
            delete importedData._id;
            delete importedData.id;

            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(importedData),
            });
            const json = await res.json();
            if (json.success) {
              fetchProjects();
            } else {
              alert('Import failed: ' + json.error);
            }
          } catch (err) {
            alert('Invalid JSON backup file format');
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
      } catch (err) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-black rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row" style={{ maxHeight: 'calc(100dvh - 24px)' }}>
        
        {/* Left Side: Welcome Panel & Listings */}
        <div className="md:w-2/5 bg-neutral-50 dark:bg-neutral-900 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[45vh] md:max-h-none">
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-royalblue-500/10 rounded-lg">
                <Binary className="w-5 h-5 text-royalblue-500" />
              </div>
              <span className="font-bold text-base text-black dark:text-white tracking-wider">ML-STUDIO</span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-black dark:text-white tracking-tight">
                Your Workspace Projects
              </h2>
              <p className="text-[11px] text-neutral-500 leading-normal mt-1">
                Import backups or restore previous training sessions.
              </p>
            </div>

            {/* Saved Projects Listing */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Saved Sessions ({savedProjects.length})</span>
                {/* Import Button */}
                <label className="text-[10px] font-bold text-royalblue-600 dark:text-royalblue-400 hover:text-royalblue-500 cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" disabled={loading} />
                </label>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {projectsLoading ? (
                  <div className="p-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-royalblue-500" />
                    <span>Loading saved sessions...</span>
                  </div>
                ) : savedProjects.length === 0 ? (
                  <div className="p-6 rounded-xl text-center text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-900">
                    No active sessions found.
                  </div>
                ) : (
                  savedProjects.map((project) => (
                    <div
                      key={project._id}
                      onClick={() => !actionLoadingId && handleContinue(project)}
                      className="p-3 bg-white dark:bg-black rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-4 h-4 text-neutral-400 group-hover:text-royalblue-500" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">{project.name}</p>
                          <p className="text-[9px] text-neutral-500 capitalize">{(project.domain || '').replace(/-/g, ' ')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleBackup(e, project)}
                          disabled={!!actionLoadingId || loading}
                          className="p-1 text-neutral-400 hover:text-royalblue-500 disabled:opacity-50"
                          title="Download JSON Backup"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, project._id)}
                          disabled={!!actionLoadingId || loading}
                          className="p-1 text-neutral-400 hover:text-red-500 disabled:opacity-50"
                          title="Delete Session"
                        >
                          {actionLoadingId === project._id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 hidden md:block text-left opacity-60">
            <span className="text-[10px] text-neutral-500 font-mono">v1.0.0-beta • WebGL Active</span>
          </div>
        </div>

        {/* Right Side: Setup Form */}
        <div className="flex-1 p-4 sm:p-8 flex flex-col justify-between bg-white dark:bg-black overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-left">
              <label htmlFor="project-name" className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Project Name
              </label>
              <div className="relative">
                <input
                  id="project-name"
                  type="text"
                  placeholder="e.g. MNIST Classifier, Sentiment Analyzer..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-0 transition-all font-medium disabled:opacity-60"
                />
              </div>
            </div>

            <div className="text-left">
              <span className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                Select Project Domain
              </span>
              <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {DOMAINS.map((domain) => (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => setSelectedDomain(domain.id)}
                    disabled={loading}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all text-left ${domain.colorClass} ${
                      selectedDomain === domain.id
                        ? 'bg-royalblue-500/5 dark:bg-royalblue-500/10 shadow-lg shadow-royalblue-500/10'
                        : 'bg-neutral-50/50 dark:bg-neutral-900/20'
                    } disabled:opacity-50`}
                  >
                    <div className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg mt-0.5">
                      {domain.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-200">{domain.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase">
                          {domain.badge}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">{domain.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-405 text-xs rounded-lg font-medium text-left">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading || !selectedDomain || !projectName.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-royalblue-600 hover:bg-royalblue-500 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-semibold shadow-lg shadow-royalblue-600/20 hover:shadow-royalblue-500/30 transition-all text-sm group disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Launching Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Workspace</span>
                    <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
