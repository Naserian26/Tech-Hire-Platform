import { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  [{ font: [] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  ['blockquote', 'code-block', 'link'],
  ['clean'],
];

const QuillEditor = ({
  value,
  onChange,
  placeholder = 'Create a detailed job description...',
  minHeight = 220,
}: Props) => {
  const quillRef = useRef<ReactQuill>(null);

  return (
    <div className="quill-wrapper">
      <style>{`
        .quill-wrapper {
          border: 1px solid #334155;
          border-radius: 14px;
          overflow: hidden;
          background: #0f172a;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .quill-wrapper:focus-within {
          border-color: #14b8a6;
          box-shadow: 0 0 0 3px rgba(20,184,166,0.1);
        }
        .quill-wrapper .ql-toolbar.ql-snow {
          background: #1e293b;
          border: none !important;
          border-bottom: 1px solid #334155 !important;
          border-radius: 14px 14px 0 0;
          padding: 8px 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
        }
        .quill-wrapper .ql-toolbar.ql-snow .ql-formats {
          margin-right: 4px;
          display: flex;
          align-items: center;
        }
        .quill-wrapper .ql-container.ql-snow {
          border: none !important;
          font-family: inherit;
        }
        .quill-wrapper .ql-toolbar.ql-snow button {
          width: 28px; height: 28px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s; padding: 4px;
        }
        .quill-wrapper .ql-toolbar.ql-snow button:hover { background: #334155 !important; }
        .quill-wrapper .ql-toolbar.ql-snow button.ql-active { background: rgba(20,184,166,0.15) !important; }
        .quill-wrapper .ql-toolbar .ql-stroke { stroke: #64748b; }
        .quill-wrapper .ql-toolbar .ql-fill   { fill:   #64748b; }
        .quill-wrapper .ql-toolbar button:hover .ql-stroke  { stroke: #e2e8f0; }
        .quill-wrapper .ql-toolbar button:hover .ql-fill    { fill:   #e2e8f0; }
        .quill-wrapper .ql-toolbar button.ql-active .ql-stroke { stroke: #14b8a6; }
        .quill-wrapper .ql-toolbar button.ql-active .ql-fill   { fill:   #14b8a6; }
        .quill-wrapper .ql-snow .ql-picker { color: #64748b; font-size: 12px; height: 28px; }
        .quill-wrapper .ql-snow .ql-picker-label {
          border: none !important; padding: 0 6px; border-radius: 6px;
          height: 28px; display: flex; align-items: center; transition: background 0.15s;
        }
        .quill-wrapper .ql-snow .ql-picker-label:hover { background: #334155; color: #e2e8f0; }
        .quill-wrapper .ql-snow .ql-picker-label .ql-stroke { stroke: #64748b; }
        .quill-wrapper .ql-snow .ql-picker-label:hover .ql-stroke { stroke: #e2e8f0; }
        .quill-wrapper .ql-snow .ql-picker.ql-expanded .ql-picker-label { background: rgba(20,184,166,0.15); color: #14b8a6; }
        .quill-wrapper .ql-snow .ql-picker.ql-header { width: 96px; }
        .quill-wrapper .ql-snow .ql-picker.ql-font   { width: 108px; }
        .quill-wrapper .ql-snow .ql-picker-options {
          background: #1e293b; border: 1px solid #334155 !important;
          border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          padding: 4px; margin-top: 4px;
        }
        .quill-wrapper .ql-snow .ql-picker-item {
          color: #94a3b8; border-radius: 6px; padding: 5px 10px;
          font-size: 12px; transition: background 0.1s;
        }
        .quill-wrapper .ql-snow .ql-picker-item:hover { background: #334155 !important; color: #fff; }
        .quill-wrapper .ql-snow .ql-picker-item.ql-selected { color: #14b8a6; }
        .quill-wrapper .ql-snow .ql-color-picker .ql-picker-options { width: 164px; padding: 6px; }
        .quill-wrapper .ql-snow .ql-color-picker .ql-picker-item {
          width: 18px; height: 18px; border-radius: 4px; padding: 0; border: 1px solid transparent;
        }
        .quill-wrapper .ql-snow .ql-color-picker .ql-picker-item:hover { border-color: #fff; }
        .quill-wrapper .ql-editor {
          min-height: ${minHeight}px; color: #e2e8f0; font-size: 14px;
          line-height: 1.75; padding: 16px; caret-color: #14b8a6;
        }
        .quill-wrapper .ql-editor.ql-blank::before {
          color: #475569; font-style: normal; font-size: 14px; left: 16px; right: 16px;
        }
        .quill-wrapper .ql-editor h1 { color: #f1f5f9; font-size: 1.4em; font-weight: 700; margin: 0 0 8px; }
        .quill-wrapper .ql-editor h2 { color: #f1f5f9; font-size: 1.2em; font-weight: 600; margin: 0 0 6px; }
        .quill-wrapper .ql-editor h3 { color: #f1f5f9; font-size: 1.05em; font-weight: 600; margin: 0 0 4px; }
        .quill-wrapper .ql-editor p  { color: #cbd5e1; margin: 0 0 6px; }
        .quill-wrapper .ql-editor strong { color: #f1f5f9; }
        .quill-wrapper .ql-editor a  { color: #14b8a6; text-decoration: underline; }
        .quill-wrapper .ql-editor ul,
        .quill-wrapper .ql-editor ol { padding-left: 1.6em; color: #cbd5e1; margin: 4px 0; }
        .quill-wrapper .ql-editor li { margin-bottom: 3px; }
        .quill-wrapper .ql-editor blockquote {
          border-left: 3px solid #14b8a6; margin: 8px 0; padding-left: 12px;
          color: #94a3b8; background: rgba(20,184,166,0.05); border-radius: 0 6px 6px 0;
        }
        .quill-wrapper .ql-editor pre.ql-syntax {
          background: #020617; border: 1px solid #1e293b; border-radius: 8px;
          color: #7dd3fc; padding: 12px 16px; font-size: 13px; margin: 8px 0;
        }
        .quill-wrapper .ql-editor::-webkit-scrollbar { width: 4px; }
        .quill-wrapper .ql-editor::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={{ toolbar: TOOLBAR }}
      />
    </div>
  );
};

export default QuillEditor;