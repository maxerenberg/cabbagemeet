import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Miscallaneous key-value pairs which are managed by the server,
 * and should thus not be provided through the .env configuration.
 */
@Entity('Config')
export default class Dbconfig {
  @PrimaryColumn()
  Key: string;

  @Column()
  Value: string;
}
