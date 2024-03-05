export interface ListItemWidth {
  key: number;
  row: number;
  keyNeedsUpdate: boolean;
  rowNeedsUpdate: boolean;
}

export interface KeyValuePiece {
  key: string;
  delimiter: string;
  value: string;
}
