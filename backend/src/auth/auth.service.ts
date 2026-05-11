import { Injectable, OnModuleInit, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface UserPayload {
  id: number;
  username: string;
  role: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  async validateUser(username: string, password: string): Promise<UserPayload | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return { id: user.id, username: user.username, role: user.role };
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload: UserPayload = { id: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async register(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username, password: hashedPassword, role: 'user' },
    });

    return { id: user.id, username: user.username, role: user.role };
  }

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, createdAt: true },
    });
  }

  private async createDefaultAdmin() {
    const admin = await this.prisma.user.findUnique({ where: { username: 'admin' } });
    if (!admin) {
      await this.register('admin', 'admin123');
      console.log('[Auth] 默认管理员账户已创建');
    }
  }
}
