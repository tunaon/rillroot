import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { CreatePostDto, UpdatePostDto } from './posts.dto';
import { PostsService } from './posts.service';

/**
 * 게시글 작성과 저장. 모든 경로가 인증을 요구한다.
 * 공개 조회는 노출 방식이 정해진 뒤에 붙는다.
 */
@Controller('posts')
@UseGuards(AuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: CreatePostDto) {
    return this.postsService.create(userId, body);
  }

  @Get('mine')
  mine(@CurrentUserId() userId: string) {
    return this.postsService.listMine(userId);
  }

  /** 본문이 초안 전체를 대체하므로 PUT 이다. */
  @Put(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePostDto
  ) {
    return this.postsService.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.postsService.remove(userId, id);
  }
}
