import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Dbconfig from './dbconfig.entity';

@Injectable()
export class DbconfigService {
  constructor(
    @InjectRepository(Dbconfig) private repository: Repository<Dbconfig>,
  ) {}

  async get(key: string): Promise<string | null> {
    const row = await this.repository.findOneBy({ Key: key });
    if (row === null) {
      return null;
    }
    return row.Value;
  }

  async set(key: string, value: string): Promise<void> {
    const row: Dbconfig = { Key: key, Value: value };
    await this.repository.save(row);
  }
}
