import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Alert } from '../Alert';
import { Button } from '../Button';
import { Card, EmptyState } from '../Card';
import { ChipsInput } from '../ChipsInput';
import { CompletionRing } from '../CompletionRing';
import { FormField } from '../FormField';
import { Modal } from '../Modal';
import { Select } from '../Select';
import { Skeleton, SectionSkeleton } from '../Skeleton';
import { Spinner } from '../Spinner';
import { TextArea, TextInput } from '../TextInput';

describe('Button', () => {
  it('calls its handler when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('blocks interaction and announces itself while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} isLoading>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('honours the disabled prop', () => {
    render(<Button disabled>Save</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>Save</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    },
  );
});

describe('Spinner and Skeleton', () => {
  it('announces the spinner to assistive technology', () => {
    render(<Spinner label="Loading profile" />);

    expect(screen.getByRole('status', { name: 'Loading profile' })).toBeInTheDocument();
  });

  it('renders placeholders', () => {
    const { container } = render(
      <>
        <Skeleton className="h-4" />
        <SectionSkeleton />
      </>,
    );

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});

describe('Alert', () => {
  it('uses the alert role for errors and status otherwise', () => {
    const { rerender } = render(<Alert tone="error">Something failed</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something failed');

    rerender(<Alert tone="success">Saved</Alert>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('renders an optional title', () => {
    render(
      <Alert tone="info" title="Heads up">
        Details
      </Alert>,
    );

    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });
});

describe('Card and EmptyState', () => {
  it('renders a heading, description and actions', () => {
    render(
      <Card title="Experience" description="Roles you held" actions={<button>Add</button>}>
        Body
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByText('Roles you held')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('renders body-only cards', () => {
    render(<Card>Body</Card>);

    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders an empty state with its call to action', () => {
    render(<EmptyState title="Nothing yet" description="Add one" action={<button>Add</button>} />);

    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

describe('FormField', () => {
  it('links the label, hint and control', () => {
    render(
      <FormField label="Email" hint="We never share it">
        {(fieldProps) => <TextInput {...fieldProps} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAccessibleDescription('We never share it');
  });

  it('marks the control invalid and describes the error', () => {
    render(
      <FormField label="Email" error="Enter a valid email" isRequired>
        {(fieldProps) => <TextInput {...fieldProps} isInvalid />}
      </FormField>,
    );

    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Enter a valid email/);
  });

  it('hides the hint once there is an error', () => {
    render(
      <FormField label="Email" hint="A hint" error="An error">
        {(fieldProps) => <TextInput {...fieldProps} />}
      </FormField>,
    );

    expect(screen.queryByText('A hint')).not.toBeInTheDocument();
  });
});

describe('TextArea and Select', () => {
  it('renders a textarea', async () => {
    render(<FormField label="About">{(fieldProps) => <TextArea {...fieldProps} />}</FormField>);

    await userEvent.type(screen.getByLabelText('About'), 'Hello');
    expect(screen.getByLabelText('About')).toHaveValue('Hello');
  });

  it('renders options with a placeholder', async () => {
    render(
      <FormField label="Gender">
        {(fieldProps) => (
          <Select
            {...fieldProps}
            placeholder="Select"
            options={[
              { value: 'female', label: 'Female' },
              { value: 'male', label: 'Male' },
            ]}
          />
        )}
      </FormField>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Gender'), 'female');
    expect(screen.getByLabelText('Gender')).toHaveValue('female');
    expect(screen.getByRole('option', { name: 'Select' })).toBeInTheDocument();
  });
});

describe('ChipsInput', () => {
  it('adds a chip on Enter', async () => {
    const onChange = vi.fn();
    render(<ChipsInput value={[]} onChange={onChange} placeholder="Add a skill" />);

    await userEvent.type(screen.getByPlaceholderText('Add a skill'), 'TypeScript{Enter}');

    expect(onChange).toHaveBeenCalledWith(['TypeScript']);
  });

  it('adds a chip on comma', async () => {
    const onChange = vi.fn();
    render(<ChipsInput value={[]} onChange={onChange} placeholder="Add" />);

    await userEvent.type(screen.getByPlaceholderText('Add'), 'Go,');

    expect(onChange).toHaveBeenCalledWith(['Go']);
  });

  it('ignores a duplicate regardless of case', async () => {
    const onChange = vi.fn();
    render(<ChipsInput value={['TypeScript']} onChange={onChange} placeholder="Add" />);

    await userEvent.type(screen.getByPlaceholderText('Add'), 'typescript{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores blank input', async () => {
    const onChange = vi.fn();
    render(<ChipsInput value={[]} onChange={onChange} placeholder="Add" />);

    await userEvent.type(screen.getByPlaceholderText('Add'), '   {Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a chip with its remove button', async () => {
    const onChange = vi.fn();
    render(<ChipsInput value={['React', 'Vue']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove React' }));

    expect(onChange).toHaveBeenCalledWith(['Vue']);
  });

  it('removes the last chip with Backspace on an empty field', async () => {
    const onChange = vi.fn();
    render(<ChipsInput value={['React', 'Vue']} onChange={onChange} placeholder="Add" />);

    await userEvent.type(screen.getByPlaceholderText('Add'), '{Backspace}');

    expect(onChange).toHaveBeenCalledWith(['React']);
  });

  it('stops accepting entries at the limit', () => {
    render(<ChipsInput value={['a', 'b']} onChange={vi.fn()} maxItems={2} />);

    expect(screen.getByPlaceholderText('Limit of 2 reached')).toBeDisabled();
  });
});

describe('CompletionRing', () => {
  it('renders the percentage and an accessible label', () => {
    render(<CompletionRing percentage={42} />);

    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Profile 42% complete' })).toBeInTheDocument();
  });

  it('clamps out-of-range values', () => {
    const { rerender } = render(<CompletionRing percentage={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();

    rerender(<CompletionRing percentage={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(
      <Modal isOpen={false} title="Add experience" onClose={vi.fn()}>
        Body
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders an accessible dialog when open', () => {
    render(
      <Modal isOpen title="Add experience" onClose={vi.fn()} footer={<button>Save</button>}>
        Body
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'Add experience' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen title="Add experience" onClose={onClose}>
        Body
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes from the close button and the backdrop', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen title="Add experience" onClose={onClose}>
        Body
      </Modal>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('locks background scrolling while open', () => {
    const { unmount } = render(
      <Modal isOpen title="Add experience" onClose={vi.fn()}>
        Body
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
