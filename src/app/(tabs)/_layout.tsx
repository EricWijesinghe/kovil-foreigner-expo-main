import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  return <AppTabs />;
}

// Render errors on this route show a recovery screen instead of closing the app.
export { CrashScreen as ErrorBoundary } from '@/components/crash-screen';
