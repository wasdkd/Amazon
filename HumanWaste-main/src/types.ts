/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'love' | 'work' | 'life' | 'tech' | 'random';

export interface WasteItem {
  id: string;
  category: Category;
  content: string;
}
