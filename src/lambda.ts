import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import serverlessExpress from '@vendia/serverless-express';
import { Handler, Context } from 'aws-lambda';
import express from 'express';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  if (!cachedServer) {
    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] }
    );

    // Enable CORS
    nestApp.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    });

    // Global API prefix
    nestApp.setGlobalPrefix('api');

    // Global validation pipe
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await nestApp.init();

    cachedServer = serverlessExpress({ app: expressApp });
  }

  return cachedServer;
}

export const handler = async (event: any, context: any, callback: any) => {
  // Set callbackWaitsForEmptyEventLoop to false to allow connections to be reused
  context.callbackWaitsForEmptyEventLoop = false;

  const server = await bootstrapServer();
  return server(event, context, callback);
};
