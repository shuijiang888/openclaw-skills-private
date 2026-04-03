/** 演示环境：主数据/报价变更后广播，驱动各页 RSC 与客户端区块重拉 */
export const PROFIT_DATA_CHANGED = "profit-demo-data-changed";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * @param debounceMs 大于 0 时合并短时间内的多次调用（如连续改系数失焦），避免刷屏刷新
 */
export function dispatchProfitDataChanged(options?: { debounceMs?: number }) {
  if (typeof window === "undefined") return;
  const ms = options?.debounceMs ?? 0;
  const fire = () => {
    window.dispatchEvent(new CustomEvent(PROFIT_DATA_CHANGED));
  };
  if (ms <= 0) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    fire();
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    fire();
  }, ms);
}
