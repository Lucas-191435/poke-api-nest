import { ApiProperty } from '@nestjs/swagger';

export class ChatUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  avatar!: string | null;
}

export class ChatMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  chatRoomId!: string;

  @ApiProperty({ nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({ type: ChatUserSummaryDto })
  user!: ChatUserSummaryDto;
}

export class GetMessagesResponseDto {
  @ApiProperty({ type: [ChatMessageDto] })
  messages!: ChatMessageDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}

export class ChatRoomDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
