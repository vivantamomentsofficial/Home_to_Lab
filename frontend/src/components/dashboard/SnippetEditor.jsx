import React, { useState } from 'react';
import { 
  FileCode, Lock, Save, Copy, Share2, Check, Eye, Code, Trash, Sparkles, ShieldCheck 
} from 'lucide-react';
import { encryptText, decryptText } from '../../utils/cryptoHelper';

const SUPPORTED_LANGUAGES = [
  { id: 'text', label: 'Plain Text' },
  { id: 'javascript', label: 'JavaScript / Node' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'html', label: 'HTML / CSS' },
  { id: 'sql', label: 'SQL' },
  { id: 'json', label: 'JSON' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
];

const SnippetEditor = ({
  initialTitle = '',
  initialContent = '',
  initialLanguage = 'text',
  onSave,
  onShare,
  isSaving = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [language, setLanguage] = useState(initialLanguage);
  const [enableEncryption, setEnableEncryption] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSnippet = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your snippet/note.');
      return;
    }
    if (!content.trim()) {
      alert('Please enter snippet content.');
      return;
    }

    let finalContent = content;
    let isEncrypted = false;

    if (enableEncryption) {
      if (!passphrase || passphrase.length < 4) {
        alert('Please enter an encryption passphrase (minimum 4 characters).');
        return;
      }
      try {
        finalContent = encryptText(content, passphrase);
        isEncrypted = true;
      } catch (err) {
        alert('Failed to encrypt note. Please verify passphrase.');
        return;
      }
    }

    await onSave({
      title: title.trim(),
      content: finalContent,
      language,
      isEncrypted,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
      {/* Editor Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <FileCode className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Snippet Title (e.g. Database Config / Quick Notes)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsPreview((prev) => !prev)}
            className={`p-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
              isPreview
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" /> {isPreview ? 'Edit' : 'Preview'}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
            title="Copy to Clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Encryption Passphrase Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className={`w-4 h-4 ${enableEncryption ? 'text-amber-500' : 'text-slate-400'}`} />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            AES-256 Client-Side Encryption
          </span>
          <input
            type="checkbox"
            checked={enableEncryption}
            onChange={(e) => setEnableEncryption(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer ml-1"
          />
        </div>

        {enableEncryption && (
          <input
            type="password"
            placeholder="Enter passphrase to encrypt note"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
          />
        )}
      </div>

      {/* Main Textarea / Code Preview */}
      {!isPreview ? (
        <textarea
          rows={10}
          placeholder="Type or paste your code snippet, text note, SQL queries, or configuration here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-4 font-mono text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
      ) : (
        <div className="p-4 font-mono text-xs leading-relaxed bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 min-h-[200px] overflow-x-auto whitespace-pre-wrap">
          {content || '// Snippet content is empty'}
        </div>
      )}

      {/* Footer Save & Share Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onShare && (
          <button
            type="button"
            onClick={() => onShare({ title, content, language })}
            className="py-2.5 px-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share Snippet Code
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveSnippet}
          disabled={isSaving}
          className="py-2.5 px-5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save to Vault'}
        </button>
      </div>
    </div>
  );
};

export default SnippetEditor;
