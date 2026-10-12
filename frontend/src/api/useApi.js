import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from './client';

function isCancelled(error) {
  return error?.name === 'CanceledError' || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';
}

/**
 * Loads data with `fn(signal)` and re-runs it when `deps` change.
 * - `deps` must be primitives (strings, numbers, booleans, null); they are compared by value.
 * - Return null/undefined from `fn` to skip loading (e.g. nothing selected yet).
 * - The in-flight request is aborted when deps change or the component unmounts.
 * Returns { data, loading, error, refetch }. `data` keeps the last result while reloading.
 */
export function useApi(fn, deps = []) {
  const fnRef = useRef(fn);
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    fnRef.current = fn;
  });

  const requestKey = `${JSON.stringify(deps)}#${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    Promise.resolve()
      .then(() => fnRef.current(controller.signal))
      .then(
        (data) => {
          if (active) setState({ key: requestKey, data: data ?? null, error: null });
        },
        (error) => {
          if (active && !isCancelled(error)) {
            setState((current) => ({ key: requestKey, data: current.data, error: getErrorMessage(error) }));
          }
        },
      );

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey]);

  const refetch = useCallback(() => setReloadCount((count) => count + 1), []);

  return {
    data: state.data,
    loading: state.key !== requestKey,
    error: state.key === requestKey ? state.error : null,
    refetch,
  };
}

/**
 * Wraps a mutating call such as a form submit.
 * - `submit(...args)` resolves with the result, or undefined if it failed (the message is in `error`).
 * - Calls made while one is in flight are ignored, so double clicks never double-submit.
 * Returns { submit, submitting, error, result, reset }.
 */
export function useSubmit(fn) {
  const fnRef = useRef(fn);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [state, setState] = useState({ submitting: false, error: null, result: null });

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = useCallback(async (...args) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setState({ submitting: true, error: null, result: null });

    try {
      const result = await fnRef.current(...args);
      if (mounted.current) setState({ submitting: false, error: null, result });
      return result;
    } catch (error) {
      if (mounted.current) setState({ submitting: false, error: getErrorMessage(error), result: null });
      return undefined;
    } finally {
      inFlight.current = false;
    }
  }, []);

  const reset = useCallback(() => setState({ submitting: false, error: null, result: null }), []);

  return { ...state, submit, reset };
}
