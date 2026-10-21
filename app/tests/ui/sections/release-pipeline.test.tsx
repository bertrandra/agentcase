// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/factory/release-pipeline';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
type R = { id: string; [x: string]: unknown };
const list = (k: string) => (appStore().getState().doc as Record<string, unknown>)[k] as R[];
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });
const add = (label: string) => fireEvent.click(screen.getByText(label));
const del = (row: HTMLElement) => { fireEvent.click(within(row).getByText('🗑')); fireEvent.click(within(row).getByText('✓ Confirm')); };

describe('release-pipeline section (Release → Candidate → Approval → Deployment → Environment → Monitoring → Feedback → Backlog)', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'release-pipeline');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('shows the six seeded environment stages and refuses to delete the last one', () => {
    loadFixture('golden');
    render(<Section />);
    expect(list('ENVIRONMENTS').map((e) => e.name)).toEqual(['Development', 'Integration', 'System Test', 'UAT', 'Pre-production', 'Production']);
    fireEvent.change(screen.getByLabelText('Name of Development'), { target: { value: 'Dev' } });
    expect(list('ENVIRONMENTS')[0]!.name).toBe('Dev');
    add('+ Add environment stage');
    expect(list('ENVIRONMENTS')).toHaveLength(7);
    expect(list('ENVIRONMENTS')[6]).toMatchObject({ id: 'env-7', seq: 7 });
    undo(2);
    expect(list('ENVIRONMENTS')[0]!.name).toBe('Development');
  });
  it('a release holds polymorphic items; deleting it deletes its items and orphans its candidates', () => {
    loadFixture('golden');
    render(<Section />);
    add('+ Add release');
    fireEvent.click(screen.getByText(/▶ 0 item\(s\)/));
    fireEvent.change(screen.getByLabelText('New item type'), { target: { value: 'Fix' } });
    fireEvent.change(screen.getByLabelText('Item description'), { target: { value: 'Fix upload timeout' } });
    fireEvent.click(screen.getByText('+ Add item'));
    expect(list('RELEASE_ITEMS')).toEqual([{ id: 'ri-1', releaseId: 'release-1', itemType: 'Fix', itemId: null, label: 'Fix upload timeout' }]);
    expect(screen.getByText('Fix upload timeout')).toBeTruthy();
    add('+ Add release candidate');
    expect(list('RELEASE_CANDIDATES')[0]).toMatchObject({ releaseId: 'release-1', status: 'Draft' });
    fireEvent.change(screen.getByLabelText('Status of New RC'), { target: { value: 'Cut' } });
    del(screen.getByLabelText('Name of New release').closest('tr')!);
    expect(list('RELEASES')).toHaveLength(0);
    expect(list('RELEASE_ITEMS')).toHaveLength(0);
    expect(list('RELEASE_CANDIDATES')[0]).toMatchObject({ releaseId: null, status: 'Cut' });
    undo();
    expect(list('RELEASE_ITEMS')).toHaveLength(1);
    expect(list('RELEASE_CANDIDATES')[0]!.releaseId).toBe('release-1');
  });
  it('approvals stamp the decision date; deployments, monitoring, feedback and backlog link up', () => {
    loadFixture('golden');
    render(<Section />);
    add('+ Add release'); add('+ Add release candidate'); add('+ Add approval');
    expect(list('APPROVALS')[0]).toMatchObject({ decision: 'Pending', decidedAt: null });
    fireEvent.change(screen.getByLabelText('Decision of appr-1'), { target: { value: 'Approved' } });
    expect(list('APPROVALS')[0]!.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.change(screen.getByLabelText('Decision of appr-1'), { target: { value: 'Pending' } });
    expect(list('APPROVALS')[0]!.decidedAt).toBeNull();
    add('+ Add deployment');
    expect(list('DEPLOYMENTS')[0]).toMatchObject({ releaseCandidateId: 'rc-1', environmentId: 'env-dev', status: 'Success' });
    fireEvent.change(screen.getByLabelText('Status of deploy-1'), { target: { value: 'RolledBack' } });
    add('+ Add monitoring event');
    expect(list('MONITORING_EVENTS')[0]).toMatchObject({ deploymentId: 'deploy-1', severity: 'Info' });
    fireEvent.change(screen.getByLabelText('Severity of mon-1'), { target: { value: 'Critical' } });
    add('+ Add feedback');
    fireEvent.change(screen.getByLabelText('Description of fb-1'), { target: { value: 'Bulk approve please' } });
    fireEvent.click(screen.getByText('→ Create backlog item'));
    expect(list('BACKLOG_ITEMS')[0]).toMatchObject({ id: 'backlog-1', description: 'Bulk approve please', status: 'New', sourceFeedbackId: 'fb-1' });
    expect(list('FEEDBACK_ITEMS')[0]!.backlogItemId).toBe('backlog-1');
    expect(screen.getByText('✓ backlog item created')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Status of backlog-1'), { target: { value: 'Done' } });
    expect(screen.getByText('Feedback')).toBeTruthy();   // the source column
    del(screen.getByLabelText('Status of deploy-1').closest('tr')!);
    expect(list('MONITORING_EVENTS')[0]!.deploymentId).toBeNull();   // orphaned
  });
});
