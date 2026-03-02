
import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../src/user/entities/user.entity';
import { Icon } from '../src/icons/entities/icon.entity';

dotenv.config();

async function checkDB() {
  console.log('🔍 Checking Database Connection...');
  console.log('Host:', process.env.DB_HOST);
  console.log('User:', process.env.DB_USERNAME);
  console.log('DB:', process.env.DB_NAME);

  try {
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Icon],
      synchronize: false,
    });

    console.log('✅ Connection established.');
    
    const start = Date.now();
    const users = await connection.getRepository(User).find();
    console.log(`✅ User count: ${users.length}`);
    users.forEach(u => console.log(` - [${u.id}] ${u.email} (${u.name})`));

    const iconCount = await connection.getRepository(Icon).count();
    console.log(`✅ Icon count: ${iconCount}`);

    await connection.close();
  } catch (error) {
    console.error('❌ DB Check Failed:', error.message);
  }
}

checkDB();
