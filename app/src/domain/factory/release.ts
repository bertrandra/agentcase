/** @calc-zone workspace-config */
import type { Gen } from './generate';

/** A release cut on the cadence: items, release candidates (rejected ones superseded), approvals, promotion through the environments, incidents, feedback. */
export function runRelease(g: Gen, w: number, storyIds: string[]): void {
  const { p, rnd, d, grid } = g;
  if (!(w - g.lastRelease >= p.releaseEveryWeeks && g.cnt < g.cap)) return;
  g.lastRelease = w; g.relN++;
  const relN = g.relN, rid = 'rl-' + relN;
  d.RELEASES.push({ id: rid, name: `Release ${grid.date(w).slice(0, 7)} — R${relN}` }); g.cnt++;
  storyIds.forEach((sid) => {
    if (g.cnt >= g.cap) return;
    d.RELEASE_ITEMS.push({ id: 'ri-' + d.RELEASE_ITEMS.length, releaseId: rid, itemType: 'Story', itemId: sid, label: null }); g.cnt++;
  });
  let rejects = 0;
  while (rnd() < p.approvalRejectRate && rejects < 3) rejects++;
  const envs = d.ENVIRONMENTS.slice().sort((x, y) => (x.seq || 0) - (y.seq || 0));
  for (let v = 0; v <= rejects && g.cnt < g.cap; v++) {
    const last = v === rejects, rcid = `rc-${relN}-${v}`, cut = grid.date(w, -p.rcLeadDays + v);
    d.RELEASE_CANDIDATES.push({ id: rcid, name: `R${relN}-RC${v + 1}`, releaseId: rid, cutAt: cut, status: last ? 'Accepted' : 'Superseded' }); g.cnt++;
    d.APPROVALS.push({ id: 'ap-' + d.APPROVALS.length, releaseCandidateId: rcid, approver: 'Release manager', decision: last ? 'Approved' : 'Rejected',
      requestedAt: cut, decidedAt: grid.date(w, -p.rcLeadDays + v + p.approvalLeadDays) }); g.cnt++;
    if (!last) continue;
    envs.forEach((env, ei) => {
      if (g.cnt >= g.cap) return;
      const day = ei * p.envPromotionDays, failed = rnd() < p.deployFailRate, rolled = !failed && !!env.isProd && rnd() < p.rollbackRate, dpid = 'dp-' + d.DEPLOYMENTS.length;
      d.DEPLOYMENTS.push({ id: dpid, releaseCandidateId: rcid, environmentId: env.id, deployedAt: grid.date(w, day), status: failed ? 'Failed' : rolled ? 'RolledBack' : 'Success' }); g.cnt++;
      if ((failed || rolled) && g.cnt < g.cap) {
        d.DEPLOYMENTS.push({ id: 'dp-' + d.DEPLOYMENTS.length, releaseCandidateId: rcid, environmentId: env.id, deployedAt: grid.date(w, day + p.retryDelayDays), status: 'Success' }); g.cnt++;
      }
      if (env.isProd && !failed && g.cnt < g.cap) {
        const nev = Math.round(p.incidentsPerProdDeploy);
        for (let e = 0; e < nev && g.cnt < g.cap; e++) {
          const u = rnd(), sev = u < p.sevCritical ? 'Critical' : u < p.sevCritical + p.sevWarning ? 'Warning' : 'Info';
          d.MONITORING_EVENTS.push({ id: 'mo-' + d.MONITORING_EVENTS.length, deploymentId: dpid, timestamp: grid.date(w, day + 1 + e),
            description: sev === 'Info' ? 'Production deploy healthy' : 'Post-deploy anomaly detected', severity: sev }); g.cnt++;
        }
      }
    });
  }
  const nfb = Math.round(p.feedbackPerRelease);
  for (let f = 0; f < nfb && g.cnt < g.cap; f++) {
    const blid = 'bl-' + d.BACKLOG_ITEMS.length;
    d.BACKLOG_ITEMS.push({ id: blid, description: 'Improvement requested after R' + relN, status: 'New', sourceFeedbackId: 'fb-' + d.FEEDBACK_ITEMS.length }); g.cnt++;
    d.FEEDBACK_ITEMS.push({ id: 'fb-' + d.FEEDBACK_ITEMS.length, description: 'Field feedback on release R' + relN, createdAt: grid.date(w, 7), backlogItemId: blid }); g.cnt++;
  }
}
