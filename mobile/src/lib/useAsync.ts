/**
 * 비동기 한 번 호출하고 결과 / 로딩 / 에러 상태를 노출하는 작은 훅.
 * 화면 포커스에 다시 들어오면 갱신, 마운트 해제 시 안전하게 취소.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from './apiClient';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  refresh: () => void;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  /** fn 이 의존하는 외부 값 — 변하면 재실행. */
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const tick = useRef(0);

  const run = useCallback(() => {
    const myTick = ++tick.current;
    setLoading(true);
    setError(null);
    fn()
      .then((res) => {
        if (myTick !== tick.current) return;
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        if (myTick !== tick.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (myTick !== tick.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      tick.current++;
    };
  }, [run]);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run]),
  );

  return { data, loading, error, refresh: run };
}
