import React from "react";

/**
 * Each string MUST have the format YYYY-MM-DDTHH:mm:ssZ
 */
 export type DateTimeSet = {
  [dateTime: string]: true,
};

/**
 * Each string MUST have the format YYYY-MM-DD
 */
export type DateSet = {
  [date: string]: true,
};

/**
 * A mapping of user IDs to ISO 8601 strings (including TZ info).
 * e.g. {'bob': ['2022-09-01T06:00:00Z', '2022-09-01T09:30:00Z']}.
 * Each string MUST be a multiple of 30 minutes.
 * Each string MUST have the format YYYY-MM-DDTHH:mm:ssZ.
 * Do NOT use the built-in Javascript Date.toISOString() method,
 * as this adds millisecond information (which we do not need).
 */
export type PeopleDateTimesFlat = {
  [userID: string]: string[],
};

export type PeopleDateTimes = {
  [userID: string]: DateTimeSet
};

export type PeopleInfo = {
  [userID: string]: {
    name: string;
  },
};

export type Style = React.CSSProperties;

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';
