import { SetMetadata } from '@nestjs/common';

export const ALLOW_TEST_ROLE_KEY = 'allowTestRole';

// Libera uma rota de escrita (POST/PUT/PATCH/DELETE) para usuários com role TEST,
// que por padrão são bloqueados pelo TestRoleGuard.
export const AllowTestRole = () => SetMetadata(ALLOW_TEST_ROLE_KEY, true);
