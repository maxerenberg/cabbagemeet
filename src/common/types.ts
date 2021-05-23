import React from "react";

export type DateTimes = {
  [date: string]: number[],
};

export type PeopleDateTimes = {
  [person: string]: DateTimes,
};

export type Style = React.CSSProperties;
