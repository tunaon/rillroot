import {
  type CreatePostRequest,
  LANGUAGE_PATTERN,
  MAX_POST_SEGMENTS,
  MAX_SEGMENT_LENGTH,
  MAX_TITLE_LENGTH,
  type PostSegmentInput,
  type UpdatePostRequest,
} from '@rillroot/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Validate,
  ValidateNested,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/**
 * 발행이면 모든 조각에 공백이 아닌 글자가 있어야 한다. 초안은 빈 조각을 허용한다.
 * 조각이 문자열이든 { body } 객체든 같은 규칙을 적용한다.
 */
@ValidatorConstraint({ name: 'segmentsHaveTextToPublish' })
class SegmentsHaveTextToPublish implements ValidatorConstraintInterface {
  validate(segments: unknown, args: ValidationArguments): boolean {
    const { publish } = args.object as { publish?: unknown };

    if (publish !== true || !Array.isArray(segments)) {
      return true;
    }

    return segments.every((segment: unknown) => {
      const body =
        typeof segment === 'string'
          ? segment
          : (segment as { body?: unknown } | null)?.body;

      return typeof body === 'string' && body.trim().length > 0;
    });
  }

  defaultMessage(): string {
    return 'every segment must contain text to publish';
  }
}

/** 초안과 발행에 공통인 값. 언어는 형식만 보고, 제목은 비어 있으면 아예 보내지 않는다. */
abstract class PostBaseDto {
  @IsOptional()
  @IsString()
  @Matches(LANGUAGE_PATTERN)
  language?: string;

  @IsOptional()
  @IsString()
  @Length(1, MAX_TITLE_LENGTH)
  title?: string;

  @IsBoolean()
  publish!: boolean;
}

/** 새 글. 기존 조각이 없으므로 본문만 순서대로 받는다. */
export class CreatePostDto extends PostBaseDto implements CreatePostRequest {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_POST_SEGMENTS)
  @IsString({ each: true })
  @MaxLength(MAX_SEGMENT_LENGTH, { each: true })
  @Validate(SegmentsHaveTextToPublish)
  segments!: string[];
}

/** 초안 수정에 보내는 조각. 식별자가 있으면 그 조각을 고치고, 없으면 새 조각이다. */
export class PostSegmentInputDto implements PostSegmentInput {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(MAX_SEGMENT_LENGTH)
  body!: string;
}

/** 초안 수정. 본문 전체가 초안을 대체하며, 목록에서 빠진 조각은 지워진다. */
export class UpdatePostDto extends PostBaseDto implements UpdatePostRequest {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_POST_SEGMENTS)
  @ValidateNested({ each: true })
  @Type(() => PostSegmentInputDto)
  @Validate(SegmentsHaveTextToPublish)
  segments!: PostSegmentInputDto[];
}
