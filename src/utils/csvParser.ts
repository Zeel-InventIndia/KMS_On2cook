export interface CsvParseOptions {
  delimiter?: string;
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;
}

export class CsvParser {
  private delimiter: string;
  private skipEmptyRows: boolean;
  private trimWhitespace: boolean;

  constructor(options: CsvParseOptions = {}) {
    this.delimiter = options.delimiter || ',';
    this.skipEmptyRows = options.skipEmptyRows !== false;
    this.trimWhitespace = options.trimWhitespace !== false;
  }

  /**
   * Parse CSV text into a 2D array
   */
  parse(csvText: string): string[][] {
    if (!csvText || csvText.trim().length === 0) {
      return [];
    }

    const lines = csvText.split('\n');
    const result: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines if configured to do so
      if (this.skipEmptyRows && line.trim().length === 0) {
        continue;
      }

      const row = this.parseLine(line);
      
      // Skip empty rows (after parsing)
      if (this.skipEmptyRows && row.every(cell => cell.trim().length === 0)) {
        continue;
      }

      result.push(row);
    }

    return result;
  }

  /**
   * Parse a single CSV line, handling quoted fields and embedded commas
   */
  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : '';

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote (two quotes in a row)
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === this.delimiter && !inQuotes) {
        // Field separator
        result.push(this.trimWhitespace ? current.trim() : current);
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(this.trimWhitespace ? current.trim() : current);

    return result;
  }

  /**
   * Parse CSV with headers, returning an array of objects
   */
  parseWithHeaders(csvText: string): Record<string, string>[] {
    const rows = this.parse(csvText);
    
    if (rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }
}

/**
 * Convenience function to parse CSV text
 */
export function parseCsv(csvText: string, options?: CsvParseOptions): string[][] {
  const parser = new CsvParser(options);
  return parser.parse(csvText);
}

/**
 * Convenience function to parse CSV text with headers
 */
export function parseCsvWithHeaders(csvText: string, options?: CsvParseOptions): Record<string, string>[] {
  const parser = new CsvParser(options);
  return parser.parseWithHeaders(csvText);
}

/**
 * Fetch and parse CSV from a URL
 */
export async function fetchAndParseCsv(url: string, options?: CsvParseOptions): Promise<string[][]> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  return parseCsv(csvText, options);
}

/**
 * Fetch and parse CSV from a URL with headers
 */
export async function fetchAndParseCsvWithHeaders(url: string, options?: CsvParseOptions): Promise<Record<string, string>[]> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  return parseCsvWithHeaders(csvText, options);
}