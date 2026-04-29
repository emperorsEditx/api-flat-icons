import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIconMetadataColumns1714300000000 implements MigrationInterface {
  name = 'AddIconMetadataColumns1714300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('icons', [
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'meta_title',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'meta_description',
        type: 'text',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('icons', 'meta_description');
    await queryRunner.dropColumn('icons', 'meta_title');
    await queryRunner.dropColumn('icons', 'description');
  }
}