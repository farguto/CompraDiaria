export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  cost?: number;
  currency: 'ARS' | 'USD'; // Added currency support
  bought: boolean;
  timestamp: number; // Unix timestamp in milliseconds
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface AudioConfig {
  sampleRate: number;
}