import type { ReactNode } from "react";

// design.md §2·§4 공통 컴포넌트

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>{children}</div>;
}

// 카드 제목 (16px bold) + 보조 문구 (13px muted)
export function CardTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// 화면 머리: 뒤로 버튼(선택) + 제목 20px bold + 보조 설명 13px
export function ScreenHeader({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
  return (
    <header className="mb-4 border-b border-divider pb-3">
      <div className="flex items-center gap-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="처음 화면으로"
            className="-ml-2 flex h-11 w-9 items-center justify-center text-xl text-ink"
          >
            ‹
          </button>
        )}
        <h1 className="text-xl font-bold text-ink">{title}</h1>
      </div>
      {sub && <p className={`text-[13px] text-muted ${onBack ? "pl-7" : ""}`}>{sub}</p>}
    </header>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-primary disabled:text-faint";

export const textareaClass =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-primary";

// 숫자 입력 + 단위 표시 (칸 안쪽 오른쪽)
export function NumberInput({
  value,
  onChange,
  unit,
  placeholder,
  decimal = true,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        className={`${inputClass} ${unit ? "pr-12" : ""}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{unit}</span>}
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`h-12 w-full rounded-xl bg-primary px-4 text-[15px] font-bold text-white transition hover:bg-primary-dark active:bg-primary-dark disabled:bg-faint ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`h-12 w-full rounded-xl border border-primary bg-white px-4 text-[15px] font-bold text-primary transition hover:bg-primary-tint ${className}`}
    >
      {children}
    </button>
  );
}

// 덜 중요한 동작 (닫기 등)
export function GhostButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] font-bold text-muted transition hover:bg-surface ${className}`}
    >
      {children}
    </button>
  );
}

// 버튼식 단일 선택 (성별, 목표, 수준, 활동량)
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-10 rounded-[10px] border text-[15px] transition ${
              value === o.value
                ? "border-primary bg-primary-tint font-bold text-primary"
                : "border-line bg-surface text-ink hover:bg-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// 안내 문구 (참고용 등)
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-1.5 text-[13px] leading-snug text-muted">
      <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-faint text-[10px] font-bold text-faint">
        i
      </span>
      <span>{children}</span>
    </p>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-danger">{children}</p>;
}

// 큰 숫자 + 작은 단위 (통계 줄)
export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

// 팝업: 어두운 배경 + 가운데 시트 (제목, 스크롤 본문, 하단 버튼)
export function Modal({
  title,
  right,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  right?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[92vh] w-full flex-col rounded-2xl bg-white p-4 ${wide ? "max-w-5xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-baseline justify-between border-b border-divider pb-3">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {right}
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && <div className="mt-4 space-y-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Loading({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24">
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-divider">
        <div
          className="h-full w-1/3 rounded-full bg-primary"
          style={{ animation: "progress-slide 1.2s ease-in-out infinite" }}
        />
      </div>
      <p className="text-[15px] text-muted">{message}</p>
    </div>
  );
}

// 요일 글자색: 토 파랑, 일 빨강
export const dayColor = (day: string) => (day === "일" ? "text-sun" : day === "토" ? "text-sat" : "text-ink");
