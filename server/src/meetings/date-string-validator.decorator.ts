import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

const pattern = /\d{4}-\d{2}-\d{2}/;

export default function IsOnlyDateString(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsOnlyDateString',
      target: object.constructor,
      propertyName,
      constraints: ['isOnlyDateString'],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string'
              && pattern.test(value)
              && Date.parse(value) !== NaN;
        }
      },
    });
  }
}
