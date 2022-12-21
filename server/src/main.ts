import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as morgan from 'morgan';
import { AppModule } from './app.module';
import { commonAppBootstrap } from './common-setup';
import ConfigService from './config/config.service';
import { isBooleanStringTrue } from './config/env.validation';

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('CabbageMeet')
    .setDescription('CabbageMeet API desription')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  commonAppBootstrap(app);
  setupSwagger(app);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV');
  const trustProxy = isBooleanStringTrue(configService.get('TRUST_PROXY'));
  if (trustProxy) {
    app.set('trust proxy', true);
  }
  // Note: in development, you will still see the X-Powered-By header in the browser.
  // This is being added by the Create-React-App server, not by Nest.
  app.disable('x-powered-by');
  app.use(morgan('combined'));
  app.use(
    helmet({
      // Setting a header to false prevents it from being set
      dnsPrefetchControl: false,
      hsts: nodeEnv !== 'development' && nodeEnv !== 'test',
    }),
  );
  const port = configService.get('PORT');
  const host = configService.get('HOST');
  await app.listen(port, host);
}
bootstrap();
