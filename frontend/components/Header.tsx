import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Header() {
  const router = useRouter();
  const { locale } = router.query;
  const toggle = locale === 'de' ? 'en' : 'de';

  return (
    <header className="topnav">
      <div className="brand">SRH Ambassador</div>
      <nav>
        <Link href="/">Home</Link> | <Link href="/clubs">Clubs</Link> | <Link href="/news">News</Link> | <Link href="/events">Events</Link> | <Link href="/auth/signup">Sign up</Link>
      </nav>
      <div>
        <Link href={{ pathname: '/', query: { locale: toggle } }}>{toggle.toUpperCase()}</Link>
      </div>
      <style jsx>{`
        .topnav{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:var(--primary);color:white}
        a{color:white;margin:0 8px}
      `}</style>
    </header>
  );
}
