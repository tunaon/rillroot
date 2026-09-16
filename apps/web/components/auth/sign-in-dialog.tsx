'use client';

import { createClient } from '@/lib/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@rillroot/ui/components/button';
import {
  DrillDown,
  type DrillDownHandle,
  DrillDownView,
} from '@rillroot/ui/components/drill-down';
import { Icons } from '@rillroot/ui/components/icons';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@rillroot/ui/components/input-group';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@rillroot/ui/components/input-otp';
import { Marker, MarkerContent } from '@rillroot/ui/components/marker';
import ResponsiveDialog from '@rillroot/ui/components/responsive-dialog';
import { cn } from '@rillroot/ui/lib/utils';
import { ArrowLeft, LoaderCircle, Mail, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
}

const ICON_BUTTON =
  'grid size-8 place-items-center rounded-md text-muted-foreground transition-colors duration-220 ease-soft hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const CODE_LENGTH = 6;

/** Supabase SMTP 설정의 Minimum interval per user와 같은 값이어야 한다. */
const RESEND_INTERVAL_SECONDS = 60;

/** Supabase 이메일 설정의 Email OTP expiration과 같은 값이어야 한다. */
const CODE_TTL_MS = 600 * 1000;

/** 앞뒤 공백을 잘라낸 뒤 최상위 도메인까지 갖춘 주소만 통과시킨다. */
const emailSchema = z.object({
  email: z.string().trim().pipe(z.email()),
});

type EmailFormValues = z.infer<typeof emailSchema>;

export default function SignInDialog({ open, onOpenChange }: Props) {
  const t = useTranslations('auth');
  const router = useRouter();
  // 언어 접두사가 붙은 경로 그대로가 로그인 후 돌아올 자리다.
  const pathname = usePathname();
  const drill = useRef<DrillDownHandle>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    // 입력하는 동안 제출 버튼을 켜고 꺼야 하므로 매 입력마다 검증한다.
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const [supabase] = useState(createClient);
  // 마지막으로 코드를 보낸 주소와 시각. 발송에 성공한 순간 함께 기록되며,
  // 재발송 간격과 코드 만료를 이 기록으로 판단한다.
  const [lastSent, setLastSent] = useState<{
    address: string;
    at: number;
  } | null>(null);
  // 코드 화면에서는 주소를 바꿀 수 없으므로 발송 시점의 주소를 그대로 쓴다.
  const address = lastSent?.address ?? '';

  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 다시 보낼 수 있을 때까지 남은 초. 서버의 주소별 발송 간격과 같은 기준으로 센다.
  const remaining =
    lastSent === null
      ? 0
      : Math.max(
          0,
          RESEND_INTERVAL_SECONDS - Math.floor((now - lastSent.at) / 1000)
        );
  const counting = remaining > 0;

  // 남은 시간이 있는 동안에만 1초마다 다시 그리고, 0이 되면 타이머를 멈춘다.
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [counting]);

  const describe = (errorCode?: string) => {
    switch (errorCode) {
      case 'otp_expired':
        return t('errors.expiredCode');
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return t('errors.tooManyRequests');
      default:
        return t('errors.generic');
    }
  };

  const clearCode = () => {
    setCode('');
    setError(null);
  };

  const close = () => {
    onOpenChange(false);
    clearCode();
  };

  const back = () => {
    drill.current?.pop();
    clearCode();
  };

  /** @returns 발송에 성공했으면 true */
  const sendCode = async (target: string) => {
    setPending(true);
    setError(null);

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: target,
    });

    setPending(false);

    if (sendError) {
      setError(describe(sendError.code));
      return false;
    }

    // 남은 초가 곧바로 간격 전체로 계산되도록 두 시각을 같은 값으로 맞춘다.
    const timestamp = Date.now();
    setLastSent({ address: target, at: timestamp });
    setNow(timestamp);
    setCode('');
    return true;
  };

  // 버튼 클릭과 Enter가 모두 이 경로로 들어오고, 스키마를 통과한 값만 도착한다.
  const submitEmail = handleSubmit(async ({ email }) => {
    // 같은 주소로 보낸 코드가 아직 만료 전이면 다시 보내지 않는다.
    // 다시 보내면 주소별 발송 간격에 걸리고, 이미 받은 코드도 그대로 쓸 수 있다.
    const codeStillValid =
      lastSent !== null &&
      email === lastSent.address &&
      Date.now() - lastSent.at < CODE_TTL_MS;

    // 발송이 성공했을 때만 코드 화면으로 넘어간다. 실패하면 이 화면에서 오류를 보인다.
    if (codeStillValid || (await sendCode(email))) {
      drill.current?.push('code');
    }
  });

  // onComplete가 넘겨주는 값을 쓴다. 같은 틱에서는 code 상태가 아직 갱신 전이다.
  const verifyCode = async (value: string) => {
    setPending(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: address,
      token: value,
      type: 'email',
    });

    setPending(false);

    if (verifyError) {
      setError(describe(verifyError.code));
      return;
    }

    close();
    // 캐시에 남은 비회원 화면을 서버 렌더부터 다시 그린다.
    router.refresh();
  };

  const signInWithGoogle = async () => {
    setError(null);

    const next = encodeURIComponent(pathname);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${next}`,
      },
    });

    if (oauthError) {
      setError(describe(oauthError.code));
    }
  };

  // callback ref는 참조가 바뀌면 다시 호출되므로 참조를 고정한다.
  // 드릴다운 프레임이 마운트 직후 자기 자신에게 포커스를 옮기므로, 그보다 늦게
  // 첫 칸에 포커스를 줘야 전환이 끝나자마자 바로 입력할 수 있다.
  const focusOnMount = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      setTimeout(() => node.focus({ preventScroll: true }), 0);
    }
  }, []);

  const closeButton = (
    <button
      type="button"
      aria-label={t('close')}
      onClick={close}
      className={ICON_BUTTON}
    >
      <X className="size-4.5" />
    </button>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) clearCode();
      }}
      size="sm"
      bleed
      showCloseButton={false}
      onEscapeKeyDown={(event) => {
        // 코드 화면에서는 모달을 닫지 않고 이메일 화면으로 한 단계만 돌아간다.
        if (drill.current?.pop()) {
          event.preventDefault();
          clearCode();
        }
      }}
    >
      <DrillDown ref={drill}>
        <DrillDownView id="email" title={t('title')} trailing={closeButton}>
          <div className="flex flex-col gap-3 px-4 pt-5 pb-5">
            <Button
              variant="outline"
              onClick={signInWithGoogle}
              className="h-12"
            >
              <Icons.brand.google />
              {t('google')}
            </Button>

            <Marker variant="separator" className="text-xs">
              <MarkerContent>{t('or')}</MarkerContent>
            </Marker>

            {/* Enter 제출을 위해 폼으로 감싼다. 제출 버튼이 비활성이면 Enter도 막힌다. */}
            <form onSubmit={submitEmail} noValidate>
              <InputGroup className="h-12">
                <InputGroupAddon className="pl-2">
                  <span className="grid size-8 place-items-center rounded-md bg-foreground/8">
                    <Mail />
                  </span>
                </InputGroupAddon>
                <InputGroupInput
                  {...register('email')}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
                  aria-label={t('emailPlaceholder')}
                  className="h-full"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="submit"
                    size="sm"
                    disabled={!isValid || isSubmitting}
                    aria-label={t('submit')}
                    aria-busy={isSubmitting}
                    className="relative text-primary"
                  >
                    {/* 글자를 지우지 않고 숨겨야 스피너로 바뀌어도 입력칸 폭이 흔들리지 않는다. */}
                    <span className={cn(isSubmitting && 'invisible')}>
                      {t('submit')}
                    </span>
                    {isSubmitting && (
                      <LoaderCircle
                        aria-hidden="true"
                        className="absolute animate-spin"
                      />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </DrillDownView>

        <DrillDownView
          id="code"
          title={t('codeTitle')}
          leading={
            <button
              type="button"
              aria-label={t('changeEmail')}
              onClick={back}
              className={ICON_BUTTON}
            >
              <ArrowLeft className="size-4.5" />
            </button>
          }
          trailing={closeButton}
        >
          <div className="flex flex-col items-center gap-4 px-4 pt-6 pb-5 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-foreground/8 text-muted-foreground">
              <Mail className="size-6" />
            </span>

            <p className="text-sm text-muted-foreground">
              {t.rich('codeSentTo', {
                email: address,
                strong: (chunks) => (
                  <strong className="font-semibold text-foreground">
                    {chunks}
                  </strong>
                ),
              })}
            </p>

            <InputOTP
              ref={focusOnMount}
              value={code}
              onChange={setCode}
              onComplete={verifyCode}
              maxLength={CODE_LENGTH}
              disabled={pending}
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    // 기본 슬롯은 서로 붙은 사각형이라, 테두리와 크기를 덮어써 낱개 상자로 만든다.
                    className="size-11 rounded-md border text-lg"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm">
              <span className="text-muted-foreground">{t('noEmail')}</span>
              <button
                type="button"
                onClick={() => sendCode(address)}
                disabled={pending || counting}
                className="font-medium text-primary tabular-nums underline-offset-4 enabled:cursor-pointer enabled:hover:underline disabled:text-muted-foreground"
              >
                {counting ? t('resendIn', { seconds: remaining }) : t('resend')}
              </button>
            </div>
          </div>
        </DrillDownView>
      </DrillDown>
    </ResponsiveDialog>
  );
}
