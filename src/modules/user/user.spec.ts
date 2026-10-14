import { BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

describe('CreateUserDto', () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const parse = (body: Record<string, unknown>) =>
        pipe.transform(body, { type: 'body', metatype: CreateUserDto }) as Promise<CreateUserDto>;

    const valid = { email: 'ash@poke.com', password: '123456', name: 'Ash', avatar: 'red' };

    it('aceita payload válido', async () => {
        await expect(parse(valid)).resolves.toMatchObject(valid);
    });

    it('remove campos fora do DTO (ex.: role)', async () => {
        const dto = await parse({ ...valid, role: 'ADMIN' });
        expect(dto).not.toHaveProperty('role');
    });

    it.each([
        ['e-mail inválido', { ...valid, email: 'ash' }],
        ['senha curta', { ...valid, password: '12345' }],
        ['senha ausente', { ...valid, password: undefined }],
        ['nome vazio', { ...valid, name: '' }],
        ['descrição acima de 160', { ...valid, description: 'a'.repeat(161) }],
    ])('rejeita %s', async (_, body) => {
        await expect(parse(body)).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('UpdateUserDto', () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });

    it('rejeita descrição acima de 160', async () => {
        await expect(
            pipe.transform({ description: 'a'.repeat(161) }, { type: 'body', metatype: UpdateUserDto }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('UserRepository.createUser', () => {
    const create = jest.fn();
    const repository = new UserRepository({ user: { create } } as unknown as PrismaService);
    const data = { email: 'ash@poke.com', password: 'hash', name: 'Ash' };

    beforeEach(() => create.mockReset());

    it('não seleciona a senha no retorno', async () => {
        create.mockResolvedValue({ id: '1', email: data.email, name: data.name });

        await repository.createUser(data);

        const { select } = create.mock.calls[0][0];
        expect(select.password).toBeUndefined();
        expect(select.email).toBe(true);
    });

    it('converte violação de unique (P2002) em 409', async () => {
        create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
        );

        await expect(repository.createUser(data)).rejects.toBeInstanceOf(ConflictException);
    });

    it('repassa outros erros', async () => {
        const error = new Error('db down');
        create.mockRejectedValue(error);

        await expect(repository.createUser(data)).rejects.toBe(error);
    });
});

describe('UserService.createUser', () => {
    it('salva a senha com hash', async () => {
        const createUser = jest.fn().mockResolvedValue({ id: '1' });
        const service = new UserService({ createUser } as unknown as UserRepository);

        await service.createUser({ email: 'ash@poke.com', password: '123456', name: 'Ash' });

        const saved = createUser.mock.calls[0][0];
        expect(saved.password).not.toBe('123456');
        await expect(bcrypt.compare('123456', saved.password)).resolves.toBe(true);
    });
});
