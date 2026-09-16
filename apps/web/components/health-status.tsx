'use client';

import { Link } from '@/i18n/navigation';
import { type Theme, isTheme } from '@rillroot/shared';
import { Badge } from '@rillroot/ui/components/badge';
import { Button } from '@rillroot/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rillroot/ui/components/card';
import { Progress } from '@rillroot/ui/components/progress';
import { cn } from '@rillroot/ui/lib/utils';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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

const TOAST_SAMPLES = [
  { label: 'normal', fire: () => toast('Normal toast') },
  { label: 'info', fire: () => toast.info('Info toast') },
  { label: 'success', fire: () => toast.success('Success toast') },
  { label: 'warning', fire: () => toast.warning('Warning toast') },
  { label: 'error', fire: () => toast.error('Error toast') },
  {
    label: 'loading',
    fire: () => toast.loading('Loading toast', { duration: 2000 }),
  },
  {
    label: 'description',
    fire: () =>
      toast('Toast with description', {
        description: 'Sonner supports a secondary line of text.',
      }),
  },
  {
    label: 'action',
    fire: () =>
      toast('Toast with action', {
        action: { label: 'Undo', onClick: () => toast.success('Undone') },
      }),
  },
];

export default function HealthStatus({ health }: Props) {
  const t = useTranslations();
  const { setTheme, theme } = useTheme();

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((v) => (v >= 100 ? 0 : v + 10));
    }, 300);
    return () => clearInterval(id);
  }, []);

  const setThemeWithTransition = (nextTheme: Theme) => {
    const anyDoc = document;
    if (anyDoc.startViewTransition) {
      anyDoc.startViewTransition(() => setTheme(nextTheme));
    } else {
      setTheme(nextTheme);
    }
  };

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
          <StatusBadge label={t('health.database')} status={health.supabase} />
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

      <div className="flex flex-wrap justify-center gap-2">
        {TOAST_SAMPLES.map(({ label, fire }) => (
          <Button key={label} variant="outline" size="sm" onClick={fire}>
            {label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1" />
        <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
          {progress}%
        </span>
      </div>

      <div className="flex justify-center items-center">
        <Button
          variant="default"
          className="cursor-pointer p-0.5"
          value={theme}
          onClick={({ currentTarget: { value } }) =>
            isTheme(value) &&
            setThemeWithTransition(value === 'light' ? 'dark' : 'light')
          }
        >
          {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
        </Button>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" className="w-fit py-1 px-4">
          <Link href="/">{t('common.home')}</Link>
        </Button>
      </div>
    </div>
  );
}
