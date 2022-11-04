import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { normalizeDBError, UniqueConstraintFailed } from '../database.utils';
import OAuth2Service from '../oauth2/oauth2.service';
import { DeepPartial, Repository } from 'typeorm';
import User from './user.entity';

export class UserAlreadyExistsError extends Error {}

export const columnsForGetUser = ['User', 'GoogleOAuth2.LinkedCalendar'];

@Injectable()
export default class UsersService {
  private oauth2Service: OAuth2Service;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // circular dependency
    this.oauth2Service = this.moduleRef.get(OAuth2Service, {strict: false});
  }

  async findOneByID(userID: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder()
      .leftJoin('User.GoogleOAuth2', 'GoogleOAuth2')
      .select(columnsForGetUser)
      .where('User.ID = :userID', {userID})
      .getOne();
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ Email: email });
  }

  async create(user: DeepPartial<User>): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (err: any) {
      err = normalizeDBError(err as Error);
      if (err instanceof UniqueConstraintFailed) {
        throw new UserAlreadyExistsError();
      }
      throw err;
    }
  }

  async deleteUser(userID: number): Promise<void> {
    // Revoke and delete any OAuth2 credentials which we've stored for this user
    await this.oauth2Service.google_unlinkAccount(userID);
    await this.userRepository.delete(userID);
  }
}
