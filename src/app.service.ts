import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `
╔══════════════════════════════════════════╗
║           🎮  PokeAPI  NestJS            ║
║          by Lucas-191435  🧑‍💻            ║
╠══════════════════════════════════════════╣
║  ⚡ Status : Online                      ║
║  📖 Docs   : /api                        ║
║  🗄️  DB     : SQL + Prisma            ║
╚══════════════════════════════════════════╝
    `.trim();
  }
}
