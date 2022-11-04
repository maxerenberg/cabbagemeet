import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DeepPartial } from 'typeorm';
import User from 'src/users/user.entity';
import UsersService from 'src/users/users.service';

const SALT_ROUNDS = 11;

@Injectable()
export default class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (user === null) {
      return null;
    }
    if (!user.PasswordHash) {
      // Not present for users who signed up using OIDC
      return null;
    }
    if (!(await bcrypt.compare(password, user.PasswordHash))) {
      return null;
    }
    return user;
  }

  async signup(name: string, email: string, password: string): Promise<User> {
    const user: DeepPartial<User> = {
      Name: name,
      Email: email,
      PasswordHash: await bcrypt.hash(password, SALT_ROUNDS),
    };
    return this.usersService.create(user);
  }
}
