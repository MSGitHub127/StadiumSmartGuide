import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Stadium SmartGuide — FIFA World Cup 2026',
  description:
    'Real-time stadium navigation, crowd safety, and multilingual accessibility for World Cup 2026 fans.',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} dark scroll-smooth`}
    >
      <body className="bg-[#020617] text-slate-100 antialiased min-h-screen relative overflow-x-hidden font-sans">
        {/* Ambient background glow points */}
        <div className="pointer-events-none fixed inset-0 z-0 select-none">
          <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-emerald-500 focus:text-slate-950 focus:px-4 focus:py-2 focus:rounded-md font-medium text-xs tracking-wide shadow-lg shadow-emerald-500/20"
          >
            Skip to main content
          </a>
          {children}
        </div>
      </body>
    </html>
  );
}
