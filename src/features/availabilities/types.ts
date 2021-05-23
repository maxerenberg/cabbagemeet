export type SelModeType = 'none' | 'editingSelf' | 'submittingSelf' |
  `selectedOther:${string}` | `editingOther:${string}`;

export function getUserFromSelMode(selMode: SelModeType) {
  return (selMode.startsWith('editingOther') || selMode.startsWith('selectedOther')) ?
    selMode.split(':')[1] : '';
}

export type DateTime = [string, number];
