import { describe, expect, it } from 'vitest';

import { parseCsvList, toCsvList, toggleCsvItem } from '../csv-list';

describe('parseCsvList', () => {
  it('splits a comma-separated parameter', () => {
    expect(parseCsvList('React,Node.js')).toEqual(['React', 'Node.js']);
  });

  it('trims the space people leave after a comma', () => {
    expect(parseCsvList('React, Node.js ')).toEqual(['React', 'Node.js']);
  });

  it('drops the blank a trailing comma leaves behind', () => {
    expect(parseCsvList('React,,')).toEqual(['React']);
  });

  it('reads an absent parameter as an empty selection', () => {
    expect(parseCsvList(undefined)).toEqual([]);
    expect(parseCsvList('')).toEqual([]);
  });
});

describe('toCsvList', () => {
  it('joins the selection back into one parameter', () => {
    expect(toCsvList(['React', 'Node.js'])).toBe('React,Node.js');
  });

  it('collapses an empty selection so it leaves the URL entirely', () => {
    expect(toCsvList([])).toBeUndefined();
  });
});

describe('toggleCsvItem', () => {
  it('adds a skill that was not selected', () => {
    expect(toggleCsvItem('React', 'Node.js')).toBe('React,Node.js');
  });

  it('starts a selection from nothing', () => {
    expect(toggleCsvItem(undefined, 'React')).toBe('React');
  });

  it('removes a skill that was selected', () => {
    expect(toggleCsvItem('React,Node.js', 'React')).toBe('Node.js');
  });

  it('matches regardless of case, so one skill cannot be selected twice', () => {
    expect(toggleCsvItem('react', 'React')).toBeUndefined();
  });

  it('keeps the order of what is left', () => {
    expect(toggleCsvItem('React,Node.js,SQL', 'Node.js')).toBe('React,SQL');
  });
});
