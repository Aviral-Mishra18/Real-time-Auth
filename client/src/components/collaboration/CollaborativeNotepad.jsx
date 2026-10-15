import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSocket } from '../../hooks/useSocket';
import { FileText, Save, Download, Sparkles, Check, Heading, Bold, ListTodo, Code } from 'lucide-react';
import toast from 'react-hot-toast';

export const CollaborativeNotepad = () => {
  const { activeChannel, updateChannelNotepad } = useWorkspaceStore();
  const { sendNotepadSync } = useSocket();

  const [content, setContent] = useState(activeChannel?.notepadContent || '');
  const [isSaving, setIsSaving] = useState(false);
  const syncTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeChannel?.notepadContent !== undefined) {
      setContent(activeChannel.notepadContent);
    }
  }, [activeChannel?._id, activeChannel?.notepadContent]);

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    setIsSaving(true);

    // Broadcast immediately via socket to team
    if (activeChannel) {
      sendNotepadSync(activeChannel._id, val);
    }

    // Debounce database persist
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      if (activeChannel) {
        await updateChannelNotepad(activeChannel._id, val);
        setIsSaving(false);
      }
    }, 1000);
  };

  const handleInsertText = (prefix, suffix = '') => {
    setContent((prev) => prev + `\n${prefix} ${suffix}`);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeChannel?.name || 'channel'}-notes.md`;
    link.click();
    toast.success('Notes downloaded as Markdown file! 📄');
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] select-text">
      {/* Top Toolbar */}
      <div className="h-12 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            #{activeChannel?.name} Live Shared Notepad
          </span>

          <span className="flex items-center gap-1 text-[11px] text-slate-400 ml-3 bg-slate-800 px-2 py-0.5 rounded-full">
            {isSaving ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Syncing...
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Saved to cloud
              </>
            )}
          </span>
        </div>

        {/* Quick Format Tools & Export */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleInsertText('### ')}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            title="Heading"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText('**Bold text**')}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText('- [ ] ')}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            title="Checklist Item"
          >
            <ListTodo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText('```js\n// Code snippet\n```')}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-medium transition-colors"
            title="Download notes as markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 p-6 overflow-y-auto">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start typing your channel documentation, meeting agenda, or shared thoughts here..."
          className="w-full h-full bg-transparent text-slate-100 font-mono text-sm leading-relaxed placeholder-slate-600 focus:outline-none resize-none border-none"
        />
      </div>

      {/* Bottom Status Bar */}
      <div className="h-8 px-4 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Real-time team collaboration active</span>
        </div>
      </div>
    </div>
  );
};
