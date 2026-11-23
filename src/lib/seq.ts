/** Run async work in order. `Array.map` would start every promise before the first await finishes. */
export async function mapSeq<T, U>(items: readonly T[], fn: (item: T, index: number) => Promise<U> | U): Promise<U[]> {
  const out: U[] = [];
  for (let index = 0; index < items.length; index += 1) out.push(await fn(items[index] as T, index));
  return out;
}
