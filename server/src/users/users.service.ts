import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { normalizeDBError, UniqueConstraintFailed } from '../database.utils';
import { oauth2ProviderNamesMap, oauth2TableNames } from '../oauth2/oauth2-common';
import OAuth2Service from '../oauth2/oauth2.service';
import { Repository } from 'typeorm';
import User from './user.entity';

export class UserAlreadyExistsError extends Error {}

const columnsForGetUser = [
  'User',
  ...Object.values(oauth2ProviderNamesMap).map(
    (name) => `${name}OAuth2.LinkedCalendar`,
  ),
];

export function selectUserLeftJoinOAuth2Tables(repository: Repository<User>) {
  let query = repository.createQueryBuilder('User').select(columnsForGetUser);
  for (const tableName of oauth2TableNames) {
    // e.g. leftJoin('User.GoogleOAuth2', 'GoogleOAuth2')
    query = query.leftJoin(`User.${tableName}`, tableName);
  }
  return query;
}

@Injectable()
export default class UsersService {
  private oauth2Service: OAuth2Service;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // circular dependency
    this.oauth2Service = this.moduleRef.get(OAuth2Service, { strict: false });
  }

  async updateTimestamp(user: User, timestamp: number) {
    if (
      user.TimestampOfEarliestValidToken !== null &&
      timestamp >= user.TimestampOfEarliestValidToken
    ) {
      // We want to store the earliest timestamp for which a token could possibly
      // be valid (anything older than it will be considered invalid).
      return;
    }
    await this.userRepository.update(
      { ID: user.ID },
      { TimestampOfEarliestValidToken: timestamp },
    );
  }

  async invalidateTimestamp(userID: number) {
    await this.userRepository.update(
      { ID: userID },
      { TimestampOfEarliestValidToken: null },
    );
  }

  async findOneByID(userID: number): Promise<User | null> {
    return selectUserLeftJoinOAuth2Tables(this.userRepository)
      .where('User.ID = :userID', { userID })
      .getOne();
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ Email: email });
  }

  async create(user: Partial<User>): Promise<User> {
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
    await this.oauth2Service.unlinkAllOAuth2Accounts(userID);
    await this.userRepository.delete(userID);
  }

  async editUser(userID: number, userInfo: Partial<User>): Promise<User> {
    await this.userRepository.update({ ID: userID }, userInfo);
    return this.findOneByID(userID);
  }
}
