'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { UPLOAD_ACCEPT_ATTR } from '@/lib/upload-rules';

/**
 * منطقة سحب وإفلات موثوقة. لا تعتمد على نوع MIME الذي يسلّمه المتصفح (قد يكون فارغاً للملف المسحوب)،
 * ولا ترفض الملف بصمت: كل ملف يُمرَّر إلى onFiles ويُتحقق منه بالامتداد مع رسالة واضحة.
 */
export function FileDrop({ onFiles, disabled, multiple = true, children, className, activeClassName, idleClassName, noClick }: {
  onFiles: (files: File[]) => void; disabled?: boolean; multiple?: boolean; children: (s: { active: boolean; open: () => void }) => ReactNode;
  className?: string; activeClassName?: string; idleClassName?: string; noClick?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [active, setActive] = useState(false);
  const open = useCallback(() => { if (!disabled) input.current?.click(); }, [disabled]);

  // يمنع المتصفح من فتح الملف المُفلَت خارج المنطقة بدل رفعه
  useEffect(() => {
    const stop = (e: DragEvent) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); };
    window.addEventListener('dragover', stop); window.addEventListener('drop', stop);
    return () => { window.removeEventListener('dragover', stop); window.removeEventListener('drop', stop); };
  }, []);

  const handle = (list: FileList | null) => { const files = list ? Array.from(list) : []; if (files.length) onFiles(multiple ? files : files.slice(0, 1)); };
  return (
    <div
      onClick={noClick ? undefined : open}
      onKeyDown={e => { if (!noClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
      role={noClick ? undefined : 'button'} tabIndex={noClick || disabled ? undefined : 0}
      onDragEnter={e => { if (disabled) return; e.preventDefault(); depth.current++; setActive(true); }}
      onDragOver={e => { if (disabled) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDragLeave={e => { if (disabled) return; e.preventDefault(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setActive(false); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); depth.current = 0; setActive(false); if (!disabled) handle(e.dataTransfer.files); }}
      className={cn(className, active ? activeClassName : idleClassName, disabled && 'opacity-60')}
    >
      <input ref={input} type="file" hidden multiple={multiple} accept={UPLOAD_ACCEPT_ATTR} onClick={e => e.stopPropagation()} onChange={e => { handle(e.target.files); e.target.value = ''; }} />
      {children({ active, open })}
    </div>
  );
}
