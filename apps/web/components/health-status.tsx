'use client';

import { Link } from '@/i18n/navigation';
import { Badge } from '@rillroot/ui/components/badge';
import { Button } from '@rillroot/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rillroot/ui/components/card';
import { cn } from '@rillroot/ui/lib/utils';
import { useTranslations } from 'next-intl';

export interface HealthResponse {
  status: string;
  app: string;
  supabase: string;
  timestamp: string;
}
interface Props {
  health: HealthResponse;
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const variant =
    status === 'ok' || status === 'connected'
      ? 'success'
      : status === 'disconnected'
        ? 'destructive'
        : 'warning';
  const classes =
    variant === 'success'
      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
      : variant === 'destructive'
        ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
        : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  return (
    <div className={cn('flex items-center justify-between')}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge className={classes}>{status}</Badge>
    </div>
  );
}

export default function HealthStatus({ health }: Props) {
  const t = useTranslations();

  if (health.status === 'error') {
    return (
      <div className="w-full max-w-sm flex flex-col gap-3">
        <Card className="rounded-md border border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t('health.apiConnectionFailed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{health.app}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="w-full max-w-sm flex flex-col gap-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="outline" className="w-fit py-1 px-4">
            <Link href="/">{t('common.home')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>{t('health.healthCheck')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusBadge label={t('health.api')} status={health.status} />
          <StatusBadge label={t('health.supabase')} status={health.supabase} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('health.app')}
            </span>
            <span className="text-sm font-medium">{health.app}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('health.time')}
            </span>
            <span className="text-sm font-medium">
              {new Date(health.timestamp).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" className="w-fit py-1 px-4">
          <Link href="/">{t('common.home')}</Link>
        </Button>
      </div>
    </div>
  );
}
