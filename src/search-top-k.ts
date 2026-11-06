/** Keep the best K candidates without sorting an entire large result set. */
export class TopK<T> {
  private readonly values: T[] = [];
  private readonly limit: number;
  private readonly collectAll: boolean;

  /** compare(a,b) is negative when a should appear before b. */
  constructor(limit: number, maxPossible: number, private readonly compare: (a: T, b: T) => number) {
    this.limit = Number.isNaN(limit) ? 0 : Math.max(0, Math.floor(limit));
    this.collectAll = this.limit >= maxPossible;
  }

  add(value: T): void {
    if (!this.limit) return;
    if (this.collectAll) { this.values.push(value); return; }
    if (this.values.length < this.limit) {
      let index = this.values.length;
      this.values.push(value);
      // A max-heap keeps the currently worst accepted candidate at the root.
      while (index > 0) {
        const parent = (index - 1) >>> 1;
        if (this.compare(this.values[index]!, this.values[parent]!) <= 0) break;
        [this.values[index], this.values[parent]] = [this.values[parent]!, this.values[index]!];
        index = parent;
      }
      return;
    }
    if (this.compare(value, this.values[0]!) >= 0) return;
    this.values[0] = value;
    let index = 0;
    while (true) {
      const left = index * 2 + 1, right = left + 1;
      let worst = index;
      if (left < this.values.length && this.compare(this.values[left]!, this.values[worst]!) > 0) worst = left;
      if (right < this.values.length && this.compare(this.values[right]!, this.values[worst]!) > 0) worst = right;
      if (worst === index) break;
      [this.values[index], this.values[worst]] = [this.values[worst]!, this.values[index]!];
      index = worst;
    }
  }

  sorted(): T[] { return this.values.sort(this.compare); }
}
