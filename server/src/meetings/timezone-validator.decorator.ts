import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Checks whether a timezone is a valid tz database timezone, e.g. "America/Toronto".
 * See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones.
 */
export default function IsTzDatabaseTimezone(
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsTzDatabaseTimezone',
      target: object.constructor,
      propertyName,
      constraints: ['isTzDatabaseTimezone'],
      options: {
        message: 'invalid timezone',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            typeof value === 'string' &&
            (value === 'UTC' || (value.includes('/') && isATimeZone(value)))
          );
        },
      },
    });
  };
}

function isATimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (err) {
    return false;
  }
}
