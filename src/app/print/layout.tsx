import type { ReactNode } from 'react';
export default function Layout({ children }: { children: ReactNode }) { return <div className="min-h-screen bg-[#e9ece6] print:bg-white">{children}</div>; }
