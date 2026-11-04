import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  User,
  Key,
  Save,
  Trash2,
  Plus,
  RotateCcw,
  Download,
  Upload,
  MessageSquare,
  Briefcase,
  FolderGit2,
  Wrench,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
  Eye,
  LogOut,
  Sparkles,
  FileJson,
  BookOpen,
  Edit,
  Code as CodeIcon,
  List as ListIcon,
  Bold,
  Italic,
  Quote,
  Heading,
  EyeOff,
} from 'lucide-react';
import {
  loginAdmin,
  logoutAdmin,
  getAuthToken,
  fetchAdminMessages,
  saveAllPortfolioData,
  resetToDefaults,
  importResumeJson,
  parseResumeJson,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  generateAiInsightsApi,
} from '../services/api';

export default function AdminModal({
  isOpen,
  onClose,
  portfolioData,
  onDataUpdate,
  isApiOnline,
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [messages, setMessages] = useState([]);

  // Resume JSON import state
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  // Blog management state
  const [editingPost, setEditingPost] = useState(null);
  const [postForm, setPostForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    tags: '',
    is_published: true,
  });
  const [previewMode, setPreviewMode] = useState(false);

  // AI insights state
  const [isRegeneratingInsights, setIsRegeneratingInsights] = useState(false);
  const [aiRegenStatus, setAiRegenStatus] = useState(null);

  // Local editable copy of data
  const [dataCopy, setDataCopy] = useState(null);

  // Sync copy when portfolioData or modal opens
  useEffect(() => {
    if (portfolioData) {
      setDataCopy(JSON.parse(JSON.stringify(portfolioData)));
    }
  }, [portfolioData, isOpen]);

  // Check auth state on mount/open
  useEffect(() => {
    if (isOpen) {
      const token = getAuthToken();
      if (token) {
        setIsAuthenticated(true);
        loadMessages();
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [isOpen]);

  const loadMessages = async () => {
    const msgs = await fetchAdminMessages();
    setMessages(msgs || []);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await loginAdmin(username, password);
      setIsAuthenticated(true);
      setPassword('');
      loadMessages();
    } catch (err) {
      setLoginError(err.message || 'Invalid username or password');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
  };

  const handleSaveAll = async (updatedData = dataCopy) => {
    setSaveStatus({ type: 'saving', text: 'Saving changes...' });
    try {
      await saveAllPortfolioData(updatedData);
      onDataUpdate(updatedData);
      setSaveStatus({ type: 'success', text: 'Portfolio updated successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      const isAuthErr = err.message && (
        err.message.toLowerCase().includes('expired') ||
        err.message.toLowerCase().includes('token') ||
        err.message.toLowerCase().includes('unauthorized')
      );
      if (isAuthErr) {
        logoutAdmin();
        setIsAuthenticated(false);
        setLoginError('Your session has expired. Please log in again.');
      }
      setSaveStatus({ type: 'error', text: 'Failed to save: ' + err.message });
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all portfolio content back to the original resume data?')) {
      const defaults = await resetToDefaults();
      setDataCopy(defaults);
      onDataUpdate(defaults);
      setSaveStatus({ type: 'success', text: 'Reset to resume defaults complete!' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleApplyResumeJson = async (rawJsonText) => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setImportStatus({ type: 'saving', text: 'Importing resume data...' });
      
      const res = await importResumeJson(parsed);
      if (res && res.data) {
        setDataCopy(res.data);
        onDataUpdate(res.data);
        setImportStatus({ type: 'success', text: 'Data successfully imported! All portfolio sections and AI Agent have been updated.' });
        setTimeout(() => {
          setImportStatus(null);
          setActiveTab('profile');
        }, 2000);
      }
    } catch (err) {
      setImportStatus({ type: 'error', text: 'Invalid JSON: ' + err.message });
    }
  };

  const handleRegenerateAiInsights = async () => {
    setIsRegeneratingInsights(true);
    setAiRegenStatus({ type: 'loading', text: 'Generating fresh AI insights via Gemini 3.5 Flash...' });
    try {
      if (isApiOnline) {
        const res = await generateAiInsightsApi();
        if (res && res.ai_insights) {
          const updated = { ...dataCopy, ai_insights: res.ai_insights };
          setDataCopy(updated);
          onDataUpdate(updated);
          setAiRegenStatus({ type: 'success', text: 'AI insights generated and saved successfully!' });
        } else {
          setAiRegenStatus({ type: 'success', text: res.message || 'AI insights generated!' });
        }
      } else {
        const parsed = parseResumeJson({
          basics: {
            name: dataCopy?.profile?.name,
            headline: dataCopy?.profile?.title,
          },
          sections: {
            experience: { items: dataCopy?.experiences || [] },
            skills: { items: dataCopy?.skills || [] },
            projects: { items: dataCopy?.projects || [] },
          },
        });
        const updated = { ...dataCopy, ai_insights: parsed.ai_insights };
        setDataCopy(updated);
        onDataUpdate(updated);
        setAiRegenStatus({ type: 'success', text: 'Local AI insights generated and saved!' });
      }
      setTimeout(() => setAiRegenStatus(null), 3500);
    } catch (err) {
      const isAuthErr = err.message && (
        err.message.toLowerCase().includes('expired') ||
        err.message.toLowerCase().includes('token') ||
        err.message.toLowerCase().includes('authenticated') ||
        err.message.toLowerCase().includes('unauthorized')
      );
      if (isAuthErr) {
        logoutAdmin();
        setIsAuthenticated(false);
        setLoginError('Your session has expired. Please log in again to continue.');
      }
      setAiRegenStatus({ type: 'error', text: 'Generation failed: ' + err.message });
    } finally {
      setIsRegeneratingInsights(false);
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.content.trim()) {
      alert('Title and content are required.');
      return;
    }

    const slug = postForm.slug.trim() || postForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const payload = { ...postForm, slug };

    try {
      if (editingPost && editingPost.id) {
        await updateBlogPost(editingPost.id, payload);
        const updatedPosts = (dataCopy.posts || []).map(p => p.id === editingPost.id ? { ...p, ...payload } : p);
        const updated = { ...dataCopy, posts: updatedPosts };
        setDataCopy(updated);
        onDataUpdate(updated);
      } else {
        const created = await createBlogPost(payload);
        const updated = { ...dataCopy, posts: [created, ...(dataCopy.posts || [])] };
        setDataCopy(updated);
        onDataUpdate(updated);
      }
      setEditingPost(null);
      setPostForm({ title: '', slug: '', excerpt: '', content: '', tags: '', is_published: true });
      setPreviewMode(false);
      setSaveStatus({ type: 'success', text: 'Blog post saved successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      alert('Failed to save blog post: ' + err.message);
    }
  };

  const handleDeletePost = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      await deleteBlogPost(id);
      const updated = { ...dataCopy, posts: (dataCopy.posts || []).filter(p => p.id !== id) };
      setDataCopy(updated);
      onDataUpdate(updated);
    }
  };

  const insertFormatting = (prefix, suffix = '') => {
    const textarea = document.getElementById('post-content-editor');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = prefix + (selected || 'text') + suffix;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setPostForm({ ...postForm, content: newText });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 50);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(dataCopy, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harsha_portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        await handleApplyResumeJson(text);
      } catch (err) {
        alert('Invalid JSON file format: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#0c1017] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Portfolio Admin Center
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  {isApiOnline ? '🟢 Live FastAPI' : '⚡ Local / Pages'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Direct in-app content manager (no external route)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!isAuthenticated ? (
          /* Login Screen */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center my-auto">
            <div className="w-full max-w-sm p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Admin Authentication</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your credentials to edit website content
                </p>
              </div>

              {loginError && (
                <div className="p-3 mb-4 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 transition-all text-sm shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    Unlock Admin Panel
                  </button>
                </div>
              </form>

              
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-56 bg-slate-950/60 border-r border-slate-800 p-3 space-y-1 shrink-0 overflow-x-auto md:overflow-visible flex md:flex-col gap-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile & Bio</span>
              </button>

              <button
                onClick={() => setActiveTab('experience')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'experience'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Experience ({dataCopy?.experiences?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'projects'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Projects ({dataCopy?.projects?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('skills')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'skills'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Skills Matrix ({dataCopy?.skills?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('credentials')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'credentials'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Education & Awards</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('messages');
                  loadMessages();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages Inbox</span>
                </div>
                {messages.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                    {messages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('import-json')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'import-json'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileJson className="w-4 h-4 text-emerald-400" />
                <span>Import Resume JSON</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-insights')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'ai-insights'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Insights</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono">
                  Gemini
                </span>
              </button>

              <button
                onClick={() => setActiveTab('blog-manager')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'blog-manager'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Blog Manager</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-cyan-400 font-mono">
                  {dataCopy?.posts?.length || 0}
                </span>
              </button>

              {/* Data Utilities */}
              <div className="pt-4 border-t border-slate-800/80 space-y-1">
                <button
                  onClick={handleExportJson}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export JSON</span>
                </button>

                <label className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Import JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleResetDefaults}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-rose-400/80 hover:text-rose-400 hover:bg-rose-950/30"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Resume</span>
                </button>
              </div>
            </div>

            {/* Main Tab Panel */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[calc(92vh-130px)] space-y-6">
              {saveStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    saveStatus.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveStatus.text}</span>
                </div>
              )}

              {/* TAB 1: Profile & Bio */}
              {activeTab === 'profile' && dataCopy?.profile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base text-white">Profile & Bio Settings</h3>
                    <button
                      onClick={() => handleSaveAll()}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={dataCopy.profile.name || ''}
                        onChange={(e) =>
                          setDataCopy({
                            ...dataCopy,
                            profile: { ...dataCopy.profile, name: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Headline Title</label>
                      <input
                        type="text"
                        value={dataCopy.profile.title || ''}
                        onChange={(e) =>
                          setDataCopy({
                            ...dataCopy,
                            profile: { ...dataCopy.profile, title: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={dataCopy.profile.email || ''}
                        onChange={(e) =>
                          setDataCopy({
                            ...dataCopy,
                            profile: { ...dataCopy.profile, email: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Phone</label>
                      <input
                        type="text"
                        value={dataCopy.profile.phone || ''}
                        onChange={(e) =>
                          setDataCopy({
                            ...dataCopy,
                            profile: { ...dataCopy.profile, phone: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={dataCopy.profile.location || ''}
                        onChange={(e) =>
                          setDataCopy({
                            ...dataCopy,
                            profile: { ...dataCopy.profile, location: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Years of Experience</label>
                      <input
                        type="number"
                        value={dataCopy.profile.years_experience || 6}
                        onChange={(e) =>
                          setDataCopy({
                            ...dataCopy,
                            profile: { ...dataCopy.profile, years_experience: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Bio Summary</label>
                    <textarea
                      rows={4}
                      value={dataCopy.profile.summary || ''}
                      onChange={(e) =>
                        setDataCopy({
                          ...dataCopy,
                          profile: { ...dataCopy.profile, summary: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <h4 className="text-xs font-mono text-emerald-400 mb-3">Social & Profile Links</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">LinkedIn URL</label>
                        <input
                          type="text"
                          value={dataCopy.profile.linkedin_url || ''}
                          onChange={(e) =>
                            setDataCopy({
                              ...dataCopy,
                              profile: { ...dataCopy.profile, linkedin_url: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">GitHub URL</label>
                        <input
                          type="text"
                          value={dataCopy.profile.github_url || ''}
                          onChange={(e) =>
                            setDataCopy({
                              ...dataCopy,
                              profile: { ...dataCopy.profile, github_url: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">HackerRank URL</label>
                        <input
                          type="text"
                          value={dataCopy.profile.hackerrank_url || ''}
                          onChange={(e) =>
                            setDataCopy({
                              ...dataCopy,
                              profile: { ...dataCopy.profile, hackerrank_url: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">LeetCode URL</label>
                        <input
                          type="text"
                          value={dataCopy.profile.leetcode_url || ''}
                          onChange={(e) =>
                            setDataCopy({
                              ...dataCopy,
                              profile: { ...dataCopy.profile, leetcode_url: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Experience */}
              {activeTab === 'experience' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base text-white">Work Experience</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newExp = {
                            id: Date.now(),
                            company: 'New Company',
                            role: 'Software Engineer',
                            location: 'Hyderabad',
                            start_date: '2026',
                            end_date: 'Present',
                            is_current: true,
                            skills_text: 'Python, Cloud, React',
                            description: 'Engineering role description',
                            achievements: JSON.stringify(['Accomplishment 1', 'Accomplishment 2']),
                            display_order: (dataCopy.experiences?.length || 0) + 1,
                          };
                          const updated = {
                            ...dataCopy,
                            experiences: [newExp, ...(dataCopy.experiences || [])],
                          };
                          setDataCopy(updated);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Experience</span>
                      </button>
                      <button
                        onClick={() => handleSaveAll()}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>

                  {dataCopy?.experiences?.map((exp, idx) => (
                    <div
                      key={exp.id || idx}
                      className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          #{idx + 1} {exp.company}
                        </span>
                        <button
                          onClick={() => {
                            const updated = {
                              ...dataCopy,
                              experiences: dataCopy.experiences.filter((_, i) => i !== idx),
                            };
                            setDataCopy(updated);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900"
                          title="Delete Experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">Company</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => {
                              const list = [...dataCopy.experiences];
                              list[idx].company = e.target.value;
                              setDataCopy({ ...dataCopy, experiences: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">Role Title</label>
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) => {
                              const list = [...dataCopy.experiences];
                              list[idx].role = e.target.value;
                              setDataCopy({ ...dataCopy, experiences: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">Dates</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={exp.start_date}
                              onChange={(e) => {
                                const list = [...dataCopy.experiences];
                                list[idx].start_date = e.target.value;
                                setDataCopy({ ...dataCopy, experiences: list });
                              }}
                              className="w-1/2 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                              placeholder="Start"
                            />
                            <input
                              type="text"
                              value={exp.end_date || ''}
                              onChange={(e) => {
                                const list = [...dataCopy.experiences];
                                list[idx].end_date = e.target.value;
                                setDataCopy({ ...dataCopy, experiences: list });
                              }}
                              className="w-1/2 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                              placeholder="End"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">Skills Text</label>
                        <input
                          type="text"
                          value={exp.skills_text || ''}
                          onChange={(e) => {
                            const list = [...dataCopy.experiences];
                            list[idx].skills_text = e.target.value;
                            setDataCopy({ ...dataCopy, experiences: list });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">
                          Bullet Achievements (JSON array or lines)
                        </label>
                        <textarea
                          rows={3}
                          value={exp.achievements || ''}
                          onChange={(e) => {
                            const list = [...dataCopy.experiences];
                            list[idx].achievements = e.target.value;
                            setDataCopy({ ...dataCopy, experiences: list });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Projects */}
              {activeTab === 'projects' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base text-white">Project Showcase</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newProj = {
                            id: Date.now(),
                            title: 'New Architecture Project',
                            subtitle: 'Scalable Platform',
                            description: 'Detailed project description...',
                            tech_stack: 'Python, FastAPI, React JS',
                            github_url: 'https://github.com/harsha-reddi1',
                            live_url: '',
                            highlights: JSON.stringify(['Feature 1', 'Feature 2']),
                            featured: true,
                            display_order: (dataCopy.projects?.length || 0) + 1,
                          };
                          setDataCopy({
                            ...dataCopy,
                            projects: [newProj, ...(dataCopy.projects || [])],
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Project</span>
                      </button>
                      <button
                        onClick={() => handleSaveAll()}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>

                  {dataCopy?.projects?.map((proj, idx) => (
                    <div
                      key={proj.id || idx}
                      className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-400 font-bold">
                          #{idx + 1} {proj.title}
                        </span>
                        <button
                          onClick={() => {
                            const updated = {
                              ...dataCopy,
                              projects: dataCopy.projects.filter((_, i) => i !== idx),
                            };
                            setDataCopy(updated);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">Title</label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => {
                              const list = [...dataCopy.projects];
                              list[idx].title = e.target.value;
                              setDataCopy({ ...dataCopy, projects: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={proj.subtitle || ''}
                            onChange={(e) => {
                              const list = [...dataCopy.projects];
                              list[idx].subtitle = e.target.value;
                              setDataCopy({ ...dataCopy, projects: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => {
                            const list = [...dataCopy.projects];
                            list[idx].description = e.target.value;
                            setDataCopy({ ...dataCopy, projects: list });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">Tech Stack</label>
                          <input
                            type="text"
                            value={proj.tech_stack || ''}
                            onChange={(e) => {
                              const list = [...dataCopy.projects];
                              list[idx].tech_stack = e.target.value;
                              setDataCopy({ ...dataCopy, projects: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">GitHub URL</label>
                          <input
                            type="text"
                            value={proj.github_url || ''}
                            onChange={(e) => {
                              const list = [...dataCopy.projects];
                              list[idx].github_url = e.target.value;
                              setDataCopy({ ...dataCopy, projects: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: Skills Matrix */}
              {activeTab === 'skills' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base text-white">Skills Matrix</h3>
                    <button
                      onClick={() => handleSaveAll()}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Skills</span>
                    </button>
                  </div>

                  {/* Add New Skill Quick Form */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Skill Name</label>
                      <input
                        type="text"
                        id="new-skill-name"
                        placeholder="e.g. Apache Kafka"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Category</label>
                      <select
                        id="new-skill-cat"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option>Cloud & Big Data</option>
                        <option>Backend & Architecture</option>
                        <option>Frontend Development</option>
                        <option>DevOps & Tools</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Proficiency</label>
                      <select
                        id="new-skill-prof"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option>Expert</option>
                        <option>Advanced</option>
                        <option>Proficient</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        const nameEl = document.getElementById('new-skill-name');
                        const catEl = document.getElementById('new-skill-cat');
                        const profEl = document.getElementById('new-skill-prof');
                        if (!nameEl?.value) return;
                        const newSkill = {
                          id: Date.now(),
                          name: nameEl.value,
                          category: catEl.value,
                          proficiency: profEl.value,
                          display_order: (dataCopy.skills?.length || 0) + 1,
                        };
                        setDataCopy({
                          ...dataCopy,
                          skills: [...(dataCopy.skills || []), newSkill],
                        });
                        nameEl.value = '';
                      }}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400 text-slate-950"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Skills Tag Cloud with Delete */}
                  <div className="flex flex-wrap gap-2">
                    {dataCopy?.skills?.map((skill, sIdx) => (
                      <div
                        key={skill.id || sIdx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                      >
                        <span className="font-semibold text-slate-200">{skill.name}</span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          [{skill.proficiency}]
                        </span>
                        <button
                          onClick={() => {
                            const updated = {
                              ...dataCopy,
                              skills: dataCopy.skills.filter((_, i) => i !== sIdx),
                            };
                            setDataCopy(updated);
                          }}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Credentials & Education */}
              {activeTab === 'credentials' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base text-white">Education & Honors</h3>
                    <button
                      onClick={() => handleSaveAll()}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save All</span>
                    </button>
                  </div>

                  {/* Certifications */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono text-emerald-400">Certifications</h4>
                    {dataCopy?.certifications?.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => {
                              const list = [...dataCopy.certifications];
                              list[idx].name = e.target.value;
                              setDataCopy({ ...dataCopy, certifications: list });
                            }}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white font-semibold mb-1"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={c.issuer}
                              onChange={(e) => {
                                const list = [...dataCopy.certifications];
                                list[idx].issuer = e.target.value;
                                setDataCopy({ ...dataCopy, certifications: list });
                              }}
                              className="w-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-mono"
                            />
                            <input
                              type="text"
                              value={c.issue_date || ''}
                              onChange={(e) => {
                                const list = [...dataCopy.certifications];
                                list[idx].issue_date = e.target.value;
                                setDataCopy({ ...dataCopy, certifications: list });
                              }}
                              className="w-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Awards */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-mono text-cyan-400">Honors & Awards</h4>
                    {dataCopy?.awards?.map((a, idx) => (
                      <div
                        key={a.id || idx}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                      >
                        <input
                          type="text"
                          value={a.title}
                          onChange={(e) => {
                            const list = [...dataCopy.awards];
                            list[idx].title = e.target.value;
                            setDataCopy({ ...dataCopy, awards: list });
                          }}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white font-semibold"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={a.organization}
                            onChange={(e) => {
                              const list = [...dataCopy.awards];
                              list[idx].organization = e.target.value;
                              setDataCopy({ ...dataCopy, awards: list });
                            }}
                            className="w-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-mono"
                          />
                          <input
                            type="text"
                            value={a.year || ''}
                            onChange={(e) => {
                              const list = [...dataCopy.awards];
                              list[idx].year = e.target.value;
                              setDataCopy({ ...dataCopy, awards: list });
                            }}
                            className="w-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* TAB: Import Resume JSON */}
              {activeTab === 'import-json' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-1">
                      <FileJson className="w-4 h-4" />
                      <span>Reactive Resume & JSON Importer</span>
                    </div>
                    <h3 className="font-bold text-lg text-white">Import Resume JSON</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Paste or upload your exported resume JSON. This will cleanly parse your <strong>basics, summary, social profiles, experiences, skills, projects, education, awards, and certifications</strong> and apply them directly to your portfolio and AI Agent.
                    </p>
                  </div>

                  {importStatus && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
                        importStatus.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : importStatus.type === 'error'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
                      <span>{importStatus.text}</span>
                    </div>
                  )}

                  {/* File Upload Option */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Upload JSON File</p>
                      <p className="text-[11px] text-slate-400 font-mono">Select a .json resume export from your device</p>
                    </div>
                    <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Choose .json File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const text = ev.target?.result;
                            setJsonInput(text);
                            handleApplyResumeJson(text);
                          };
                          reader.readAsText(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Or Paste Raw JSON */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-slate-300">
                        Or Paste Resume JSON Below:
                      </label>
                      <button
                        type="button"
                        onClick={() => setJsonInput('')}
                        className="text-[11px] font-mono text-slate-500 hover:text-slate-300"
                      >
                        Clear
                      </button>
                    </div>
                    <textarea
                      rows={14}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='Paste resume JSON here (e.g. {"basics": {"name": "..."}, "sections": {...}})...'
                      className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={!jsonInput.trim()}
                      onClick={() => handleApplyResumeJson(jsonInput)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Apply & Sync to Portfolio</span>
                    </button>
                  </div>

                  {/* Persistent Cloud Sync Guide for All Devices & Mobile */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-cyan-500/20 space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                        <Sparkles className="w-4 h-4" />
                        <span>Make Visible on All Devices & Mobile (Persistent)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                        Zero-Config
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Vercel Serverless containers are ephemeral and re-seed default data on container cold-starts. To make your imported resume permanent across <strong>all new devices, mobile phones, and recruiters</strong> without setting up an external database:
                    </p>
                    <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1 font-mono">
                      <li>Copy your resume JSON using the button below.</li>
                      <li>Go to your <strong>Vercel Dashboard → Project Settings → Environment Variables</strong>.</li>
                      <li>Add Key: <strong className="text-emerald-400">PORTFOLIO_DATA_JSON</strong> and paste the copied JSON.</li>
                      <li>Click Save. All new devices and recruiters will permanently load your data!</li>
                    </ol>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const payload = jsonInput.trim() || JSON.stringify(dataCopy);
                          navigator.clipboard.writeText(payload);
                          alert('Copied resume data to clipboard! Paste it in Vercel Settings > Environment Variables as PORTFOLIO_DATA_JSON.');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Copy JSON for Vercel Environment</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: AI Insights & Summaries */}
              {activeTab === 'ai-insights' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 text-purple-400 text-xs font-mono mb-1">
                        <Sparkles className="w-4 h-4" />
                        <span>LLM-Generated Intelligence</span>
                      </div>
                      <h3 className="font-bold text-lg text-white">AI Engineering Philosophy & Highlights</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Synthesized engineering philosophy, architectural impact, and domain specializations generated via Gemini 3.5 Flash
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isRegeneratingInsights}
                        onClick={handleRegenerateAiInsights}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-purple-500/20"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isRegeneratingInsights ? 'animate-spin' : ''}`} />
                        <span>{isRegeneratingInsights ? 'Synthesizing...' : 'Regenerate via Gemini'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveAll()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>

                  {aiRegenStatus && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
                        aiRegenStatus.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : aiRegenStatus.type === 'error'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
                      <span>{aiRegenStatus.text}</span>
                    </div>
                  )}

                  {/* AI Insights List / Editor */}
                  <div className="space-y-4">
                    {(!dataCopy?.ai_insights || dataCopy.ai_insights.length === 0) ? (
                      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                        <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-60" />
                        <p className="text-sm text-slate-300 font-medium">No AI Insights Generated Yet</p>
                        <p className="text-xs text-slate-500 mt-1 mb-4">
                          Click below to synthesize executive summaries and architectural pillars using Gemini.
                        </p>
                        <button
                          type="button"
                          onClick={handleRegenerateAiInsights}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 cursor-pointer"
                        >
                          Generate AI Insights Now
                        </button>
                      </div>
                    ) : (
                      dataCopy.ai_insights.map((item, index) => {
                        return (
                          <div
                            key={item.id || index}
                            className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                                {item.section_key}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">Order #{item.display_order || index + 1}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-mono text-slate-400 mb-1">Section Title</label>
                                <input
                                  type="text"
                                  value={item.title || ''}
                                  onChange={(e) => {
                                    const next = [...(dataCopy.ai_insights || [])];
                                    next[index] = { ...next[index], title: e.target.value };
                                    setDataCopy({ ...dataCopy, ai_insights: next });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:border-purple-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-mono text-slate-400 mb-1">Subtitle</label>
                                <input
                                  type="text"
                                  value={item.subtitle || ''}
                                  onChange={(e) => {
                                    const next = [...(dataCopy.ai_insights || [])];
                                    next[index] = { ...next[index], subtitle: e.target.value };
                                    setDataCopy({ ...dataCopy, ai_insights: next });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:border-purple-500 outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                                Structured JSON / Content
                              </label>
                              <textarea
                                rows={5}
                                value={
                                  typeof item.content === 'object'
                                    ? JSON.stringify(item.content, null, 2)
                                    : item.content || ''
                                }
                                onChange={(e) => {
                                  const next = [...(dataCopy.ai_insights || [])];
                                  next[index] = { ...next[index], content: e.target.value };
                                  setDataCopy({ ...dataCopy, ai_insights: next });
                                }}
                                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-purple-300 focus:border-purple-500 outline-none"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Blog Manager */}
              {activeTab === 'blog-manager' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-lg text-white">Blog & Technical Articles</h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Publish, format, and edit technical articles on your public portfolio
                      </p>
                    </div>

                    {!editingPost && (
                      <button
                        onClick={() => {
                          setEditingPost({ isNew: true });
                          setPostForm({ title: '', slug: '', excerpt: '', content: '', tags: '', is_published: true });
                          setPreviewMode(false);
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Write New Post</span>
                      </button>
                    )}
                  </div>

                  {editingPost ? (
                    /* Blog Post Editor Form */
                    <form onSubmit={handleSavePost} className="space-y-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {editingPost.isNew ? 'New Blog Article' : `Editing: ${editingPost.title}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingPost(null)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">Article Title *</label>
                          <input
                            type="text"
                            required
                            value={postForm.title}
                            onChange={(e) => {
                              const title = e.target.value;
                              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                              setPostForm({ ...postForm, title, slug: postForm.slug ? postForm.slug : slug });
                            }}
                            placeholder="e.g. Scaling Real-Time Pipelines on Azure Synapse"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">URL Slug</label>
                          <input
                            type="text"
                            value={postForm.slug}
                            onChange={(e) => setPostForm({ ...postForm, slug: e.target.value })}
                            placeholder="e.g. scaling-real-time-pipelines"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-mono outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">Tags (Comma-separated)</label>
                          <input
                            type="text"
                            value={postForm.tags}
                            onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                            placeholder="e.g. Python, PySpark, Architecture, Azure"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-5">
                          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={postForm.is_published}
                              onChange={(e) => setPostForm({ ...postForm, is_published: e.target.checked })}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span>Publish Live to Blog</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Short Excerpt / Summary</label>
                        <input
                          type="text"
                          value={postForm.excerpt}
                          onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                          placeholder="Brief 1-2 sentence preview shown on article cards..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Content Editor with Formatting Toolbar */}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => insertFormatting('**', '**')}
                              title="Bold"
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('*', '*')}
                              title="Italic"
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('### ')}
                              title="Heading"
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-bold"
                            >
                              H3
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('```python\n', '\n```')}
                              title="Code Block"
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                            >
                              <CodeIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('- ')}
                              title="Bullet List"
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                            >
                              <ListIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('> ')}
                              title="Blockquote"
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                            >
                              <Quote className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPreviewMode(!previewMode)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-400"
                          >
                            {previewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{previewMode ? 'Edit Mode' : 'Live Preview'}</span>
                          </button>
                        </div>

                        {previewMode ? (
                          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 min-h-[220px] max-h-[350px] overflow-y-auto text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
                            {postForm.content.split('\n').map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            id="post-content-editor"
                            required
                            rows={10}
                            value={postForm.content}
                            onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                            placeholder="Write your article with markdown formatting (### Heading, - Bullet, ```code```, **bold**)..."
                            className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingPost(null)}
                          className="px-4 py-2 rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{editingPost.isNew ? 'Publish Article' : 'Update Article'}</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* List of existing posts */
                    <div className="space-y-3">
                      {(dataCopy?.posts || []).length === 0 ? (
                        <div className="p-8 text-center text-slate-500 font-mono text-xs rounded-xl bg-slate-950/40 border border-slate-800">
                          No articles in database yet. Click "Write New Post" to publish your first article!
                        </div>
                      ) : (
                        (dataCopy?.posts || []).map((p) => (
                          <div
                            key={p.id || p.slug}
                            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-white">{p.title}</h4>
                                <span
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                    p.is_published
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {p.is_published ? 'Published' : 'Draft'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-mono">
                                /{p.slug} · {p.tags || 'General'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPost(p);
                                  setPostForm({
                                    title: p.title || '',
                                    slug: p.slug || '',
                                    excerpt: p.excerpt || '',
                                    content: p.content || '',
                                    tags: p.tags || '',
                                    is_published: p.is_published !== false,
                                  });
                                  setPreviewMode(false);
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                                title="Edit Post"
                              >
                                <Edit className="w-4 h-4 text-cyan-400" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(p.id)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                                title="Delete Post"
                              >
                                <Trash2 className="w-4 h-4 text-rose-400" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Contact Messages Inbox */}
              {activeTab === 'messages' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-base text-white">Visitor Messages Inbox</h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Submissions received through the portfolio contact form
                      </p>
                    </div>
                    <button
                      onClick={loadMessages}
                      className="px-3 py-1.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      Refresh Messages
                    </button>
                  </div>

                  {messages.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-mono text-xs">
                      No contact messages received yet. Submit a test message on the contact section!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-400">{msg.name}</span>
                            <span className="text-slate-500 font-mono">
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-cyan-400">
                            {msg.email} · {msg.subject || 'Portfolio Inquiry'}
                          </p>
                          <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                            {msg.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
