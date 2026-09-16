import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard, type SignIn } from '../auth/auth.guard';
import { CurrentSignIn } from '../auth/current-sign-in.decorator';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  me(
    @CurrentUserId() userId: string,
    @CurrentSignIn() signIn: SignIn | null,
    @Headers('x-country') country?: string
  ) {
    return this.profilesService.findOrCreateById(userId, {
      country: readCountry(country),
      signIn,
    });
  }
}

/**
 * 웹 서버가 전달한 접속 국가를 읽는다. 배포 환경이 아니면 비어 있다.
 *
 * @param value x-country 헤더 값
 * @returns 두 글자 국가 코드, 형식이 맞지 않으면 null
 */
function readCountry(value: string | undefined): string | null {
  return value && /^[A-Z]{2}$/.test(value) ? value : null;
}
