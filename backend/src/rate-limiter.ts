import { HttpException, HttpStatus } from '@nestjs/common';

// Fenêtre glissante en mémoire : remise à zéro au redémarrage et non partagée entre plusieurs instances.
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly maximum: number, private readonly windowInMs: number, private readonly message: string) {}

  // Refuse (429) si la clé a déjà atteint le maximum dans la fenêtre ; sinon compte cette tentative.
  consume(key: string) {
    this.check(key);
    this.record(key);
  }

  // Refuse (429) sans compter de tentative.
  check(key: string) {
    if (this.recent(key).length >= this.maximum) throw new HttpException(this.message, HttpStatus.TOO_MANY_REQUESTS);
  }

  record(key: string) {
    this.hits.set(key, [...this.recent(key), Date.now()]);
    if (this.hits.size > 10_000) this.prune();
  }

  clear(key: string) {
    this.hits.delete(key);
  }

  private recent(key: string) {
    const since = Date.now() - this.windowInMs;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > since);
    if (recent.length) this.hits.set(key, recent);
    else this.hits.delete(key);
    return recent;
  }

  private prune() {
    for (const key of this.hits.keys()) this.recent(key);
  }
}
