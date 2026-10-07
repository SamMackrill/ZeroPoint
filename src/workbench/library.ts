import { createContext } from 'react';

/**
 * Opens the experiment library as a sheet. The narrow shell provides it (its rail is a drawer), so the header can make
 * the scenario name a picker on phones and tablets (plan §13). Null on wide layouts, where the rail is always there.
 */
export const OpenLibrary = createContext<(() => void) | null>(null);
