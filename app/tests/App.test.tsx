// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@/ui/App';

describe('App scaffold', () => {
  it('renders the version heading', () => {
    render(<App />);
    expect(screen.getByRole('heading').textContent).toContain('AgentCase v19');
  });
});
