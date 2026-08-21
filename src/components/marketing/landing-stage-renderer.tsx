'use client';

import type { LandingStageViewModel, VotingArtist } from '@/types/landing';
import { ApplicationsStage } from './stages/applications-stage';
import { VotingStage } from './stages/voting-stage';
import { AnticipationStage } from './stages/anticipation-stage';
import { FinalistsStage } from './stages/finalists-stage';

interface LandingStageRendererProps {
  viewModel: LandingStageViewModel;
  onSelectArtist?: (artist: VotingArtist) => void;
  onVoteSubmit?: (artistId: string) => void;
  onCastVoteClick?: () => void;
}

export function LandingStageRenderer({
  viewModel,
  onSelectArtist,
  onVoteSubmit,
  onCastVoteClick,
}: LandingStageRendererProps) {
  const { stage, votingArtists, finalists, finalistShows, votingOpen, countdown } = viewModel;

  switch (stage) {
    case 'voting':
      return (
        <VotingStage
          artists={votingArtists ?? []}
          votingOpen={votingOpen ?? false}
          onSelectArtist={onSelectArtist}
          onVoteSubmit={onVoteSubmit}
        />
      );

    case 'anticipation':
      return (
        <AnticipationStage
          votingOpen={votingOpen ?? false}
          countdown={countdown}
          artists={votingArtists ?? []}
          onCastVoteClick={onCastVoteClick}
          onVoteSubmit={onVoteSubmit}
        />
      );

    case 'finalists':
      return (
        <FinalistsStage
          finalists={finalists ?? []}
          shows={finalistShows}
          grandFinal={viewModel.grandFinal ?? false}
        />
      );

    case 'applications':
    default:
      return <ApplicationsStage />;
  }
}
