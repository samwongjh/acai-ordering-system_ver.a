import { Award, ChevronRight } from 'lucide-react';
import type { MemberAccount } from '../types.ts';

interface BellyClubSubHeaderProps {
  member: MemberAccount | null;
  isClubActive: boolean;
  onOpenBellyClub: () => void;
  onOpenSignUp: () => void;
}

export function BellyClubSubHeader({
  member,
  isClubActive,
  onOpenBellyClub,
  onOpenSignUp,
}: BellyClubSubHeaderProps) {
  return (
    <div className="bg-[#F3EFEA] border-b border-[#1C1523]/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenBellyClub}
          className="min-w-0 flex items-center gap-2 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B2378] rounded-lg py-0.5"
        >
          <Award className="w-4 h-4 text-[#5B2378] shrink-0" />
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs sm:text-sm">
            <span
              className={`font-display font-bold whitespace-nowrap ${
                isClubActive ? 'text-[#5B2378]' : 'text-[#1C1523] group-hover:text-[#5B2378]'
              }`}
            >
              Belly Club
            </span>
            <span className="text-[#665E6E] truncate">
              {member
                ? `${member.tier} · ${member.points} Belly Points available`
                : 'Earn Belly Points · Unlock Recruit, Warrior & Legend perks'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#665E6E] group-hover:text-[#5B2378] shrink-0 hidden sm:block" />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {!isClubActive && (
            <button
              type="button"
              onClick={onOpenBellyClub}
              className="hidden sm:inline-flex min-h-[36px] px-3 rounded-lg text-xs font-semibold text-[#1C1523] hover:text-[#5B2378] transition-colors whitespace-nowrap cursor-pointer"
            >
              View Perks
            </button>
          )}
          {member ? (
            <button
              type="button"
              onClick={onOpenBellyClub}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#1C1523] hover:bg-[#5B2378] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              My Belly Club
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSignUp}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#5B2378] hover:bg-[#491B61] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign-up Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
