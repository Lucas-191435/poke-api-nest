import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/generated/prisma/enums';
import { ALLOW_TEST_ROLE_KEY } from '../auth/allow-test-role.decorator';

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class TestRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const { user, method } = context.switchToHttp().getRequest();

    if (!user || user.role !== Role.TEST) return true;
    if (!WRITE_METHODS.includes(method)) return true;

    const allowTestRole = this.reflector.getAllAndOverride<boolean>(ALLOW_TEST_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowTestRole) return true;

    throw new ForbiddenException('Contas de teste não podem criar, editar ou excluir recursos.');
  }
}
