/** One headline figure: value above its label, tone and tooltip. */
export const Kpi = ({ label, value, tone, title }: { label: string; value: string; tone: string; title?: string }) => (
  <div className="ac-kpi" data-tone={tone} title={title}><span className="ac-kpi-v">{value}</span><span className="ac-kpi-l">{label}</span></div>
);
