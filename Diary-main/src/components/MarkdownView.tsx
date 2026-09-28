import React from 'react';

interface MarkdownViewProps {
  content: string;
}

export function MarkdownView({ content }: MarkdownViewProps) {
  if (!content) {
    return <p className="text-slate-400 italic text-sm">暂无内容...</p>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const formatInline = (text: string): React.ReactNode => {
    // Replace bold **text**
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 bg-slate-100 text-indigo-600 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-700">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-xs font-mono my-3 border border-slate-800 leading-relaxed">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-6 mb-3 tracking-tight">{formatInline(trimmed.slice(2))}</h1>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl sm:text-2xl font-bold text-slate-900 mt-5 mb-2.5 tracking-tight border-b border-slate-100 pb-1.5">{formatInline(trimmed.slice(3))}</h2>);
    } else if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-bold text-slate-800 mt-4 mb-2">{formatInline(trimmed.slice(4))}</h3>);
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="pl-4 py-1 my-3 border-l-4 border-indigo-500 bg-indigo-50/40 text-slate-700 italic rounded-r-lg text-sm">
          {formatInline(trimmed.slice(2))}
        </blockquote>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-5 list-disc text-slate-700 text-sm sm:text-base leading-relaxed my-1">
          {formatInline(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <li key={i} className="ml-5 list-decimal text-slate-700 text-sm sm:text-base leading-relaxed my-1">
          {formatInline(text)}
        </li>
      );
    } else if (trimmed === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-slate-700 text-sm sm:text-base leading-relaxed my-1.5">{formatInline(line)}</p>);
    }
  });

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-end" className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-xs font-mono my-3 border border-slate-800">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}
