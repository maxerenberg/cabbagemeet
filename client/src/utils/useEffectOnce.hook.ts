import { useEffect, useRef } from "react";

// This is a hack to work around the fact that useEffect runs twice
// (even with no dependencies) in StrictMode.
// See https://stackoverflow.com/a/72238236.
export default function useEffectOnce(...args: Parameters<typeof useEffect>) {
  const [callback, deps] = args;
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    callback();
    ran.current = true;
  // eslint-disable-next-line
  }, deps);
}
