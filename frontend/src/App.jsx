import React, { useState, useEffect } from 'react';
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
      const name = portfolioData.profile.name;
      const role = portfolioData.profile.title || 'Engineering Portfolio';
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
        profile={portfolioData.profile}
        currentView={currentView}
        onNavigateBlog={navigateToBlog}
        onNavigatePortfolio={navigateToPortfolio}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isApiOnline={isApiOnline}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {currentView === 'blog' ? (
        <Blog
          profile={portfolioData.profile}
          posts={portfolioData.posts || []}
          onBackToPortfolio={navigateToPortfolio}
        />
      ) : (
        <main>
          <Hero
            profile={portfolioData.profile}
            experiences={portfolioData.experiences || []}
            skills={portfolioData.skills || []}
            projects={portfolioData.projects || []}
            awards={portfolioData.awards || []}
            certifications={portfolioData.certifications || []}
            onOpenChat={() => setIsChatOpen(true)}
          />
          <About
            profile={portfolioData.profile}
            experiences={portfolioData.experiences || []}
            skills={portfolioData.skills || []}
            projects={portfolioData.projects || []}
          />
          <AiInsights
            aiInsights={portfolioData.ai_insights}
            profile={portfolioData.profile}
            experiences={portfolioData.experiences || []}
            skills={portfolioData.skills || []}
          />
          <Experience experiences={portfolioData.experiences} />
          <Skills skills={portfolioData.skills} />
          <Projects projects={portfolioData.projects} />
          <Credentials
            education={portfolioData.education}
            awards={portfolioData.awards}
            certifications={portfolioData.certifications}
          />
          <Contact profile={portfolioData.profile} />
        </main>
      )}

      <Footer
        profile={portfolioData.profile}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Floating AI Agent Chat Widget */}
      <ChatWidget
        key={portfolioData?.profile?.name || 'agent'}
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
        portfolioData={portfolioData}
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
