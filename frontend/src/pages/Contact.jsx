import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { Shield, ArrowLeft, Mail, Send, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Contact = () => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Support');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast('Please fill out all required fields.', 'warning');
      return;
    }

    setSending(true);

    const mailtoUrl = `mailto:aayushparekh26@gmail.com?subject=${encodeURIComponent(`[${subject}] Contact Request from ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`)}`;

    try {
      const serviceId = 'service_98oq29o';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_v0fdm9h';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      const templateParams = {
        from_name: name,
        from_email: email,
        topic: subject,
        message: message,
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      setSubmitted(true);
      showToast('Your message has been sent successfully!', 'success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.warn('EmailJS delivery failed, falling back to mailto client:', err);
      window.location.href = mailtoUrl;
      showToast('Opened email client to send your message to aayushparekh26@gmail.com!', 'success');
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-accent"></div>

      {/* Header / Nav */}
      <header className="border-b border-brand-border-light dark:border-brand-border-dark bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-brand-primary stroke-[2.5]" />
            <span className="font-display font-black text-xl text-slate-800 dark:text-white">
              Cloud<span className="text-brand-primary">Vault</span>
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <div className="glass-card p-8 md:p-12 shadow-2xl space-y-10 animate-scale-up">
          
          {/* Header Title */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider mb-3">
              <Mail className="w-3.5 h-3.5" />
              Support &amp; Contact
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
              Contact Support
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Have questions, feedback, or need account assistance? We are here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Contact Info Sidebar */}
            <div className="md:col-span-1 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400">Direct Email</h3>
                    <a href="mailto:aayushparekh26@gmail.com" className="text-sm font-bold text-brand-primary hover:underline block break-all">
                      aayushparekh26@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400">Response Time</h3>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Within 24 to 48 hours
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 space-y-2 text-xs">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-brand-primary" />
                  Common Topics
                </h3>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                  <li>• Temporary Code Expiration Support</li>
                  <li>• Account Data Deletion Requests</li>
                  <li>• Feature Requests &amp; Bug Reports</li>
                  <li>• AdSense &amp; Partnership Inquiries</li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-2">
              {submitted ? (
                <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-slate-800 dark:text-white">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out. We have received your inquiry and will respond to your email address shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="btn-secondary py-2 px-4 text-xs font-bold mt-2"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label-title">Full Name *</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="label-title">Email Address *</label>
                      <input
                        type="email"
                        placeholder="student@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-title">Subject / Inquiry Type *</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none"
                      required
                    >
                      <option value="General Support">General Support</option>
                      <option value="Bug Report">Report a Bug / Issue</option>
                      <option value="Feature Request">Request a Feature</option>
                      <option value="Account Deletion">Account Data Deletion</option>
                      <option value="AdSense Policy Inquiry">AdSense / Business Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-title">Your Message *</label>
                    <textarea
                      rows={5}
                      placeholder="Please describe your question or issue in detail..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="input-field resize-none"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* Footer Navigation */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 CloudVault (Home to Lab). All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/about" className="hover:text-brand-primary transition">About Us</Link>
              <span>•</span>
              <Link to="/privacy-policy" className="hover:text-brand-primary transition">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-brand-primary transition">Terms of Service</Link>
              <span>•</span>
              <Link to="/disclaimer" className="hover:text-brand-primary transition">Disclaimer</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Contact;
