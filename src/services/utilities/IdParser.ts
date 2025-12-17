
/**
 * Utility class for parsing IDs from strings
 */
export class IdParser {
  /**
   * Parses an ID from a string key (e.g., "personal-123", "123")
   * @param key The key string to parse
   * @param prefix Optional prefix to remove (e.g., "personal-")
   */
  public static parseId(key: string | undefined, prefix: string = ''): number | undefined {
    if (!key) return undefined;

    let idString = key;
    if (prefix && key.startsWith(prefix)) {
      idString = key.replace(prefix, '');
    }

    const id = parseInt(idString, 10);
    return isNaN(id) ? undefined : id;
  }
}
