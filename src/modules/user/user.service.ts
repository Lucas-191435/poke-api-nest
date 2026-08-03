import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UserRepository } from './user.repository';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) { }

  async findUser(id: string) {
    const [user, stats] = await Promise.all([
      this.userRepository.findUserById(id),
      this.userRepository.getUserStats(id),
    ]);

    return { ...user, stats };
  }

  async findUsers(params: { page: string; pageSize: string; query?: string }) {
    const { page, pageSize, query } = params;

    return this.userRepository.findUsers({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      query,
    });
  }

  async createUser(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.userRepository.createUser({
      ...dto,
      password: hashedPassword,
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    return this.userRepository.updateUser({ id, ...dto });
  }

  async deleteUser(id: string) {
    return this.userRepository.deleteUser(id);
  }
}
