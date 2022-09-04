import React from "react";

/**
 * Each string MUST have the format YYYY-MM-DDTHH:mm:ssZ
 */
 export type DateTimeSet = {
  [dateTime: string]: true,
};

/**
 * A mapping of usernames to ISO 8601 strings (including TZ info).
 * e.g. {'bob': ['2022-09-01T06:00:00Z', '2022-09-01T09:30:00Z']}.
 * Each string MUST be a multiple of 30 minutes.
 * Each string MUST have the format YYYY-MM-DDTHH:mm:ssZ.
 * Do NOT use the built-in Javascript Date.toISOString() method,
 * as this adds millisecond information (which we do not need).
 */
export type PeopleDateTimesFlat = {
  [person: string]: string[],
};

export type PeopleDateTimes = {
  [person: string]: DateTimeSet
};

export type Style = React.CSSProperties;

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';
