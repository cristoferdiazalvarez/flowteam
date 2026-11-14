import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'FlowTeam — A little more flow.',
  description: 'A considered space for teams to plan, collaborate, and do their best work.',
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
