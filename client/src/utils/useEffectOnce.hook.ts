import React, { useEffect, useRef } from "react";

// I've noticed some strange behaviour where a React component gets
// rendered twice very quickly, causing any useEffect
// functions to run twice *even if they have no dependencies*.
// The useState values (and any Redux selector values)
// don't change, but the useRef values will persist. So we will use that
// until we figure out what the underlying issue is.
export default function useEffectOnce(effect: React.EffectCallback, deps?: React.DependencyList) {
  const ran = useRef(false);
  const cleanup = useRef<ReturnType<React.EffectCallback>>(undefined);
  useEffect(() => {
    if (!ran.current) {
      cleanup.current = effect();
      ran.current = true;
    }
    return cleanup.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
