import { appStore } from '@/store/instance';
import { buildCriticalReport, type ReportResult } from '@/store/persistence/report';

/** Build the Critical & Regulated Software Delivery report from the current case (read-only: nothing is written to the document). */
export const criticalReport = (now: Date = new Date()): ReportResult => buildCriticalReport(appStore().getState().doc, now);
