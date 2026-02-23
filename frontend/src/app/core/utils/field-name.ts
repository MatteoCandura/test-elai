const typeOptions = [
  { label: 'Testo', value: 'text' },
  { label: 'Numero', value: 'number' },
  { label: 'Data', value: 'date' },
];

/**
 * Restituisce l'etichetta del tipo di colonna suggerito.
 *
 * @param suggestedType - Il tipo di colonna suggerito.
 * @returns string
 */
export function suggestionLabel(suggestedType: 'text' | 'number' | 'date') {
  return typeOptions.find((option) => option.value === suggestedType)?.label;
}

export { typeOptions };
