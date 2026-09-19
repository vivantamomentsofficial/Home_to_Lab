import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '../data/blogData';
import { BookOpen, Search, ArrowRight, Shield, Clock, Calendar, User, Tag, Sparkles } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import SEO from '../components/SEO';

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Guides & Tutorials', 'Productivity', 'Cybersecurity', 'Security'];

  const filteredPosts = BLOG_POSTS.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      <SEO 
        title="CloudVault Blog - Student Productivity, Lab Hacks & Tech Guides | Home to Lab" 
        description="Explore articles, tutorials, and security guides for students transferring files between home and college computer lab terminals." 
        keywords="cloudvault blog, hometolab blog, student tech guides, college lab hacks, file transfer tips" 
        canonical="https://www.hometolab.in/blog" 
      />
      
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero Header */}
      <section className="pt-28 sm:pt-36 pb-12 px-4 sm:px-6 lg:px-[8%] text-center relative overflow-hidden">
        <div className="glow-orb glow-orb-primary"></div>
        <div className="glow-orb glow-orb-accent"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-brand-primary-light text-xs font-bold tracking-wider uppercase mb-5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Student Knowledge & Security Blog</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-display leading-tight mb-4 bg-gradient-to-r from-slate-900 via-brand-primary to-sky-500 dark:from-white dark:via-brand-primary-light dark:to-cyan-400 bg-clip-text text-transparent">
            Campus Guides & Cybersecurity Best Practices
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
            Expert articles on safe file management, student privacy, computer lab security, and cloud transfer tips.
          </p>

          {/* Search & Category Filter Bar */}
          <div className="glass-card max-w-2xl mx-auto p-4 flex flex-col sm:flex-row gap-3 items-center border-brand-primary/20 shadow-xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search articles & guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary transition-all"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Articles Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-[8%] max-w-6xl mx-auto w-full flex-1 z-10">
        {filteredPosts.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-md mx-auto my-8">
            <Search className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">No Articles Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search term or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {filteredPosts.map((post) => (
              <article key={post.id} className="glass-card p-6 sm:p-7 flex flex-col justify-between hover:border-brand-primary/40 transition-all group shadow-sm hover:shadow-xl">
                <div>
                  <div className="flex justify-between items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                      {post.category}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {post.readTime}
                    </span>
                  </div>

                  <Link to={`/blog/${post.slug}`} className="group-hover:text-brand-primary transition-colors">
                    <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white leading-snug mb-2">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                    <User className="w-3.5 h-3.5 text-brand-primary" />
                    <span>{post.author}</span>
                  </div>
                  <Link 
                    to={`/blog/${post.slug}`}
                    className="font-bold text-brand-primary hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    Read Article <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
};

export default Blog;
