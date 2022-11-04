import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export default function IsStartOfQuarterHourInterval(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsStartOfQuarterHourInterval',
      target: object.constructor,
      propertyName,
      constraints: ['isStartOfQuarterHourInterval'],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'number'
              && value >= 0
              && value < 24
              && (
                Number.isInteger(value)
                || value - Math.floor(value) === 0.25
                || value - Math.floor(value) === 0.5
                || value - Math.floor(value) === 0.75
              );
        }
      },
    });
  }
}
