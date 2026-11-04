import { defaultPortfolioData } from '../data/defaultData';

const API_BASE = (
  import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('github.io') 
    ? 'https://portfolio-lilac-theta-34.vercel.app' 
    : '')
).replace(/\/+$/, '');

const LOCAL_STORAGE_KEY = 'harsha_portfolio_data';
const LOCAL_MESSAGES_KEY = 'harsha_portfolio_messages';
const AUTH_TOKEN_KEY = 'harsha_portfolio_token';

// Helper to get local data
export const getLocalData = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
  }
  return defaultPortfolioData;
};

// Helper to save local data
export const saveLocalData = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

// Smart fetcher that handles both /api/endpoint and /endpoint automatically
async function smartFetch(subpath, options = {}) {
  const cleanPath = subpath.startsWith('/') ? subpath : `/${subpath}`;
  
  // Try with /api prefix first
  try {
    const res = await fetch(`${API_BASE}/api${cleanPath}`, options);
    // If successful or client error other than 404, return response
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 404)) {
      return res;
    }
  } catch {
    // Continue to fallback
  }

  // Try direct route (e.g. on Vercel without /api prefix)
  try {
    const res = await fetch(`${API_BASE}${cleanPath}`, options);
    return res;
  } catch (err) {
    throw new Error(`Failed to reach ${subpath}: ${err.message}`);
  }
}

// Check if backend API is online
export const checkApiHealth = async () => {
  try {
    const res = await smartFetch('/health', { method: 'GET' });
    if (res && res.ok) {
      const data = await res.json();
      return { online: true, data };
    }
  } catch {
    // API is offline or running static on GitHub Pages without live connection
  }
  return { online: false };
};

// Fetch Portfolio Data (Primary: Vercel API -> Secondary: Local Storage Fallback)
export const fetchPortfolioData = async () => {
  const local = getLocalData();
  const isLocalCustom = Boolean(local && local.is_custom === true);

  try {
    const res = await smartFetch('/portfolio');
    if (res && res.ok) {
      const remote = await res.json();
      
      // If user uploaded or customized portfolio locally in this browser, preserve it!
      // Only override if remote explicitly has a newer last_updated timestamp.
      if (isLocalCustom) {
        if (remote?.last_updated && local?.last_updated && remote.last_updated > local.last_updated) {
          saveLocalData(remote);
          return { data: remote, source: 'api' };
        }
        return { data: local, source: 'local' };
      }

      if (remote && remote.profile && remote.profile.name) {
        saveLocalData(remote);
        return { data: remote, source: 'api' };
      }
    }
  } catch (err) {
    console.warn('API fetch failed, falling back to local storage:', err);
  }

  // Fallback: Local storage copy
  return { data: local, source: 'local' };
};

// Submit Contact Message (Vercel API -> Local Storage Fallback)
export const sendContactMessage = async (messageData) => {
  // 1. Send via Vercel backend /contact API
  try {
    const res = await smartFetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });
    if (res && res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /contact failed, saving locally:', err);
  }

  // 2. Save locally if offline
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]');
    const newMsg = {
      id: Date.now(),
      ...messageData,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    existing.unshift(newMsg);
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(existing));
    return {
      status: 'success',
      message: `Thank you ${messageData.name}! Your message has been received (saved locally).`,
    };
  } catch (err) {
    throw new Error('Failed to save message: ' + err.message);
  }
};

// Admin Authentication
export const loginAdmin = async (username, password) => {
  try {
    const res = await smartFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res && res.ok) {
      const data = await res.json();
      if (data && data.access_token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
        return { success: true, token: data.access_token, source: 'api' };
      }
    } else if (res && (res.status === 400 || res.status === 401)) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Incorrect username or password');
    }
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('password')) {
      throw err;
    }
    // Standalone fallback check if API server is offline
  }

  // Standalone mode credentials fallback
  if (username === 'admin' && (password === 'harsha123' || password === 'admin123')) {
    const mockToken = 'mock_jwt_token_' + Date.now();
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    return { success: true, token: mockToken, source: 'local' };
  }

  throw new Error('Invalid username or password');
};

export const isTokenValid = (token) => {
  if (!token || token === 'undefined' || token === 'null' || token === '') {
    return false;
  }
  if (token.startsWith('mock_jwt_token_')) {
    return true;
  }
  if (token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          return false;
        }
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
};

export const getAuthToken = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!isTokenValid(token)) {
    if (token) localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
  return token;
};

export const logoutAdmin = () => localStorage.removeItem(AUTH_TOKEN_KEY);

// Fetch Messages for Admin
export const fetchAdminMessages = async () => {
  const token = getAuthToken();
  if (token) {
    try {
      const res = await smartFetch('/admin/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch {
      // Fall back
    }
  }
  try {
    return JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]');
  } catch {
    return [];
  }
};

// Save Whole Portfolio Data (Dual-Mode update)
export const saveAllPortfolioData = async (fullData) => {
  const dataToSave = { ...fullData, is_custom: true, last_updated: Date.now() };
  saveLocalData(dataToSave);

  const token = getAuthToken();
  if (!token) return { success: true, source: 'local' };

  try {
    if (fullData.profile) {
      await smartFetch('/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fullData.profile),
      });
    }
    return { success: true, source: 'api' };
  } catch (e) {
    console.warn('API sync failed, saved locally:', e);
    return { success: true, source: 'local' };
  }
};

// Reset to Defaults
export const resetToDefaults = async () => {
  const token = getAuthToken();
  if (token) {
    try {
      await smartFetch('/admin/reset-defaults', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore if offline
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  return { ...defaultPortfolioData, is_custom: false };
};
// AI Agent Chat (Interactive Multi-Mode Support)
export const sendChatMessage = async (message, mode = 'general', customPortfolioData = null) => {
  try {
    const local = customPortfolioData || getLocalData();
    const res = await smartFetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message,
        portfolio_data: local,
        mode,
      }),
    });
    return await res.json();
  } catch (err) {
    return {
      reply:
        "I am an AI assistant representing the developer. To enable live AI intelligence, please add GEMINI_API_KEY in your Vercel Project Settings!",
    };
  }
};

// Client-side parser for Resume JSON (Reactive Resume, JSON Resume, or Full Portfolio JSON format)
export function parseResumeJson(jsonPayload) {
  if (!jsonPayload || typeof jsonPayload !== 'object') {
    return {};
  }

  // 1. Format: Full Portfolio Export
  if (jsonPayload.profile && (jsonPayload.experiences || jsonPayload.projects || jsonPayload.skills)) {
    const prof = jsonPayload.profile || {};
    return {
      profile: {
        name: prof.name || 'Developer',
        title: prof.title || 'Software Engineer',
        email: prof.email || '',
        phone: prof.phone || '',
        location: prof.location || '',
        summary: prof.summary || '',
        years_experience: prof.years_experience || 6,
        linkedin_url: prof.linkedin_url || '',
        github_url: prof.github_url || '',
        hackerrank_url: prof.hackerrank_url || '',
        x_url: prof.x_url || '',
        leetcode_url: prof.leetcode_url || '',
        website_url: prof.website_url || '',
        resume_download_url: prof.resume_download_url || '#',
      },
      experiences: jsonPayload.experiences || [],
      skills: jsonPayload.skills || [],
      projects: jsonPayload.projects || [],
      education: jsonPayload.education || [],
      awards: jsonPayload.awards || [],
      certifications: jsonPayload.certifications || [],
      ai_insights: jsonPayload.ai_insights || [],
      posts: jsonPayload.posts || [],
    };
  }

  // 2. Format: Reactive Resume (v4) or Standard JSON Resume
  const basics = jsonPayload.basics || jsonPayload.profile || {};
  const summaryContent = jsonPayload.summary?.content || basics.summary || '';
  const cleanSummary = summaryContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const profilesList = [
    ...(jsonPayload.sections?.profiles?.items || []),
    ...(basics.profiles || []),
    ...(jsonPayload.profiles || []),
  ];

  let linkedin = basics.linkedin_url || basics.linkedin || '';
  let github = basics.github_url || basics.github || '';
  let hackerrank = basics.hackerrank_url || '';
  let x = basics.x_url || basics.twitter || '';
  let leetcode = basics.leetcode_url || '';

  for (const p of profilesList) {
    const net = (p.network || p.name || '').toLowerCase();
    const rawUrl = p.website?.url || p.url || (typeof p.website === 'string' ? p.website : '') || '';
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl) continue;

    if (net.includes('linkedin') && !linkedin) linkedin = cleanUrl;
    else if (net.includes('github') && !github) github = cleanUrl;
    else if (net.includes('hackerrank') && !hackerrank) hackerrank = cleanUrl;
    else if ((net.includes('x') || net.includes('twitter')) && !x) x = cleanUrl;
    else if (net.includes('leetcode') && !leetcode) leetcode = cleanUrl;
  }

  const websiteUrl = basics.website?.url || basics.url || (typeof basics.website === 'string' ? basics.website : '') || '';
  if (websiteUrl) {
    if (websiteUrl.includes('github.com') && !github) github = websiteUrl;
    else if (websiteUrl.includes('linkedin.com') && !linkedin) linkedin = websiteUrl;
  }

  const profile = {
    name: basics.name || 'Developer',
    title: basics.headline || basics.title || basics.label || 'Software Engineer',
    email: basics.email || '',
    phone: basics.phone || '',
    location: (typeof basics.location === 'object' ? [basics.location.city, basics.location.region, basics.location.countryCode].filter(Boolean).join(', ') : basics.location) || '',
    summary: cleanSummary,
    years_experience: basics.years_experience || 6,
    linkedin_url: linkedin,
    github_url: github,
    hackerrank_url: hackerrank,
    x_url: x,
    leetcode_url: leetcode,
    website_url: websiteUrl,
    resume_download_url: basics.resume_download_url || '#',
  };

  const expItems = [
    ...(jsonPayload.sections?.experience?.items || []),
    ...(jsonPayload.work || []),
    ...(jsonPayload.experiences || []),
  ];

  const experiences = expItems.map((e, idx) => {
    const rawDesc = e.description || e.summary || '';
    const company = e.company || e.name || 'Company';
    const role = e.position || e.role || 'Software Engineer';

    // Extract skills_text with robust regex
    const skillsMatch =
      rawDesc.match(/Skill\(s\)\s*[-:]\s*(?:<\/strong>)?(.*?)(?:<\/strong>)?\s*<\/p>/i) ||
      rawDesc.match(/Skill\(s\)\s*[-:]\s*(.*?)(?:<\/p>|<ul>|<li>|$)/i);
    let skillsText = skillsMatch ? skillsMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\.$/, '') : '';
    if (!skillsText && Array.isArray(e.skills)) {
      skillsText = e.skills.join(', ');
    }

    // Extract bullets from <li> tags
    const bullets = Array.from(rawDesc.matchAll(/<li>(?:<p>)?(.*?)(?:<\/p>)?<\/li>/gs)).map(m =>
      m[1]
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    ).filter(Boolean);

    if (!bullets.length && Array.isArray(e.highlights)) {
      bullets.push(...e.highlights);
    }

    // Extract pure description: remove Skill(s) paragraph and <ul>...</ul> block
    const descWithoutSkills = rawDesc.replace(/<p>\s*(?:<strong>)?\s*Skill\(s\).*?<\/p>/gis, '');
    const descWithoutBullets = descWithoutSkills.replace(/<ul[^>]*>.*?<\/ul>/gis, '');
    let cleanDesc = descWithoutBullets
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const period = e.period || '';
    const periodParts = period ? period.split(/\s*(?:[\u2013\u2014\-]|to)\s*/).filter(Boolean) : [];
    const isCurrent = Boolean(e.is_current || e.present || (e.dates?.present) || period.toLowerCase().includes('present'));

    let startDate = '';
    let endDate = '';
    if (periodParts.length >= 2) {
      startDate = periodParts[0];
      endDate = isCurrent ? 'Present' : periodParts[1];
    } else if (periodParts.length === 1) {
      startDate = periodParts[0];
      endDate = isCurrent ? 'Present' : '';
    } else {
      const dates = e.dates || {};
      startDate = e.start_date || e.startDate || dates.start || '';
      endDate = isCurrent ? 'Present' : (e.end_date || e.endDate || dates.end || '');
    }

    let finalDesc = cleanDesc;
    let finalBullets = bullets;

    if (!cleanDesc && !bullets.length) {
      finalDesc = `Software Engineer at ${company}, architecting and delivering software engineering initiatives.`;
      finalBullets = [finalDesc];
    }

    return {
      id: e.id || idx + 1,
      company,
      role,
      location: (typeof e.location === 'object' ? e.location.city : e.location) || '',
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent,
      skills_text: skillsText,
      description: finalDesc,
      achievements: JSON.stringify(finalBullets.length ? finalBullets : (finalDesc ? [finalDesc] : [])),
      display_order: idx + 1,
    };
  });

  const skillItems = [
    ...(jsonPayload.sections?.skills?.items || []),
    ...(jsonPayload.skills || []),
  ];

  const skills = skillItems.map((s, idx) => {
    const name = typeof s === 'string' ? s : (s.name || '');
    const nLow = name.toLowerCase();
    let category = s.category || 'Core Competencies';
    if (!s.category) {
      if (['azure', 'synapse', 'pyspark', 'databricks', 'cloud', 'aws', 'gcp'].some(k => nLow.includes(k))) {
        category = 'Cloud & Big Data';
      } else if (['python', 'django', 'java', 'spring', 'fastapi', 'flask', 'node'].some(k => nLow.includes(k))) {
        category = 'Languages & Backend';
      } else if (['react', 'angular', 'javascript', 'typescript', 'html', 'css'].some(k => nLow.includes(k))) {
        category = 'Frontend';
      } else if (['sql', 'mysql', 'postgres', 'mongo', 'database'].some(k => nLow.includes(k))) {
        category = 'Databases';
      } else if (['docker', 'kubernetes', 'git', 'devops', 'jenkins', 'pipeline'].some(k => nLow.includes(k))) {
        category = 'DevOps & Cloud';
      }
    }
    return {
      id: s.id || idx + 1,
      name,
      category,
      proficiency: s.proficiency || (idx < 8 ? 'Expert' : 'Proficient'),
      display_order: s.display_order || idx + 1,
    };
  });

  const projItems = [
    ...(jsonPayload.sections?.projects?.items || []),
    ...(jsonPayload.projects || []),
  ];

  const projects = projItems.map((pr, idx) => {
    const pUrl = pr.github_url || pr.website?.url || pr.url || (typeof pr.website === 'string' ? pr.website : '') || '';
    const lUrl = pr.live_url || pr.website_url || (pUrl && !pUrl.includes('github.com') ? pUrl : '');
    const ghUrl = pr.github_url || (pUrl.includes('github.com') ? pUrl : '');

    return {
      id: pr.id || idx + 1,
      title: pr.name || pr.title || `Project ${idx + 1}`,
      subtitle: pr.subtitle || 'Engineered Solution',
      description: (pr.description || '').replace(/<[^>]+>/g, '').trim() || `${pr.name || 'Project'} implementation.`,
      tech_stack: pr.tech_stack || (Array.isArray(pr.keywords) ? pr.keywords.join(', ') : 'Python, Cloud Services, REST APIs'),
      github_url: ghUrl,
      live_url: lUrl,
      highlights: pr.highlights ? (typeof pr.highlights === 'string' ? pr.highlights : JSON.stringify(pr.highlights)) : JSON.stringify([pr.description?.replace(/<[^>]+>/g, '').trim() || pr.name || 'Project']),
      featured: pr.featured !== undefined ? pr.featured : true,
      display_order: pr.display_order || idx + 1,
    };
  });

  const eduItems = [
    ...(jsonPayload.sections?.education?.items || []),
    ...(jsonPayload.education || []),
  ];

  const education = eduItems.map((ed, idx) => {
    const edPeriod = ed.period || '';
    const edParts = edPeriod ? edPeriod.split(/\s*(?:[\u2013\u2014\-]|to)\s*/).filter(Boolean) : [];
    const startYear = edParts[0] || ed.dates?.start || ed.start_year || '';
    const endYear = edParts[1] || ed.dates?.end || ed.end_year || '';

    return {
      id: ed.id || idx + 1,
      institution: ed.school || ed.institution || 'University',
      degree: ed.degree || 'Degree',
      field_of_study: ed.area || ed.field_of_study || 'Engineering',
      grade: ed.grade || '',
      start_year: startYear,
      end_year: endYear,
      url: ed.website?.url || ed.url || '',
    };
  });

  const awardItems = [
    ...(jsonPayload.sections?.awards?.items || []),
    ...(jsonPayload.awards || []),
  ];

  const awards = awardItems.map((aw, idx) => ({
    id: aw.id || idx + 1,
    title: aw.title || 'Honor',
    organization: aw.awarder || aw.organization || 'Organization',
    year: aw.date || aw.dates?.start || aw.year || '',
    description: (aw.description || '').replace(/<[^>]+>/g, '').trim() || '',
    display_order: aw.display_order || idx + 1,
  }));

  const certItems = [
    ...(jsonPayload.sections?.certifications?.items || []),
    ...(jsonPayload.certifications || []),
    ...(jsonPayload.certificates || []),
  ];

  const certifications = certItems.map((ct, idx) => ({
    id: ct.id || idx + 1,
    name: ct.title || ct.name || 'Certificate',
    issuer: ct.issuer || 'Accredited Issuer',
    issue_date: ct.date || ct.issue_date || '',
    credential_url: ct.website?.url || ct.url || ct.credential_url || '',
    display_order: ct.display_order || idx + 1,
  }));

  // Client-side fallback AI insights synthesized from parsed profile & experiences
  const topExps = experiences.slice(0, 3);
  const topCompanies = topExps.map((e) => e.company).filter(Boolean);
  const companyStr = topCompanies.length ? topCompanies.join(', ') : 'leading tech enterprises';
  const topSkills = skills.slice(0, 6).map((s) => s.name);
  const skillStr = topSkills.length ? topSkills.join(', ') : 'Cloud, Distributed Systems & Backend Engineering';

  const ai_insights = [
    {
      id: 1,
      section_key: 'engineering_philosophy',
      title: 'Engineering Philosophy & Focus',
      subtitle: 'Architectural Principles & Software Craftsmanship',
      content: JSON.stringify({
        title: 'Engineering Philosophy & Focus',
        subtitle: 'Architectural Principles & Software Craftsmanship',
        content: `I focus on designing software systems that balance high throughput with resilient, maintainable architecture. Having built production platforms across ${companyStr}, I prioritize clean service boundaries, end-to-end data integrity, and deterministic latency over premature complexity. My goal is always to deliver performant systems that scale gracefully under real-world demand.`,
        principles: [
          'Pragmatic Architecture: Prioritizing clean service boundaries, observability, and simplicity over resume-driven complexity.',
          `Latency & Performance Obsession: Profiling queries, caching critical paths, and tuning async event loops with ${skillStr}.`,
          'End-to-End Ownership: Deep commitment from distributed cloud infrastructure and CI/CD automation to polished client experiences.',
        ],
      }),
      display_order: 1,
    },
    {
      id: 2,
      section_key: 'architecture_highlights',
      title: 'System Architecture & Production Milestones',
      subtitle: 'Scalability, Distributed Pipelines & Low-Latency Performance',
      content: JSON.stringify({
        title: 'System Architecture & Production Milestones',
        subtitle: 'Scalability, Distributed Pipelines & Low-Latency Performance',
        bullets: [
          `Architected high-throughput microservices and distributed data pipelines leveraging ${skillStr}.`,
          'Engineered resilient ETL ingestion workflows handling high-volume analytical records with sub-second performance.',
          'Championed cloud modernization, automated CI/CD deployment pipelines, and containerization best practices.',
        ],
      }),
      display_order: 2,
    },
    {
      id: 3,
      section_key: 'domain_expertise',
      title: 'Domain Expertise & What I Build',
      subtitle: 'Core Specializations & Technical Vision',
      content: JSON.stringify({
        title: 'Domain Expertise & What I Build',
        subtitle: 'Core Specializations & Technical Vision',
        mission: `Passionate about solving complex engineering bottlenecks, designing distributed data pipelines, and building scalable cloud-native architectures with ${skillStr}.`,
        focus_areas: [
          'High-Throughput Data Ingestion',
          'Resilient Cloud Backends & Microservices',
          'API Performance & Query Tuning',
          'Modern Reactive Interfaces & Dashboards',
        ],
        technical_stack: topSkills.length ? topSkills : ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Cloud', 'React'],
        values: [
          'Sub-second API Latency',
          'Zero-Downtime Releases',
          'Strict Type Safety & Clean Contracts',
          'Data Integrity & Fault Tolerance',
        ],
      }),
      display_order: 3,
    },
  ];

  return {
    profile,
    experiences,
    skills,
    projects,
    education,
    awards,
    certifications,
    ai_insights,
  };
}

// Import Resume JSON (Dual-Mode: syncs to backend if online, updates localStorage)
export const importResumeJson = async (jsonPayload) => {
  const parsed = parseResumeJson(jsonPayload);
  
  // Update localStorage immediately and mark as custom
  const existing = getLocalData() || {};
  const updatedData = { 
    ...existing, 
    ...parsed,
    profile: {
      ...(existing.profile || {}),
      ...(parsed.profile || {}),
    },
    is_custom: true, 
    last_updated: Date.now() 
  };
  saveLocalData(updatedData);

  // If authenticated and online, sync to backend
  const token = getAuthToken();
  if (token) {
    try {
      const res = await smartFetch('/admin/import-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jsonPayload),
      });
      if (res.ok) {
        // Fetch fresh portfolio data from backend to retrieve Gemini-generated insights
        try {
          const freshRes = await smartFetch('/portfolio');
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            if (freshData && freshData.ai_insights && freshData.ai_insights.length > 0) {
              updatedData.ai_insights = freshData.ai_insights;
              saveLocalData(updatedData);
            }
          }
        } catch {}
        return { success: true, data: updatedData, source: 'api' };
      }
    } catch (e) {
      console.warn('Backend sync failed, saved locally:', e);
    }
  }

  return { success: true, data: updatedData, source: 'local' };
};

// Generate AI Insights via Backend Gemini Endpoint
export const generateAiInsightsApi = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Your session has expired. Please log in again.');
  const res = await smartFetch('/admin/generate-ai-insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      logoutAdmin();
      throw new Error('Your session has expired. Please log in again.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate AI insights');
  }
  const result = await res.json();
  try {
    const freshRes = await smartFetch('/portfolio');
    if (freshRes.ok) {
      const freshData = await freshRes.json();
      if (freshData && freshData.ai_insights) {
        const local = getLocalData();
        const updated = { ...local, ai_insights: freshData.ai_insights };
        saveLocalData(updated);
        return { ...result, ai_insights: freshData.ai_insights };
      }
    }
  } catch {}
  return result;
};

// Blog Posts API (Vercel API -> Local Storage Fallback)
export const fetchBlogPosts = async () => {
  try {
    const res = await smartFetch('/posts');
    if (res && res.ok) {
      const posts = await res.json();
      if (Array.isArray(posts)) return posts;
    }
  } catch (err) {
    console.warn('Backend /posts fetch failed, using local posts:', err);
  }
  return getLocalData().posts || [];
};

export const createBlogPost = async (postData) => {
  const token = getAuthToken();
  if (token) {
    try {
      const res = await smartFetch('/admin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend create post failed, saving locally:', e);
    }
  }

  // Local fallback
  const local = getLocalData();
  const newPost = {
    id: Date.now(),
    ...postData,
    created_at: new Date().toISOString(),
  };
  local.posts = [newPost, ...(local.posts || [])];
  saveLocalData(local);
  return newPost;
};

export const updateBlogPost = async (id, postData) => {
  const token = getAuthToken();
  if (token) {
    try {
      const res = await smartFetch(`/admin/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend update post failed, saving locally:', e);
    }
  }

  // Local fallback
  const local = getLocalData();
  local.posts = (local.posts || []).map((p) => (p.id === id ? { ...p, ...postData } : p));
  saveLocalData(local);
  return postData;
};

export const deleteBlogPost = async (id) => {
  const token = getAuthToken();
  if (token) {
    try {
      const res = await smartFetch(`/admin/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend delete post failed, saving locally:', e);
    }
  }

  // Local fallback
  const local = getLocalData();
  local.posts = (local.posts || []).filter((p) => p.id !== id);
  saveLocalData(local);
  return { status: 'success' };
};

