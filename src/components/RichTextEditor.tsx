'use client';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
    },
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Enter content...'}
      />
      <style jsx global>{`
        .rich-text-editor {
          border-radius: var(--radius-sm);
          transition: box-shadow var(--dur-2) var(--ease);
        }
        .rich-text-editor:focus-within {
          box-shadow: 0 0 0 4px var(--accent-ring);
        }
        .rich-text-editor .ql-toolbar.ql-snow {
          border: 1px solid var(--line-strong);
          border-bottom: 1px solid var(--line);
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          background: var(--bg);
          padding: 0.6rem;
          font-family: inherit;
        }
        .rich-text-editor .ql-toolbar.ql-snow button {
          width: 36px;
          height: 36px;
          padding: 7px;
          border-radius: 8px;
        }
        .rich-text-editor .ql-toolbar.ql-snow button:hover,
        .rich-text-editor .ql-toolbar.ql-snow button.ql-active {
          background: var(--accent-soft);
        }
        .rich-text-editor .ql-container.ql-snow {
          border: 1px solid var(--line-strong);
          border-top: none;
          border-radius: 0 0 var(--radius-sm) var(--radius-sm);
          background: var(--surface);
          font-family: inherit;
          font-size: 1.1rem;
        }
        .rich-text-editor .ql-editor {
          min-height: 240px;
          line-height: 1.7;
          padding: 1rem 1.1rem;
          color: var(--text);
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9a9aa1;
          font-style: normal;
          left: 1.1rem;
        }
        .rich-text-editor .ql-stroke { stroke: var(--text-2); }
        .rich-text-editor .ql-fill { fill: var(--text-2); }
        .rich-text-editor .ql-picker-label { color: var(--text-2); }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke { stroke: var(--accent); }
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill { fill: var(--accent); }
      `}</style>
    </div>
  );
}

