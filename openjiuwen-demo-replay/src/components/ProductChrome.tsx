import { useRef } from "react";
import type { ProductLayer } from "../types";
import { LayerTabs } from "./LayerTabs";

interface NavProps {
  layer: ProductLayer;
  disabled: boolean;
  onChange: (layer: ProductLayer) => void;
}

export function ProductNav({ layer, disabled, onChange }: NavProps) {
  const guide = useRef<HTMLDialogElement>(null);
  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <nav className="product-nav" aria-label="主导航">
        <div className="nav-inner">
          <button className="brand" type="button" disabled={disabled} onClick={() => onChange("live")}>
            <picture><source media="(max-width: 560px)" srcSet="/icons/guard-brand-mobile.svg" /><img src="/icons/guard-brand.svg" width="28" height="28" alt="" /></picture>
            <span>转账前保镖</span>
          </button>
          <LayerTabs layer={layer} onChange={onChange} disabled={disabled} />
          <button className="guide-link" type="button" onClick={() => guide.current?.showModal()}>使用指南 <span aria-hidden="true">↗</span></button>
        </div>
      </nav>
      <dialog className="guide-dialog" ref={guide} aria-labelledby="guide-title">
        <div className="dialog-head"><h2 id="guide-title">转账前，多看一眼。</h2><form method="dialog"><button className="dialog-close" aria-label="关闭指南">×</button></form></div>
        <ol className="guide-steps">
          <li><strong>粘贴对话</strong><p>输入至少 20 字的聊天内容，请先隐去银行卡号、密码和验证码。</p></li>
          <li><strong>补充信息</strong><p>金额、收款方、可疑链接均为选填，提供更多上下文有助于分析。</p></li>
          <li><strong>查看检查结果</strong><p>点击「开始风险检查」后，内容将提交至你配置的分析服务。完成后可查看结论、核实建议和会商过程。</p></li>
        </ol>
        <p className="guide-note">没有准备好对话？「案例演示」可直接回放预录案例，无需启动分析服务。分析结论作为核实线索，不能代替真实身份和账户核验。</p>
        <form method="dialog"><button className="btn btn-primary">知道了</button></form>
      </dialog>
    </>
  );
}

export function CheckAside({ onDemo, disabled }: { onDemo: () => void; disabled?: boolean }) {
  return (
    <aside className="check-aside" aria-label="检查说明">
      <section className="info-card how-card">
        <img src="/icons/guard-check.svg" width="38" height="38" alt="" />
        <h2>多看一眼，安心一点。</h2>
        <ol className="how-steps">
          {[["读懂对话", "识别催促、冒充身份等可疑话术"], ["核对证据", "结合规则检查，让结论有据可查"], ["给出建议", "告诉你下一步可以怎样核实"]].map(([title, description], index) => (
            <li key={title}><span className="how-number">0{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></li>
          ))}
        </ol>
      </section>
      <section className="info-card tip-card"><h3>有人催你立刻转账？</h3><p>先停一下。通过你熟悉的官方渠道核实，不要使用对方提供的电话号码或链接。</p></section>
      <section className="info-card demo-card"><h3>还没有聊天内容？</h3><p>用一个真实场景，了解检查如何进行。</p><button className="text-button" type="button" onClick={onDemo} disabled={disabled}>看看案例演示 <span aria-hidden="true">→</span></button></section>
    </aside>
  );
}

export function SafetyNotes() {
  return (
    <section className="safety-notes" aria-labelledby="safety-title">
      <h2 id="safety-title">检查之前，记住这三件事</h2>
      <div className="safety-grid">
        {[["核实身份", "熟悉的头像，也需要确认。"], ["不被催促", "真正的安全，不需要争分夺秒。"], ["保护信息", "卡号、密码、验证码，请留给自己。"]].map(([title, description]) => <div key={title}><h3>{title}</h3><p>{description}</p></div>)}
      </div>
    </section>
  );
}
