'use client';

import SignInDialog from '@/components/auth/sign-in-dialog';
import ProfileAvatar from '@/components/profile-avatar';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/providers/auth-context';
import { Button } from '@rillroot/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rillroot/ui/components/dropdown-menu';
import { cn } from '@rillroot/ui/lib/utils';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  className?: string;
}

export default function SignInButton({ className }: Props) {
  const t = useTranslations('auth');
  const router = useRouter();
  const profile = useProfile();

  const [signInOpen, setSignInOpen] = useState(false);

  const signOut = async () => {
    // scope를 주지 않으면 기본값이 global이라 다른 기기와 탭의 세션까지 끊긴다.
    await createClient().auth.signOut({ scope: 'local' });
    router.refresh();
  };

  if (!profile) {
    return (
      <div className={className}>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => setSignInOpen(true)}
        >
          {t('signIn')}
        </Button>
        <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      </div>
    );
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={profile.display_name}
            className={cn(
              'grid size-8.5 rounded-full',
              'transition-[scale] duration-220 ease-soft active:scale-[.95]',
              'focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-ring'
            )}
          >
            <ProfileAvatar id={profile.id} className="size-full" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate">{profile.display_name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              @{profile.handle}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={signOut}>
            <LogOut />
            {t('signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
