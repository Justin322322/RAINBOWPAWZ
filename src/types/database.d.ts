import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

// Define the QueryResult type to include array-like methods
export type QueryResult = RowDataPacket[] & {
  map<T>(callback: (value: any, index: number, array: any[]) => T): T[];
  find(predicate: (value: any, index: number, obj: any[]) => boolean): any;
  some(predicate: (value: any, index: number, array: any[]) => boolean): boolean;
  length: number;
  [index: number]: any & {
    count?: number;
  };
};

// Export the types from mysql2 for convenience
export { RowDataPacket, OkPacket, ResultSetHeader };
