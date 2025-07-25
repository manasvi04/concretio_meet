/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, Download, Trash2, Code, FileText } from 'lucide-react';

interface NotepadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Notepad = ({ isOpen, onClose }: NotepadProps) => {
  const [content, setContent] = useState('// You can write code or take notes here');
  const [mode, setMode] = useState<'code' | 'notes'>('code');
  const [isSaved, setIsSaved] = useState(false);

  // Load saved content when component mounts
  useEffect(() => {
    const savedContent = localStorage.getItem('notepad-content');
    const savedMode = localStorage.getItem('notepad-mode') as 'code' | 'notes';
    
    if (savedContent) {
      setContent(savedContent);
      setIsSaved(true);
    }
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Add keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        saveContent();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, content, mode]);

  // Auto-save functionality (saves every 30 seconds if there are unsaved changes)
  useEffect(() => {
    if (!isSaved && content !== '// You can write code or take notes here') {
      const autoSaveTimer = setTimeout(() => {
        saveContent();
        console.log('Auto-saved content');
      }, 30000); // 30 seconds

      return () => clearTimeout(autoSaveTimer);
    }
  }, [content, isSaved]);

  const saveContent = () => {
    localStorage.setItem('notepad-content', content);
    localStorage.setItem('notepad-mode', mode);
    setIsSaved(true);
    
    // Show a brief success message (optional)
    console.log('Content saved successfully!');
  };

  // Track content changes to show unsaved state
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsSaved(false); // Mark as unsaved when content changes
  };

  const downloadContent = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode === 'code' ? 'code' : 'notes'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearContent = () => {
    setContent('');
    setIsSaved(false);
    // Also clear from localStorage
    localStorage.removeItem('notepad-content');
    localStorage.removeItem('notepad-mode');
  };

  if (!isOpen) return null;

  return (
    <div className="h-full bg-notepad-bg border-l border-border flex flex-col animate-slide-in">
      {/* Header */}
      {/* <div className="p-4 border-b border-border bg-card"> */}
        {/* <div className="flex items-center justify-between">
          {/* <div className="flex items-center space-x-2">
            {/* <div className="flex items-center space-x-1"> */}
              {/* <Button
                variant={mode === 'code' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setMode('code')}
              >
                <Code className="w-3 h-3 mr-1" />
                Code
              </Button>
              <Button
                variant={mode === 'notes' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setMode('notes')}
              >
                <FileText className="w-3 h-3 mr-1" />
                Notes
              </Button> */}
            {/* </div> */}
          {/* </div> */}
          {/* <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button> */}
        {/* </div>  */}
      {/* </div> */}

      {/* Content Area */}
      <div className="flex-1 p-4">
        <Textarea
          value={content}
          onChange={handleContentChange}
          placeholder={mode === 'code' ? 'Write your code here...' : 'Take your notes here...'}
          className="w-full h-full resize-none bg-background border-border font-mono text-sm focus:ring-code-highlight"
          style={{ minHeight: '500px' }}
        />
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {content.split('\n').length} lines • {content.length} characters
            {!isSaved && content !== '// You can write code or take notes here' && (
              <span className="ml-2 text-amber-500">• Unsaved changes</span>
            )}
            {isSaved && content !== '// You can write code or take notes here' && (
              <span className="ml-2 text-green-500">• Saved</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={clearContent}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button 
              variant={isSaved ? "default" : "secondary"} 
              size="sm" 
              onClick={saveContent}
              className={isSaved ? "bg-green-600 hover:bg-green-700" : ""}
              title="Save content (Ctrl+S)"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaved ? "Saved" : "Save"}
            </Button>
            <Button variant="default" size="sm" onClick={downloadContent}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};