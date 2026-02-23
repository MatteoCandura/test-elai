/**
 * Formatta la dimensione del file in un formato stringa leggibile (B, KB, MB, GB).
 *
 * @param bytes - Dimensione del file espresso in byte.
 * @returns string - Dimensione formattata in unità di misura scalata.
 */
export default function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}
