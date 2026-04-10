type PerfMetric = {
  name: string;
  duration: number;
};

const PERF_LOGGING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_PERF_LOGS === "true";

export async function measureAsync<T>(
  name: string,
  work: () => PromiseLike<T> | T,
): Promise<{ result: T; metric: PerfMetric }> {
  const start = performance.now();
  const result = await work();
  const duration = performance.now() - start;

  return {
    result,
    metric: { name, duration },
  };
}

export function logPerf(scope: string, metrics: PerfMetric[], extra?: string): void {
  if (!PERF_LOGGING_ENABLED) return;

  const summary = metrics
    .map((metric) => `${metric.name}=${metric.duration.toFixed(1)}ms`)
    .join(" ");

  console.info(`[perf] ${scope} ${summary}${extra ? ` ${extra}` : ""}`);
}

export function toServerTiming(metrics: PerfMetric[]): string {
  return metrics
    .map((metric) => `${metric.name};dur=${metric.duration.toFixed(1)}`)
    .join(", ");
}
