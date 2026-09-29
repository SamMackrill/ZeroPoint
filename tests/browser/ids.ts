import type { Page } from '@playwright/test';

/**
 * Locate an element by its stable test id in whichever lab is visible. Labs stay mounted (hidden) after their first
 * visit and share ids, so hidden copies are filtered out.
 *
 * The ids are a contract the UI redesign keeps as markup moves into the shell (docs/ui-redesign-plan.html §16, UI 01c):
 * lab-<id> · scenario-<id> · transport-run | step | next | reset | speed · timeline · file-save | load | input ·
 * params-apply · capture · export-png | csv · layer-<key> · setting-reduced-motion · event-<id> · notice · nav-open.
 */
export const tid = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
