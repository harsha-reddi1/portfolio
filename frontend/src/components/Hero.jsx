import React, { useMemo } from 'react';
import {
  Mail,
  Phone,
  Code2,
  Database,
  Cloud,
  ChevronRight,
  Download,
  ExternalLink,
  Award,
  Bot,
  Sparkles,
  Briefcase,
  FolderGit2,
} from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import { getCandidateDisplayName } from '../services/api';

export default function Hero({
  profile,
  experiences = [],
  skills = [],
  projects = [],
  awards = [],
  certifications = [],
  onOpenChat,
}) {
  if (!profile) return null;

  const headlineParts = useMemo(() => {
    const title = profile?.title || 'Data Engineer, Full Stack Developer';
    const split = title.split(/[,&/|]/).map((s) => s.trim()).filter(Boolean);
    if (split.length >= 2) {
      return {
        prefix: 'Building High-Velocity',
        highlight: split[0].includes('Data') ? 'Data Systems' : split[0],
        suffix: `& ${split[1].replace(/developer|engineer/gi, '').trim() || split[1]} Platforms`,
      };
    }
    return {
      prefix: 'Building Modern',
      highlight: title,
      suffix: 'Platforms',
    };
  }, [profile]);

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-grid-pattern">
      {/* Background Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Terminal Command Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500">dev@cloud:~$</span>
            <span className="text-emerald-400 font-semibold">whoami --verbose</span>
            <span className="text-slate-400 hidden sm:inline">| {profile.title || 'Data & Full Stack Engineer'}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
            {headlineParts.prefix}{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              {headlineParts.highlight}
            </span>{' '}
            {headlineParts.suffix}
          </h1>

          {/* Subheading Profile Name & Title */}
          <p className="text-xl sm:text-2xl font-mono text-emerald-400/90 mb-4 font-semibold tracking-wide">
            {profile.name} — {profile.title}
          </p>

          {/* Summary / Mission */}
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed mb-8">
            {profile.summary}
          </p>

          {/* Quick Metrics Cards (Dynamically populated from uploaded data) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto mb-10 text-left">
            {/* Card 1: Experience */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Code2 className="w-4 h-4" />
                <span className="text-2xl font-bold font-mono text-white">
                  {profile?.years_experience ? `${profile.years_experience}+` : (experiences.length > 0 ? `${experiences.length}+` : '1+')}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Years Experience</p>
            </div>

            {/* Card 2: Enterprise Roles */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Briefcase className="w-4 h-4" />
                <span className="text-2xl font-bold font-mono text-white">
                  {experiences.length || (projects.length || '1')}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {experiences.length === 1 ? 'Career Milestone' : 'Enterprise Roles'}
              </p>
            </div>

            {/* Card 3: Certifications / Projects */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Cloud className="w-4 h-4" />
                <span className="text-2xl font-bold font-mono text-white">
                  {certifications.length > 0
                    ? `${certifications.length}x`
                    : (projects.length > 0 ? `${projects.length}` : `${skills.length}+`)}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                {certifications.length > 0
                  ? `${certifications[0]?.issuer || 'Verified'} Certified`
                  : (projects.length > 0 ? 'Featured Projects' : 'Core Skills')}
              </p>
            </div>

            {/* Card 4: Honors / Awards / Projects */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-2xl font-bold font-mono text-white">
                  {awards.length > 0
                    ? (awards[0]?.title?.match(/#\d+|\b\d+(?:st|nd|rd|th)\b/i)?.[0] || `${awards.length}x`)
                    : (projects.length > 0 ? `${projects.length}` : `${skills.length}+`)}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                {awards.length > 0
                  ? (awards[0]?.organization ? `${awards[0].organization} Honor` : 'Awards & Honors')
                  : (projects.length > 0 ? 'Production Apps' : 'Proficiencies')}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <a
              href="#projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Explore Projects</span>
              <ChevronRight className="w-4 h-4" />
            </a>

            <button
              onClick={onOpenChat}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-cyan-300 bg-[#050811]/90 hover:bg-[#070d1e] border-2 border-cyan-500/50 hover:border-cyan-400 transition-all shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 cursor-pointer group"
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400 animate-spin" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <span className="font-mono tracking-wider">Ask {firstName}'s Agent</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            </button>

            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 transition-all"
            >
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Get in Touch</span>
            </a>

            <a
              href={profile.resume_download_url && profile.resume_download_url !== '#' ? profile.resume_download_url : `mailto:${profile.email || "developer@example.com"}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-sm text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Resume</span>
            </a>
          </div>

          {/* Social Links Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-slate-800/60">
            {isValidUrl(profile.linkedin_url, 'linkedin.com') && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                <LinkedinIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3 text-slate-600" />
              </a>
            )}

            {isValidUrl(profile.github_url, 'github.com') && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                <GithubIcon className="w-3.5 h-3.5 text-slate-200" />
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 text-slate-600" />
              </a>
            )}

            {isValidUrl(profile.hackerrank_url, 'hackerrank.com') && (
              <a
                href={profile.hackerrank_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>HackerRank</span>
                <ExternalLink className="w-3 h-3 text-slate-600" />
              </a>
            )}

            {isValidUrl(profile.leetcode_url, 'leetcode.com') && (
              <a
                href={profile.leetcode_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>LeetCode</span>
                <ExternalLink className="w-3 h-3 text-slate-600" />
              </a>
            )}

            {isValidUrl(profile.x_url, 'x.com') && (
              <a
                href={profile.x_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                <span>𝕏</span>
                <ExternalLink className="w-3 h-3 text-slate-600" />
              </a>
            )}

            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{profile.phone}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
