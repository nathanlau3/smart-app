import { Root, RootContent, Heading } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';
import { u } from 'unist-builder';

export type Json = Record<
  string,
  string | number | boolean | null | Json[] | { [key: string]: Json }
>;

export type Section = {
  content: string;
  heading?: string;
  part?: number;
  total?: number;
  headingLevel?: number;
  headingHierarchy?: string[]; // Full heading path (e.g., ["Chapter 1", "Section 1.1"])
  wordCount?: number;
  hasCode?: boolean;
  hasList?: boolean;
  hasTable?: boolean;
  contextPrefix?: string; // Context from parent sections for better RAG
};

export type ProcessedMd = {
  sections: Section[];
  metadata?: {
    totalSections: number;
    averageWordCount: number;
    hasCodeBlocks: boolean;
    hasTables: boolean;
  };
};

/**
 * Splits a `mdast` tree into multiple trees based on
 * a predicate function. Will include the splitting node
 * at the beginning of each tree.
 *
 * Useful to split a markdown file into smaller sections.
 */
export function splitTreeBy(
  tree: Root,
  predicate: (node: RootContent) => boolean
) {
  return tree.children.reduce<Root[]>((trees, node) => {
    const [lastTree] = trees.slice(-1);

    if (!lastTree || predicate(node)) {
      const tree: Root = u('root', [node]);
      return trees.concat(tree);
    }

    lastTree.children.push(node);
    return trees;
  }, []);
}

/**
 * Analyzes content metadata for better chunking decisions
 */
function analyzeContent(tree: Root): {
  hasCode: boolean;
  hasList: boolean;
  hasTable: boolean;
  wordCount: number;
} {
  let hasCode = false;
  let hasList = false;
  let hasTable = false;

  const walk = (node: RootContent | Root) => {
    if (node.type === 'code') hasCode = true;
    if (node.type === 'list') hasList = true;
    if (node.type === 'table') hasTable = true;
    if ('children' in node && node.children) {
      node.children.forEach(walk);
    }
  };

  walk(tree);

  const text = toString(tree);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return { hasCode, hasList, hasTable, wordCount };
}

/**
 * Extracts heading level from AST node
 */
function getHeadingLevel(node: RootContent): number | undefined {
  if (node.type === 'heading') {
    return (node as Heading).depth;
  }
  return undefined;
}

/**
 * Smart chunking that respects paragraph and sentence boundaries
 */
function smartChunk(
  content: string,
  maxLength: number,
  minLength: number
): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const chunks: string[] = [];

  // Try to split by paragraphs first
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const potentialChunk = currentChunk
      ? currentChunk + '\n\n' + paragraph
      : paragraph;

    // If adding this paragraph would exceed max length
    if (potentialChunk.length > maxLength && currentChunk.length >= minLength) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Handle remaining chunk
  if (currentChunk) {
    // If last chunk is too small, try to merge with previous
    if (currentChunk.length < minLength && chunks.length > 0) {
      const lastChunk = chunks.pop()!;
      chunks.push(lastChunk + '\n\n' + currentChunk);
    } else {
      chunks.push(currentChunk);
    }
  }

  // If chunks are still too large, split by sentences
  return chunks.flatMap(chunk => {
    if (chunk.length <= maxLength) return [chunk];
    return splitBySentences(chunk, maxLength, minLength);
  });
}

/**
 * Splits content by sentences when paragraphs are too large
 */
function splitBySentences(
  content: string,
  maxLength: number,
  minLength: number
): string[] {
  // Split by sentence-ending punctuation followed by space or newline
  const sentences = content.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const potentialChunk = currentChunk
      ? currentChunk + ' ' + sentence
      : sentence;

    if (potentialChunk.length > maxLength && currentChunk.length >= minLength) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk) {
    if (currentChunk.length < minLength && chunks.length > 0) {
      const lastChunk = chunks.pop()!;
      chunks.push(lastChunk + ' ' + currentChunk);
    } else {
      chunks.push(currentChunk);
    }
  }

  return chunks;
}

/**
 * Builds hierarchical heading context
 */
function buildHeadingHierarchy(
  sections: Array<{ heading?: string; headingLevel?: number }>,
  currentIndex: number
): string[] {
  const hierarchy: string[] = [];
  const currentLevel = sections[currentIndex].headingLevel;

  if (!currentLevel) return hierarchy;

  // Walk backwards to find parent headings
  for (let i = currentIndex - 1; i >= 0; i--) {
    const level = sections[i].headingLevel;
    const heading = sections[i].heading;

    if (level && heading && level < currentLevel) {
      hierarchy.unshift(heading);

      // Continue until we reach level 1 or no more parents
      if (level === 1) break;
    }
  }

  // Add current heading
  if (sections[currentIndex].heading) {
    hierarchy.push(sections[currentIndex].heading!);
  }

  return hierarchy;
}

/**
 * Enhanced markdown processing with smart chunking for better RAG performance.
 *
 * Improvements:
 * - Respects semantic boundaries (paragraphs, sentences)
 * - Maintains heading hierarchy for context
 * - Adds metadata (word count, content types)
 * - Smart overlap between chunks
 * - Context prefix for better retrieval
 */
export function processMarkdown(
  content: string,
  maxSectionLength = 2000,      // Reduced for better chunk size
  minSectionLength = 300,       // Increased minimum to avoid tiny chunks
  overlapLength = 150           // NEW: Overlap between chunks for context
): ProcessedMd {
  const mdTree = fromMarkdown(content);

  if (!mdTree) {
    return {
      sections: [],
      metadata: {
        totalSections: 0,
        averageWordCount: 0,
        hasCodeBlocks: false,
        hasTables: false,
      }
    };
  }

  const sectionTrees = splitTreeBy(mdTree, (node) => node.type === 'heading');

  // First pass: convert trees to sections with metadata
  let rawSections = sectionTrees.map((tree) => {
    const [firstNode] = tree.children;
    const content = toMarkdown(tree);
    const heading = firstNode.type === 'heading' ? toString(firstNode) : undefined;
    const headingLevel = getHeadingLevel(firstNode);
    const metadata = analyzeContent(tree);

    return {
      content,
      heading,
      headingLevel,
      ...metadata
    };
  });

  // Second pass: merge sections that are too small (unless they contain code/tables)
  const mergedSections: typeof rawSections = [];
  let currentSection: typeof rawSections[0] | null = null;

  for (const section of rawSections) {
    if (!currentSection) {
      currentSection = section;
      continue;
    }

    // Don't merge if either section has code blocks or tables (keep them intact)
    const shouldKeepSeparate = currentSection.hasCode ||
                               currentSection.hasTable ||
                               section.hasCode ||
                               section.hasTable;

    // If current section is too small and doesn't have special content, merge
    if (currentSection.wordCount < minSectionLength / 5 && !shouldKeepSeparate) {
      currentSection = {
        content: currentSection.content + '\n\n' + section.content,
        heading: currentSection.heading || section.heading,
        headingLevel: currentSection.headingLevel || section.headingLevel,
        wordCount: currentSection.wordCount + section.wordCount,
        hasCode: currentSection.hasCode || section.hasCode,
        hasList: currentSection.hasList || section.hasList,
        hasTable: currentSection.hasTable || section.hasTable,
      };
    } else {
      // Current section is good, save it and start new one
      mergedSections.push(currentSection);
      currentSection = section;
    }
  }

  // Don't forget the last section
  if (currentSection) {
    mergedSections.push(currentSection);
  }

  // Build heading hierarchy for all sections
  const sectionsWithHierarchy = mergedSections.map((section, index) => ({
    ...section,
    headingHierarchy: buildHeadingHierarchy(mergedSections, index),
  }));

  // Third pass: smart chunking for large sections
  const sections = sectionsWithHierarchy.flatMap<Section>((section) => {
    if (section.content.length > maxSectionLength) {
      // Use smart chunking that respects boundaries
      const chunks = smartChunk(section.content, maxSectionLength, minSectionLength);

      return chunks.map((chunk, i) => {
        // Add overlap from previous chunk for context
        let finalChunk = chunk;
        if (i > 0 && overlapLength > 0) {
          const prevChunk = chunks[i - 1];
          const overlapText = prevChunk.slice(-overlapLength);
          finalChunk = `...${overlapText}\n\n${chunk}`;
        }

        // Build context prefix from heading hierarchy
        const contextPrefix = section.headingHierarchy && section.headingHierarchy.length > 0
          ? section.headingHierarchy.slice(0, -1).join(' > ')
          : undefined;

        return {
          content: finalChunk,
          heading: section.heading,
          headingLevel: section.headingLevel,
          headingHierarchy: section.headingHierarchy,
          part: i + 1,
          total: chunks.length,
          wordCount: finalChunk.split(/\s+/).filter(Boolean).length,
          hasCode: section.hasCode,
          hasList: section.hasList,
          hasTable: section.hasTable,
          contextPrefix,
        };
      });
    }

    // Build context prefix for non-chunked sections too
    const contextPrefix = section.headingHierarchy && section.headingHierarchy.length > 0
      ? section.headingHierarchy.slice(0, -1).join(' > ')
      : undefined;

    return {
      ...section,
      contextPrefix,
    };
  });

  // Calculate metadata
  const totalSections = sections.length;
  const totalWords = sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const averageWordCount = totalSections > 0 ? Math.round(totalWords / totalSections) : 0;
  const hasCodeBlocks = sections.some(s => s.hasCode);
  const hasTables = sections.some(s => s.hasTable);

  return {
    sections,
    metadata: {
      totalSections,
      averageWordCount,
      hasCodeBlocks,
      hasTables,
    }
  };
}
