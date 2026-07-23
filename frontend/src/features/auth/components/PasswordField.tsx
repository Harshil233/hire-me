import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { scorePassword } from '@/lib/password-strength';

export interface PasswordFieldProps {
  readonly label: string;
  readonly registration: UseFormRegisterReturn;
  readonly error?: string | undefined;
  readonly autoComplete?: string;
  /** Renders the live strength meter (sign-up only). */
  readonly showStrength?: boolean;
  readonly value?: string;
}

export const PasswordField = ({
  label,
  registration,
  error,
  autoComplete = 'current-password',
  showStrength = false,
  value = '',
}: PasswordFieldProps): React.JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);
  const strength = scorePassword(value);

  return (
    <FormField label={label} error={error} isRequired>
      {(fieldProps) => (
        <div>
          <div className="relative">
            <TextInput
              {...registration}
              {...fieldProps}
              type={isVisible ? 'text' : 'password'}
              autoComplete={autoComplete}
              isInvalid={error !== undefined}
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => {
                setIsVisible((previous) => !previous);
              }}
              aria-pressed={isVisible}
              className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-fg-muted transition hover:text-fg"
            >
              {isVisible ? 'Hide' : 'Show'}
            </button>
          </div>

          {showStrength && value !== '' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                <div
                  className={`h-full rounded-full transition-all ${strength.toneClass}`}
                  style={{ width: `${(strength.score / strength.maxScore) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-fg-muted">{strength.label}</span>
            </div>
          )}
        </div>
      )}
    </FormField>
  );
};
