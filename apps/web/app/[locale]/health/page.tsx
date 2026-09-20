import type { HealthResponse } from '@/components/health-status';
import HealthStatus from '@/components/health-status';

async function getHealthStatus(): Promise<HealthResponse> {
  try {
    const res = await fetch('http://localhost:4000/health', {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch health status');
    }
    const result = await res.json();
    return result;
  } catch (error) {
    console.error('Error fetching health status:', error);
    return {
      status: 'error',
      app: 'Error fetching health status:' + error,
      supabase: 'error',
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function HealthStatusPage() {
  const healthStatus = await getHealthStatus();

  return (
    <main className="flex grow flex-col items-center justify-center gap-8">
      <HealthStatus health={healthStatus} />
    </main>
  );
}
