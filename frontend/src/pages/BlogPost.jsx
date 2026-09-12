import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../data/blogData';
import { ArrowLeft, Clock, Calendar, User, Share2, BookOpen, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const post = BLOG_POSTS.find(p => p.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-100">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <BookOpen className="w-12 h-12 text-brand-primary mb-3" />
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white mb-2">Article Not Found</h1>
          <p className="text-xs text-slate-500 mb-6">The requested article slug does not exist.</p>
          <Link to="/blog" className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Related posts (excluding current)
  const relatedPosts = BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Navbar */}
      <PublicNavbar />

      {/* Article Header */}
      <header className="pt-28 sm:pt-36 pb-10 px-4 sm:px-6 lg:px-[8%] relative overflow-hidden bg-white/60 dark:bg-slate-900/30 border-b border-slate-200/80 dark:border-slate-800">
        <div className="glow-orb glow-orb-primary"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Articles
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-extrabold rounded-md uppercase tracking-wider">
              {post.category}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {post.readTime}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900 dark:text-white leading-tight mb-4">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-medium">
            {post.subtitle}
          </p>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <User className="w-4 h-4 text-brand-primary" /> {post.author}
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {post.date}
            </div>
          </div>
        </div>
      </header>

      {/* Main Article Content */}
      <main className="py-12 px-4 sm:px-6 lg:px-[8%] max-w-3xl mx-auto w-full flex-1 z-10">
        <div className="glass-card p-6 sm:p-10 shadow-lg border-slate-200/80 dark:border-slate-800 space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          
          {post.content.split('\n\n').map((paragraph, index) => {
            const trimmed = paragraph.trim();
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={index} className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white mt-8 mb-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={index} className="text-lg font-bold font-display text-slate-900 dark:text-white mt-6 mb-2">
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }
            if (trimmed.startsWith('- ')) {
              const items = trimmed.split('\n- ');
              return (
                <ul key={index} className="space-y-2 my-4 pl-4 border-l-2 border-brand-primary/40 text-xs sm:text-sm">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                      <span>{item.replace('- ', '')}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            if (trimmed.startsWith('---')) {
              return <hr key={index} className="my-6 border-slate-200 dark:border-slate-800" />;
            }
            return <p key={index} className="leading-relaxed">{trimmed}</p>;
          })}

        </div>

        {/* Author Bio Box */}
        <div className="glass-card p-6 mt-8 flex items-center gap-4 border-brand-primary/30">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <User className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{post.author}</h3>
            <p className="text-xs text-brand-primary font-medium">{post.authorRole}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Building CloudVault V4 for fast, secure file transfers between home laptops and college computer labs.
            </p>
          </div>
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 space-y-4">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Related Articles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map(rel => (
                <Link key={rel.id} to={`/blog/${rel.slug}`} className="glass-card p-4 hover:border-brand-primary/40 transition-all flex flex-col justify-between group">
                  <div>
                    <span className="text-[10px] font-bold text-brand-primary uppercase">{rel.category}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-brand-primary transition-colors mt-1">
                      {rel.title}
                    </h4>
                  </div>
                  <div className="mt-3 text-xs font-bold text-brand-primary flex items-center gap-1">
                    Read More <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
};

export default BlogPost;
