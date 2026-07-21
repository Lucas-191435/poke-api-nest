import { IsString, MinLength } from 'class-validator';

export class DeleteMessageDto {
    @IsString()
    roomId!: string;

    @IsString()
    @MinLength(1)
    messageId!: string;
}

