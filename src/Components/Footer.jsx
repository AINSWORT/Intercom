import mstarLogo from '@/assets/MstarLogo.png';

export default function Footer() {
  return (
    <footer className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground py-4">
      Desarrollado por
      <img src={mstarLogo} alt="MStar Software Labs" className="h-10 w-auto object-contain" />
      <span className="font-semibold">MStar Software Labs</span>
      {' · '}
      <a href="mailto:arcd2216@gmail.com" className="hover:underline hover:text-foreground transition-colors">
        arcd2216@gmail.com
      </a>
    </footer>
  );
}
