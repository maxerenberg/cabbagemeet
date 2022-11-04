import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './env.validation';

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('CabbageMeet')
    .setDescription('CabbageMeet API desription')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
}

// TODO: use helmet in prod

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: ['redirect/google']
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: true, // this doesn't seem to have any effect...
      whitelist: true,
      forbidNonWhitelisted: true,
      // This ensures that the 'message' property of the error response
      // is a string, not an array
      exceptionFactory: (errors) =>
        new BadRequestException(Object.values(errors[0].constraints)[0]),
    }),
  );
  setupSwagger(app);
  const configService = app.get(ConfigService<EnvironmentVariables, true>);
  const port = configService.get('PORT', {infer: true});
  const host = configService.get('HOST', {infer: true});
  await app.listen(port, host);
}
bootstrap();
