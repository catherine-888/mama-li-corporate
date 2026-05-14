import { fetchBundles, fetchSettings } from '@/lib/content';
import LandingClient from './landing-client';

export default async function LandingPage() {
  const [bundles, settings] = await Promise.all([fetchBundles(), fetchSettings()]);
  return <LandingClient bundles={bundles} settings={settings} />;
}
