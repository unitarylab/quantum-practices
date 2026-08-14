export type QuantumSkillAction = 'list' | 'search' | 'get';
export type QuantumSkillDetail = 'brief' | 'full';
export interface QuantumSkillArgs {
    action: QuantumSkillAction;
    query?: string;
    id?: string;
    limit?: number;
    detail?: QuantumSkillDetail;
}
export interface QuantumSkillSummary {
    id: string;
    name: string;
    description: string;
}
export interface QuantumSkillRecord extends QuantumSkillSummary {
    content: string;
}
export declare const MAX_QUERY_CHARS = 256;
export declare const MAX_ID_CHARS = 256;
export declare const MAX_LIMIT = 20;
export declare const DEFAULT_LIMIT = 10;
export declare const MAX_BRIEF_OUTPUT_CHARS = 12000;
export declare const MAX_FULL_OUTPUT_CHARS = 40000;
export declare const MAX_OUTPUT_CHARS = 40000;
export declare function executeQuantumSkill(args: QuantumSkillArgs): string;
export declare function listSkills(limit?: number): QuantumSkillSummary[];
export declare function searchSkills(query: string, limit?: number): QuantumSkillSummary[];
export declare function getSkillById(id: string): QuantumSkillRecord;
export declare function getSkillByQuery(query: string): QuantumSkillRecord;
