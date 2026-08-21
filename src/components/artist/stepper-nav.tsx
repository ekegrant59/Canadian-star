'use client';

import type { ApplicationStepIndex } from './artist-sidebar';

interface StepperNavProps {
  currentStep: ApplicationStepIndex;
  onSelectStep: (step: ApplicationStepIndex) => void;
}

const STEPS = [
  { step: 1 as ApplicationStepIndex, num: '01', title: 'Artist Information' },
  { step: 2 as ApplicationStepIndex, num: '02', title: 'Music & Media' },
  { step: 3 as ApplicationStepIndex, num: '03', title: 'Availability' },
  { step: 4 as ApplicationStepIndex, num: '04', title: 'Review' },
];

export function StepperNav({ currentStep, onSelectStep }: StepperNavProps) {
  if (currentStep === 5) return null;

  return (
    <nav className="desktop-app-stepper no-scrollbar" aria-label="Application progress">
      {STEPS.map((s, index) => {
        const isActive = currentStep === s.step;
        const isCompleted = currentStep > s.step;

        return (
          <div key={s.step} className="flex items-center gap-4">
            <button
              type="button"
              className={`stepper-step ${isActive ? 'active' : ''} ${
                isCompleted ? 'completed' : ''
              }`}
              onClick={() => onSelectStep(s.step)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="stepper-num">{s.num}</span>
              <span>{s.title}</span>
            </button>
            {index < STEPS.length - 1 && <div className="stepper-line" aria-hidden="true" />}
          </div>
        );
      })}
    </nav>
  );
}
