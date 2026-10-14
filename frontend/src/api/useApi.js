import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from './client';

function isCancelled(error) {
  return error?.name === 'CanceledError' || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';
}


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