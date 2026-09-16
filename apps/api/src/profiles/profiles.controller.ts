import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { toCountryCode } from '@rillroot/shared';
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
      // 사용자가 헤더를 직접 넣을 수 있으므로 실재하는 국가 코드만 받는다.
      country: toCountryCode(country),
      signIn,
    });
  }
}
