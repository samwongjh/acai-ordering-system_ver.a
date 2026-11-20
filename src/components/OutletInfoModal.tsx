import { useState } from 'react';
import { Check, Clock, Copy, MapPin, ShieldCheck, Tag, X } from 'lucide-react';
import type { OutletInfo } from '../types.ts';

interface OutletInfoModalProps {
  open: boolean;
  outlet: OutletInfo;
  onClose: () => void;
}

export function OutletInfoModal({ open, outlet, onClose }: OutletInfoModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!open) return null;

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Outlet information"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-[#5B2378]">{outlet.branch}</p>
            <h2 className="font-display text-xl font-bold text-[#1C1523]">
              {outlet.brand}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close store info"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#1C1523] hover:bg-[#F3EFEA] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-[#1C1523]">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#5B2378] mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{outlet.address}</p>
              <p className="text-xs text-[#665E6E]">{outlet.postalCode}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#5B2378] mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{outlet.hours}</p>
              <p className="text-xs text-[#665E6E]">
                Last QSR order accepted at 9:45 PM daily
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#5B2378] mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">100% Organic Brazilian Açaí Base</p>
              <p className="text-xs text-[#665E6E]">
                Our signature açaí sorbet is vegan, dairy-free, and refined-sugar-free. Oat milk available for Thirst Trap drinks.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#1C1523]/8 space-y-2.5">
          <h3 className="font-display text-sm font-bold text-[#1C1523] flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-[#5B2378]" />
            <span>Active BellyBelly Good Promos</span>
          </h3>
          {outlet.activePromos.map((promo) => (
            <div
              key={promo.code}
              className="p-3 rounded-xl bg-[#FAF9F7] border border-[#1C1523]/8 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-xs font-bold text-[#1C1523]">{promo.label}</p>
                <p className="text-[11px] text-[#665E6E]">{promo.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => copyCode(promo.code)}
                className="min-h-[36px] px-2.5 rounded-lg bg-white border border-[#1C1523]/12 text-xs font-mono font-semibold text-[#5B2378] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedCode === promo.code ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{promo.code}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
