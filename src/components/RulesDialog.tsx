import { BookOpen, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useModalFocus } from './useModalFocus';
import { DIFFICULTIES } from '../domain/difficulties';

function RulesPanel({ onClose, dialogLabel }: { onClose: () => void; dialogLabel: string }) {
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(dialogRef, onClose);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
      >
        <button className="icon-button answer-close" type="button" onClick={onClose} aria-label="关闭">
          <X size={18} aria-hidden="true" />
        </button>
        <h2>规则</h2>
        <div className="rule-grid">
          <p>
            <span className="swatch correct" />绿色：属性完全一致。
          </p>
          <p>
            <span className="swatch close" />黄色：同区域、相近数值、同类 venue 或相近领域。
          </p>
          <p>
            <span className="swatch wrong" />灰色：属性不匹配。
          </p>
          <p>箭头：年份或引用数的目标值更高或更低。</p>
        </div>
        <h3>题库模式</h3>
        <div className="rule-grid">
          {DIFFICULTIES.map((difficulty) => (
            <p key={difficulty.key}>
              <strong>{difficulty.label}</strong>：{difficulty.description}
            </p>
          ))}
        </div>
        <h3>数据说明</h3>
        <div className="rule-grid">
          <p>引用数来自公开学术索引的带日期快照，不是实时排名。</p>
          <p>每篇论文的引用数检查日期会在答案弹窗中显示，题库信息由人工整理与复核。</p>
        </div>
      </section>
    </div>
  );
}

export default function RulesDialog({ trigger = 'rules' }: { trigger?: 'rules' | 'data' }) {
  const [open, setOpen] = useState(false);
  const isDataTrigger = trigger === 'data';

  return (
    <>
      <button
        className={isDataTrigger ? 'release-data-button' : 'game-action'}
        type="button"
        onClick={() => setOpen(true)}
      >
        {!isDataTrigger && <BookOpen size={16} aria-hidden="true" />}
        {isDataTrigger ? '数据说明' : '规则'}
      </button>
      {open && (
        <RulesPanel
          onClose={() => setOpen(false)}
          dialogLabel={isDataTrigger ? '游戏规则与数据说明' : '游戏规则'}
        />
      )}
    </>
  );
}
