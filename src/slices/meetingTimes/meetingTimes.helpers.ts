import type { PeopleDateTimes, PeopleDateTimesFlat } from 'common/types';
import { arrayToObject } from 'utils/arrays';

export function PeopleDateTimesFlatToPeopleDateTimes(peopleDateTimesFlat: PeopleDateTimesFlat): PeopleDateTimes {
  const peopleDateTimes: PeopleDateTimes = {};
  for (const [person, dateTimesFlat] of Object.entries(peopleDateTimesFlat)) {
    peopleDateTimes[person] = arrayToObject(dateTimesFlat);
  }
  return peopleDateTimes;
}
