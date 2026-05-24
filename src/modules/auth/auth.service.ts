import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getHello(): string {
    return 'Hello World!';
  }

  login(email: string, password: string): string {
    return 'Hello World!';
  }
}
