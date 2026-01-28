export interface ICD10Code {
  code: string;
  description: string;
  category?: string;
}

export interface RxNormConcept {
  rxcui: string;
  name: string;
  synonym?: string;
  tty?: string;
}

export interface SnomedConcept {
  conceptId: string;
  term: string;
  fsn?: string;
  semanticTag?: string;
}

export interface SearchResultItem {
  id: string;
  type: 'icd10' | 'rxnorm' | 'snomed';
  display: string;
  code: string;
  description?: string;
  data?: ICD10Code | RxNormConcept | SnomedConcept;
}

export interface SearchResult {
  results: SearchResultItem[];
  total_matches: number;
  confidence_scores: number[];
}
