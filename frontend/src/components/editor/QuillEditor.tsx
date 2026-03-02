import React, { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange }) => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  return (
    <div className="bg-ui-card text-white rounded-lg overflow-hidden">
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange} 
        modules={modules}
        style={{ color: 'white' }}
      />
    </div>
  );
};

export default QuillEditor;