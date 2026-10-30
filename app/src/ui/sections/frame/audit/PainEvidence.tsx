import { useState } from 'react';
import { editAudit } from '@/controllers/audit';
import { CONFIDENCES, YES_NO_LATER, type ElementAudit, type Interview } from '@/domain/audit';
import { toast } from '@/ui/uiState';

/** Pain points (free text, severity 1–5, candidate for AI) and evidence (document name, link, interview, confidence) of one element (§ 15.3). */
export function PainEvidence({ id, audit: a, interviews }: { id: string; audit: ElementAudit; interviews: Interview[] }) {
  const [text, setText] = useState(''), [severity, setSeverity] = useState('3'), [ai, setAi] = useState('');
  const [ev, setEv] = useState(''), [link, setLink] = useState(''), [interview, setInterview] = useState(''), [conf, setConf] = useState('');
  const addPain = () => {
    const ok = editAudit(id, { kind: 'painPoint', point: { text, severity: Number(severity), ...(ai ? { aiCandidate: ai as 'yes' } : {}) } });
    if (ok) setText(''); else toast('Pain point refused: a text is needed');
  };
  const addEvidence = () => {
    const ok = editAudit(id, { kind: 'evidence', evidence: { name: ev, ...(link ? { link } : {}), ...(interview ? { interview } : {}),
      ...(conf ? { confidence: conf as 'low' } : {}) } });
    if (ok) { setEv(''); setLink(''); } else toast('Evidence refused: a name is needed, and a link without spaces');
  };
  return (
    <>
      <fieldset className="ac-audit-block">
        <legend>Pain points and opportunities ({a.painPoints.length})</legend>
        <ul>{a.painPoints.map((p, i) => <li key={`${i}-${p.text}`}>
          Severity {p.severity}{p.aiCandidate ? ` · AI candidate: ${p.aiCandidate}` : ''} — {p.text}{' '}
          <button type="button" aria-label={`Remove pain point ${i + 1}`} onClick={() => editAudit(id, { kind: 'removePainPoint', index: i })}>✕</button>
        </li>)}</ul>
        <div className="ac-form-row">
          <input type="text" aria-label="New pain point" placeholder="Pain point or opportunity" value={text} onChange={(e) => setText(e.target.value)} />
          <select aria-label="Severity (1 to 5)" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          <select aria-label="Candidate for AI" value={ai} onChange={(e) => setAi(e.target.value)}>
            <option value="">AI candidate?</option>{YES_NO_LATER.map((v) => <option key={v} value={v}>{v}</option>)}</select>
          <button type="button" disabled={!text.trim()} onClick={addPain}>+ Add</button>
        </div>
      </fieldset>
      <fieldset className="ac-audit-block">
        <legend>Evidence ({a.evidence.length})</legend>
        <ul>{a.evidence.map((v, i) => <li key={`${i}-${v.name}`}>{v.name}{v.interview ? ` · ${v.interview}` : ''}{v.confidence ? ` · ${v.confidence}` : ''}
          {v.link ? <> · <span className="ac-muted">{v.link}</span></> : null}{' '}
          <button type="button" aria-label={`Remove evidence ${v.name}`} onClick={() => editAudit(id, { kind: 'removeEvidence', index: i })}>✕</button>
        </li>)}</ul>
        <div className="ac-form-row">
          <input type="text" aria-label="Evidence: document name" placeholder="Document name" value={ev} onChange={(e) => setEv(e.target.value)} />
          <input type="url" aria-label="Evidence: link" placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
          <select aria-label="Evidence: interview" value={interview} onChange={(e) => setInterview(e.target.value)}>
            <option value="">No interview</option>{interviews.map((i) => <option key={i.code} value={i.code}>{i.code} · {i.role}</option>)}</select>
          <select aria-label="Evidence: confidence" value={conf} onChange={(e) => setConf(e.target.value)}>
            <option value="">Confidence?</option>{CONFIDENCES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <button type="button" disabled={!ev.trim()} onClick={addEvidence}>+ Add</button>
        </div>
      </fieldset>
    </>
  );
}
