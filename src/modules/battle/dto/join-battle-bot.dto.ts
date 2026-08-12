import { IsOptional, IsString } from 'class-validator';

export class JoinBattleBotDto {
    @IsOptional() @IsString() trainerId?: string;
}
