import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import AiInsights from './components/AiInsights';
import Experience from './components/Experience';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Credentials from './components/Credentials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminModal from './components/AdminModal';
import ChatWidget from './components/ChatWidget';
import Blog from './components/Blog';
import { fetchPortfolioData, checkApiHealth, getLocalData } from './services/api';
import { defaultPortfolioData } from './data/defaultData';

export default function App() {
  const [portfolioData, setPortfolioData] = useState(() => getLocalData());

  // Bulletproof fallback: ensure all expected arrays and profile exist so UI never crashes or renders blank
  const safeData = useMemo(() => {
    const base = defaultPortfolioData || {};
    const cur = portfolioData || {};
    return {
      ...base,
      ...cur,
      profile: {
        ...(base.profile || {}),
        ...(cur.profile || {}),
      },
      experiences: Array.isArray(cur.experiences) && cur.experiences.length > 0 ? cur.experiences : (base.experiences || []),
      skills: Array.isArray(cur.skills) && cur.skills.length > 0 ? cur.skills : (base.skills || []),
      projects: Array.isArray(cur.projects) && cur.projects.length > 0 ? cur.projects : (base.projects || []),
      education: Array.isArray(cur.education) ? cur.education : (base.education || []),
      awards: Array.isArray(cur.awards) ? cur.awards : (base.awards || []),
      certifications: Array.isArray(cur.certifications) ? cur.certifications : (base.certifications || []),
      ai_insights: Array.isArray(cur.ai_insights) ? cur.ai_insights : (base.ai_insights || []),
      posts: Array.isArray(cur.posts) ? cur.posts : (base.posts || []),
    };
  }, [portfolioData]);
  const [isApiOnline, setIsApiOnline] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentView, setCurrentView] = useState('portfolio'); // 'portfolio' | 'blog'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      // Check API health
      const health = await checkApiHealth();
      setIsApiOnline(health.online);

      // Fetch initial data
      const result = await fetchPortfolioData();
      if (result && result.data) {
        setPortfolioData(result.data);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Listen to URL hash for navigation (#blog vs #portfolio)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#blog' || window.location.search.includes('page=blog')) {
        setCurrentView('blog');
      } else {
        setCurrentView('portfolio');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Dynamically update document title based on uploaded JSON profile data and current view
  useEffect(() => {
    if (portfolioData?.profile?.name) {
      const name = safeData.profile.name;
      const role = safeData.profile.title || 'Engineering Portfolio';
      if (currentView === 'blog') {
        document.title = `${name} | Technical Blog & Articles`;
      } else {
        document.title = `${name} | ${role}`;
      }
    }
  }, [portfolioData, currentView]);

  const navigateToBlog = () => {
    window.location.hash = '#blog';
    setCurrentView('blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToPortfolio = () => {
    window.location.hash = '';
    setCurrentView('portfolio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard shortcut listener for Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center text-slate-400 font-mono text-sm">
        <div className="w-10 h-10 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
        <span>Initializing Portfolio Engine...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar
        profile={safeData.profile}
        currentView={currentView}
        onNavigateBlog={navigateToBlog}
        onNavigatePortfolio={navigateToPortfolio}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isApiOnline={isApiOnline}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {currentView === 'blog' ? (
        <Blog
          profile={safeData.profile}
          posts={safeData.posts || []}
          onBackToPortfolio={navigateToPortfolio}
        />
      ) : (
        <main>
          <Hero
            profile={safeData.profile}
            experiences={safeData.experiences || []}
            skills={safeData.skills || []}
            projects={safeData.projects || []}
            awards={safeData.awards || []}
            certifications={safeData.certifications || []}
            onOpenChat={() => setIsChatOpen(true)}
          />
          <About
            profile={safeData.profile}
            experiences={safeData.experiences || []}
            skills={safeData.skills || []}
            projects={safeData.projects || []}
          />
          <AiInsights
            aiInsights={safeData.ai_insights}
            profile={safeData.profile}
            experiences={safeData.experiences || []}
            skills={safeData.skills || []}
          />
          <Experience experiences={safeData.experiences} />
          <Skills skills={safeData.skills} />
          <Projects projects={safeData.projects} />
          <Credentials
            education={safeData.education}
            awards={safeData.awards}
            certifications={safeData.certifications}
          />
          <Contact profile={safeData.profile} />
        </main>
      )}

      <Footer
        profile={safeData.profile}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Floating AI Agent Chat Widget */}
      <ChatWidget
        key={`${safeData?.profile?.name || 'agent'}_${safeData?.profile?.email || ''}`}
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
        portfolioData={safeData}
      />

      {/* Hidden Admin Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        portfolioData={portfolioData}
        onDataUpdate={(updated) => setPortfolioData(updated)}
        isApiOnline={isApiOnline}
      />
    </div>
  );
}
