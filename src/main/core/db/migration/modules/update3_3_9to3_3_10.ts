import { eq } from 'drizzle-orm';
import { db, client, schema } from '../../common';
import logger from '@main/core/logger';

// 版本 3.3.9 更新到 3.3.10 时，确保数据库结构和数据与新版本的要求相匹配。通过执行一系列的 SQL 操作和数据更新逻辑，脚本对数据库表结构进行了必要的调整
// 对特定的设置项进行了更新或插入操作，并记录了迁移完成的日志信息。这样可以保证应用在更新后能够正常运行，数据能够正确读取和写入。
const update = async () => {
  await client.exec(`
    ALTER TABLE tbl_history ALTER COLUMN "videoId" TYPE varchar(1024);
    ALTER TABLE tbl_history ALTER COLUMN "videoImage" TYPE varchar(1024);
    ALTER TABLE tbl_history ALTER COLUMN "videoIndex" TYPE varchar(510);
    ALTER TABLE tbl_history ALTER COLUMN "videoName" TYPE varchar(510);

    ALTER TABLE tbl_star ALTER COLUMN "videoId" TYPE varchar(1024);
    ALTER TABLE tbl_star ALTER COLUMN "videoImage" TYPE varchar(1024);
    ALTER TABLE tbl_star ALTER COLUMN "videoName" TYPE varchar(510);
    ALTER TABLE tbl_star ADD COLUMN date INTEGER;
    UPDATE tbl_star SET date = EXTRACT(EPOCH FROM now())::INTEGER;

    ALTER TABLE tbl_channel ALTER COLUMN url TYPE varchar(1024);
  `);

  const old_playerMode = await db.select().from(schema.setting).where(eq(schema.setting.key, 'playerMode'));
  if (old_playerMode.length > 0) {
    const old_playerModeValue: any = old_playerMode[0].value;
    if (['dplayer', 'nplayer'].includes(old_playerModeValue.data.type)) {
      old_playerModeValue.data.type = 'artplayer';
      await db.update(schema.setting).set({ value: old_playerModeValue }).where(eq(schema.setting.key, 'playerMode'));
    }
  }

  const old_defaultFilterType = await db.select().from(schema.setting).where(eq(schema.setting.key, 'defaultFilterType'));
  if (old_defaultFilterType.length > 0) {
    // @ts-ignore
    const defaultFilterTypeValue = old_defaultFilterType[0].value.data === 'on' ? true : false;
    await db.update(schema.setting).set({ value: { data: defaultFilterTypeValue } }).where(eq(schema.setting.key, 'defaultFilterType'));
  } else {
    await db.insert(schema.setting).values({ key: 'defaultFilterType', value: { data: false } });
  }

  const old_version = await db.select().from(schema.setting).where(eq(schema.setting.key, 'version'));
  if (old_version.length > 0) {
    await db.delete(schema.setting).where(eq(schema.setting.key, 'version'));
  }
  await db.insert(schema.setting).values({ key: 'version', value: { data: '3.3.10' } });

  logger.info('[db][magrite][update3_3_9to3_3_10]completed');
};

export default update;
