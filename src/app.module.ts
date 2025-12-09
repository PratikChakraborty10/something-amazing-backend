import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ContactsModule } from './contacts/contacts.module';
import { ContactListsModule } from './contact-lists/contact-lists.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        if (!databaseUrl) {
          console.warn('⚠️  DATABASE_URL not configured - database features will be unavailable');
        }
        
        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
          ssl: {
            rejectUnauthorized: false,
          },
          logging: process.env.NODE_ENV !== 'production',
          retryAttempts: 3,
          retryDelay: 3000,
          connectTimeoutMS: 10000,
          extra: {
            max: 10,
            connectionTimeoutMillis: 10000,
          },
        };
      },
    }),

    // Feature modules
    AuthModule,
    ProfileModule,
    ContactsModule,
    ContactListsModule,
    CampaignsModule,
    EmailTemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
