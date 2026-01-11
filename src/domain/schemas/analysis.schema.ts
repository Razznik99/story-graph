import { z } from 'zod';
import { ANALYSIS_TYPES, ANALYSIS_SCOPES } from '../constants';

export const AnalysisTypeSchema = z.enum(ANALYSIS_TYPES);
export const AnalysisScopeSchema = z.enum(ANALYSIS_SCOPES);

export const AnalysisReportSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    type: AnalysisTypeSchema,
    scope: AnalysisScopeSchema,
    summary: z.any(), // Json
    findings: z.any(), // Json
    aiContext: z.any().nullable(), // Json
    createdAt: z.date(),
});
