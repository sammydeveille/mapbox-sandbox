/**
 * Evidence link type representing a connection between a knowledge item
 * and a source document with a relevance classification.
 */
export interface EvidenceLink {
  id: string;
  relevance: "primary" | "supporting" | "contextual";
  sourceExternalId: string;
  excerpt?: string;
}

/**
 * Grouped evidence links partitioned by relevance classification.
 */
export interface GroupedEvidence {
  primary: EvidenceLink[];
  supporting: EvidenceLink[];
  contextual: EvidenceLink[];
}

/**
 * Partitions an array of evidence links into three groups by relevance
 * classification: primary, supporting, and contextual.
 *
 * Each evidence link appears in exactly one group matching its relevance value.
 * Groups are ordered as primary → supporting → contextual.
 *
 * @param evidence - Array of evidence links to group
 * @returns An object with primary, supporting, and contextual arrays
 */
export function groupEvidenceByRelevance(evidence: EvidenceLink[]): GroupedEvidence {
  const grouped: GroupedEvidence = {
    primary: [],
    supporting: [],
    contextual: [],
  };

  for (const link of evidence) {
    grouped[link.relevance].push(link);
  }

  return grouped;
}
