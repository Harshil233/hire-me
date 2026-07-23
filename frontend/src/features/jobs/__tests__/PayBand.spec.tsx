import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PayBand } from '../components/PayBand';
import { payScaleOf } from '../utils/pay-scale';

const SCALE = { min: 1_000_000, max: 3_000_000 };

/** The rendered fill, whose geometry is the whole point of the component. */
const fillStyle = (): CSSStyleDeclaration => {
  const track = screen.getByRole('img');
  const fill = track.querySelector('span');

  if (fill === null) {
    throw new Error('the band rendered no fill');
  }
  return fill.style;
};

describe('payScaleOf', () => {
  it('spans the lowest and highest figure on the page', () => {
    expect(
      payScaleOf([
        { ctcMin: 1_800_000, ctcMax: 2_800_000 },
        { ctcMin: 900_000, ctcMax: 1_500_000 },
      ]),
    ).toEqual({ min: 900_000, max: 2_800_000 });
  });

  it('ignores listings that disclose nothing', () => {
    expect(payScaleOf([{ ctcMin: 1_000_000 }, {}])).toEqual({ min: 1_000_000, max: 1_000_000 });
  });

  it('collapses to zero when nothing on the page discloses pay', () => {
    expect(payScaleOf([{}, {}])).toEqual({ min: 0, max: 0 });
  });
});

describe('PayBand', () => {
  it('places a mid-range role in the middle of the axis', () => {
    render(<PayBand ctcMin={1_500_000} ctcMax={2_500_000} scale={SCALE} label="Pay range" />);

    const style = fillStyle();
    expect(style.left).toBe('25%');
    expect(style.width).toBe('50%');
  });

  it('fills the axis for a role spanning the whole range', () => {
    render(<PayBand ctcMin={SCALE.min} ctcMax={SCALE.max} scale={SCALE} label="Pay range" />);

    expect(fillStyle().left).toBe('0%');
    expect(fillStyle().width).toBe('100%');
  });

  it('runs to the top of the axis when no ceiling is stated', () => {
    render(<PayBand ctcMin={2_000_000} scale={SCALE} label="Pay range" />);

    expect(fillStyle().left).toBe('50%');
    expect(fillStyle().width).toBe('50%');
  });

  it('stays visible when the range is a single figure', () => {
    render(<PayBand ctcMin={2_000_000} ctcMax={2_000_000} scale={SCALE} label="Pay range" />);

    expect(Number.parseFloat(fillStyle().width)).toBeGreaterThan(0);
  });

  it('clamps a figure that sits outside the page axis', () => {
    render(<PayBand ctcMin={0} ctcMax={9_000_000} scale={SCALE} label="Pay range" />);

    expect(fillStyle().left).toBe('0%');
    expect(fillStyle().width).toBe('100%');
  });

  it('draws nothing when the listing discloses no pay', () => {
    const { container } = render(<PayBand scale={SCALE} label="Pay range" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('draws nothing when every role on the page pays the same', () => {
    const { container } = render(
      <PayBand ctcMin={1_000_000} scale={{ min: 1_000_000, max: 1_000_000 }} label="Pay" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('describes itself for assistive tech, which cannot see the track', () => {
    render(<PayBand ctcMin={1_500_000} ctcMax={2_500_000} scale={SCALE} label="Pay ₹15–25L" />);

    expect(screen.getByRole('img', { name: 'Pay ₹15–25L' })).toBeInTheDocument();
  });
});
