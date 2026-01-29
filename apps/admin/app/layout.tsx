import './globals.css';
import type { Metadata } from 'next';
import { ConvexClientProvider } from './ConvexClientProvider';
import { ToastProvider } from '../components/ui/Toast';

export const metadata: Metadata = {
  title: 'Kids Stories Admin',
  description: 'Admin panel for Kids Stories app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
