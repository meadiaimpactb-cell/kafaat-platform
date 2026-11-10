const G = <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>;
const F = <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" /></svg>;
const L = <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;

/** أزرار الدخول/التسجيل عبر Google وFacebook وLinkedIn */
export function SocialButtons({ next, verb = 'المتابعة' }: { next?: string; verb?: string }) {
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  const items = [['google', 'Google', G], ['facebook', 'Facebook', F], ['linkedin', 'LinkedIn', L]] as const;
  return (
    <div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />أو {verb} عبر<span className="h-px flex-1 bg-line" /></div>
      <div className="grid grid-cols-3 gap-3">
        {items.map(([k, name, icon]) => (
          // رابط عادي (وليس Link) لأن المسار يعيد التوجيه إلى موقع المزوّد
          <a key={k} href={`/api/auth/${k}${q}`} data-social={k} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-semibold text-ink-2 transition hover:border-forest-500 hover:bg-forest-50">{icon}<span className="hidden sm:inline">{name}</span></a>
        ))}
      </div>
    </div>
  );
}
