import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbconfigService } from './dbconfig.service';
import Dbconfig from './dbconfig.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dbconfig])],
  providers: [DbconfigService],
  exports: [DbconfigService],
})
export class DbconfigModule {}
