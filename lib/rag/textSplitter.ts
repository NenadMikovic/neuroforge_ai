/**
 * Recursive text splitter for chunking documents
 * Uses semantic boundaries (paragraphs, sentences) first, then splits by tokens
 */

interface SplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(options: SplitterOptions = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 100;
    // Try to split on more semantic boundaries first
    this.separators = options.separators || ["\n\n", "\n", " ", ""];
  }

  /**
   * Split text into chunks
   */
  splitText(text: string): string[] {
    return this.splitTextRecursive(text, this.separators);
  }

  private splitTextRecursive(text: string, separators: string[]): string[] {
    const goodSplits: string[] = [];
    let separatorIndex = separators.length - 1;

    for (let i = 0; i < separators.length; i++) {
      const separator = separators[i];

      if (separator === "") {
        // If we're at the last separator, split character by character
        break;
      }

      if (text.includes(separator)) {
        separatorIndex = i;
        break;
      }
    }

    const separator = separators[separatorIndex];
    const splits = separator === "" ? text.split("") : text.split(separator);

    // Now merge smaller chunks together and recurse on those
    let goodSplits_: string[] = [];
    const bigSeparator = "";

    for (const s of splits) {
      if (s.length < this.chunkSize) {
        goodSplits_.push(s);
      } else {
        if (goodSplits_.length > 0) {
          const mergedText = this.mergeSplits(goodSplits_, separator);
          goodSplits.push(...mergedText);
          goodSplits_ = [];
        }

        if (separatorIndex === separators.length - 1) {
          goodSplits.push(s);
        } else {
          const otherInfo = this.splitTextRecursive(
            s,
            separators.slice(separatorIndex + 1),
          );
          goodSplits.push(...otherInfo);
        }
      }
    }

    if (goodSplits_.length > 0) {
      const mergedText = this.mergeSplits(goodSplits_, separator);
      goodSplits.push(...mergedText);
    }

    // Filter out any empty strings
    return goodSplits.filter((split) => split.trim() !== "");
  }

  private mergeSplits(splits: string[], separator: string): string[] {
    const goodSplits: string[] = [];
    let currentMerge: string[] = [];
    let currentMergeSize = 0;

    for (const split of splits) {
      const splitSize = this.getLength(split);
      const mergeSize = currentMergeSize + splitSize;
      const separatorSize =
        currentMerge.length > 0 ? this.getLength(separator) : 0;

      if (
        mergeSize + separatorSize > this.chunkSize &&
        currentMerge.length > 0
      ) {
        const mergedText = currentMerge.join(separator);
        if (mergedText.trim()) {
          goodSplits.push(mergedText);
        }

        while (
          // Find the right merge window
          (mergeSize + separatorSize > this.chunkSize ||
            (mergeSize + separatorSize > this.chunkSize &&
              currentMerge.length > 1)) &&
          currentMerge.length > 0
        ) {
          currentMerge.shift();
          currentMergeSize = currentMerge.reduce(
            (acc, s) => acc + this.getLength(s),
            0,
          );
        }

        if (currentMerge.length > 0) {
          // Add overlap from previous chunk
          const prevMergedText = currentMerge.join(separator);
          if (prevMergedText.trim()) {
            goodSplits[goodSplits.length - 1] =
              goodSplits[goodSplits.length - 1] + separator + prevMergedText;
          }
        }

        currentMerge = [];
        currentMergeSize = 0;
      }

      currentMerge.push(split);
      currentMergeSize += splitSize;
    }

    const mergedText = currentMerge.join(separator);
    if (mergedText.trim()) {
      goodSplits.push(mergedText);
    }

    return goodSplits;
  }

  private getLength(text: string): number {
    // Estimate based on words rather than exact token count
    return Math.ceil(text.split(/\s+/).length * 1.3); // ~1.3 chars per token avg
  }
}

/**
 * Simple document splitter with better overlap handling
 */
export class DocumentSplitter {
  private splitter: RecursiveCharacterTextSplitter;

  constructor(chunkSize: number = 1000, chunkOverlap: number = 100) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
  }

  /**
   * Split a document into chunks with overlap
   */
  split(text: string): string[] {
    // Clean up the text first
    const cleanedText = text
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\n{3,}/g, "\n\n") // Remove excessive line breaks
      .trim();

    const chunks = this.splitter.splitText(cleanedText);

    // Add overlap between chunks
    const result: string[] = [];
    const overlapSize = Math.min(100, Math.floor(chunks[0]?.length * 0.1) || 0);

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];

      // Add overlap from previous chunk
      if (i > 0 && overlapSize > 0) {
        const prevChunk = chunks[i - 1];
        const overlapText = prevChunk.slice(-overlapSize);
        chunk = overlapText + "\n..." + chunk;
      }

      result.push(chunk);
    }

    return result;
  }
}

export default DocumentSplitter;
