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

export interface ListRow {
  hash: string;
  text: string;
  key: number;
  value: number;
  calculatedKey: boolean;
  calculatedValue: boolean;
  completed: boolean;
  touched: boolean;
}
export interface ListRows {
  [key: string]: ListRow;
}
