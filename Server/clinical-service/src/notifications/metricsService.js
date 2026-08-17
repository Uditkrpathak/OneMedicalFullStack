/**
 * In-memory & Prometheus-ready Metrics Service for Notifications
 */
class MetricsService {
  constructor() {
    this.counters = {
      'notifications.created': 0,
      'notifications.delivered': 0,
      'notifications.failed': 0,
      'notifications.retried': 0,
      'push.sent': 0,
      'push.failed': 0,
      'email.sent': 0,
      'email.failed': 0,
      'sms.sent': 0,
      'sms.failed': 0,
      'realtime.emitted': 0,
    };
    this.latencies = [];
    this.recentTraces = [];
    this.maxTraces = 50;
  }

  increment(metric, value = 1) {
    if (this.counters[metric] !== undefined) {
      this.counters[metric] += value;
    } else {
      this.counters[metric] = value;
    }
  }

  recordLatency(ms) {
    if (typeof ms === 'number') {
      this.latencies.push(ms);
      if (this.latencies.length > 200) {
        this.latencies.shift();
      }
    }
  }

  recordTrace(trace) {
    this.recentTraces.unshift({
      ...trace,
      timestamp: new Date().toISOString(),
    });
    if (this.recentTraces.length > this.maxTraces) {
      this.recentTraces.pop();
    }
  }

  getMetrics() {
    const avgLatency = this.latencies.length > 0
      ? (this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length).toFixed(2)
      : 0;

    return {
      counters: { ...this.counters },
      performance: {
        samples: this.latencies.length,
        avgLatencyMs: Number(avgLatency),
        minLatencyMs: this.latencies.length ? Math.min(...this.latencies) : 0,
        maxLatencyMs: this.latencies.length ? Math.max(...this.latencies) : 0,
      },
      recentTraces: this.recentTraces.slice(0, 10),
      timestamp: new Date().toISOString(),
    };
  }
}

export const metricsService = new MetricsService();
