import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class GetMessagesDto {
    @IsString()
    chatRoomId!: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number;
}
