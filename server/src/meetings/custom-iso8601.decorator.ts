import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

// NOTE: the following time zones have quarterly offsets:
// * Nepal (GMT+5:45)
// * Eucla, Australia (GMT+8:45)
// * Chatham Islands, New Zealand (GMT+12:45/+13:45)

const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:(00|15|30|45):00Z$/;

export default function IsCustomISO8601String(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsCustomISO8601String',
      target: object.constructor,
      propertyName,
      constraints: ['isCustomISO8601String'],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string'
              && pattern.test(value)
              && Date.parse(value) !== NaN;
        }
      },
    });
  };
}
