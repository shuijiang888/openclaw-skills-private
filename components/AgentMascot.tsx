import Image from "next/image";

const SRC = "/mascot/agent-mascot.png";

/** 智能体 / 报价助手形象（吉祥物） */
export function AgentMascot({
  size = 72,
  className = "",
}: {
  /** 近似显示高度（px），宽度随比例自适应 */
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={SRC}
      alt="报价智能体助手"
      width={Math.round(size * 0.85)}
      height={size}
      className={`shrink-0 object-contain object-bottom drop-shadow-md ${className}`}
      priority={false}
    />
  );
}
