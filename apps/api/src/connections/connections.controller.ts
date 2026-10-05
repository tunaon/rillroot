import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import {
  AuthorizeConnectionDto,
  CompleteConnectionDto,
} from './connections.dto';
import { ConnectionsService } from './connections.service';

/**
 * 외부 채널 계정 연동. 모든 경로가 인증을 요구한다.
 * 채널이 직접 부르는 복귀 경로는 ConnectionsCallbackController 에, 채널별 공개 문서는 채널 컨트롤러에 있다.
 */
@Controller('connections')
@UseGuards(AuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  /**
   * 내 연동 목록. 작성 화면이 열릴 때 읽어 채널 칩의 상태를 정한다.
   *
   * @param userId 검증된 토큰에서 얻은 사용자 id
   * @returns 연동 목록. 토큰과 연동 설정은 담기지 않는다
   */
  @Get()
  mine(@CurrentUserId() userId: string) {
    return this.connectionsService.listMine(userId);
  }

  /**
   * 연동을 시작한다. 채널의 인가 주소를 만들어 돌려주고, 웹이 그 주소로 같은 탭을 보낸다.
   * 진행 중 시도와 돌아갈 경로는 이 호출 안에서 저장된다.
   *
   * @param userId 사용자 id
   * @param channel 채널 키. 연동이 열린 채널만 받는다
   * @param body 연동이 끝난 뒤 돌아갈 내부 경로
   * @returns 같은 탭을 보낼 주소
   */
  @Post(':channel/authorize')
  authorize(
    @CurrentUserId() userId: string,
    @Param('channel') channel: string,
    @Body() body: AuthorizeConnectionDto
  ) {
    return this.connectionsService.authorize(userId, channel, body);
  }

  /**
   * 연동을 끝낸다. 채널이 복귀 주소에 붙인 값을 웹 복귀 라우트가 서버에서 그대로 넘기면
   * 토큰을 교환해 연동 행을 만든다. 시도를 시작한 사용자만 부를 수 있다.
   *
   * @param userId 사용자 id
   * @param channel 채널 키
   * @param body 채널이 돌려보낸 값(state, code, iss, error)
   * @returns 만들어지거나 갱신된 연동과 돌아갈 경로
   */
  @Post(':channel/complete')
  complete(
    @CurrentUserId() userId: string,
    @Param('channel') channel: string,
    @Body() body: CompleteConnectionDto
  ) {
    return this.connectionsService.complete(userId, channel, body);
  }

  /**
   * 연동을 끊는다. 채널 쪽 세션을 취소하고 행을 지우며, 비밀은 트리거가 함께 지운다.
   * 화면은 마이페이지가 생길 때 붙는다.
   *
   * @param userId 사용자 id
   * @param id 연동 행 id
   */
  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.connectionsService.remove(userId, id);
  }
}
