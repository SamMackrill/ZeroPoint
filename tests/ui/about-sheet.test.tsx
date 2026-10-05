// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AboutSheet, useAbout, type AboutSection, type AboutSectionId } from '../../src/workbench/AboutSheet';

const SECTIONS: AboutSection[] = [{ id: 'scenario', content: <p>scenario notes</p> }, { id: 'sources', content: <p>source links</p> }];

/** A lab's About sheet with a button that opens it at a section, as the header chip does. */
function Lab({ active = true, sections = SECTIONS, at }: { active?: boolean; sections?: AboutSection[]; at?: AboutSectionId }) {
  const about = useAbout();
  return <>
    <button type="button" onClick={() => about.show(at)}>open</button><input aria-label="field"/>
    <AboutSheet {...about} onOpenChange={about.setOpen} onSection={about.setSection} active={active} experiment="Electron in the ZPF" scenario="Spin in the field" sections={sections}/>
  </>;
}

describe('AboutSheet', () => {
  it('opens on Shift ?, titles the scenario, switches sections and closes on Esc', () => {
    const view = render(<Lab/>);
    expect(view.queryByTestId('about-sheet')).toBeNull();
    fireEvent.keyDown(window, { key: '?', shiftKey: true });
    const sheet = view.getByTestId('about-sheet');
    expect(sheet.textContent).toContain('Spin in the field');
    expect(sheet.textContent).toContain('Electron in the ZPF');
    expect(view.getByText('scenario notes')).toBeTruthy();
    expect(view.queryByTestId('about-units')).toBeNull(); // a lab omits sections it has nothing for
    fireEvent.mouseDown(view.getByTestId('about-sources'));
    expect(view.getByText('source links')).toBeTruthy();
    fireEvent.keyDown(sheet, { key: 'Escape' });
    expect(view.queryByTestId('about-sheet')).toBeNull();
  });

  it('opens at the requested section, falling back to the first the lab has', () => {
    const view = render(<Lab at="sources"/>);
    fireEvent.click(view.getByText('open'));
    expect(view.getByText('source links')).toBeTruthy();
    view.unmount();
    const fallback = render(<Lab at="units"/>);
    fireEvent.click(fallback.getByText('open'));
    expect(fallback.getByText('scenario notes')).toBeTruthy();
  });

  it('ignores ? from fields, with modifiers and while the lab is hidden', () => {
    const view = render(<Lab/>);
    fireEvent.keyDown(view.getByLabelText('field'), { key: '?' });
    fireEvent.keyDown(window, { key: '?', ctrlKey: true });
    expect(view.queryByTestId('about-sheet')).toBeNull();
    view.rerender(<Lab active={false}/>);
    fireEvent.keyDown(window, { key: '?' });
    expect(view.queryByTestId('about-sheet')).toBeNull();
  });

  it('closes when its lab is hidden, so it does not reappear on return', () => {
    const view = render(<Lab/>);
    fireEvent.click(view.getByText('open'));
    expect(view.getByTestId('about-sheet')).toBeTruthy();
    view.rerender(<Lab active={false}/>);
    view.rerender(<Lab/>);
    expect(view.queryByTestId('about-sheet')).toBeNull();
  });

  it('lists saved views as links, and following one closes Help and re-applies it even when it is already the address', () => {
    const changed = vi.fn(); window.addEventListener('hashchange', changed);
    const onOpenChange = vi.fn();
    history.replaceState(null, '', '#/electron/spin?sel=1');
    const view = render(<AboutSheet open section="views" onOpenChange={onOpenChange} onSection={() => undefined} experiment="Electron" active sections={[{ id: 'scenario', content: <p>notes</p> }]}
      views={[{ title: 'Shared rotation', description: 'One pair, shared turns.', hash: '#/electron/spin?sel=1' }]}/>);
    const link = view.getByRole('link', { name: 'Shared rotation' });
    expect(link.getAttribute('href')).toBe('#/electron/spin?sel=1');
    fireEvent.click(link);
    expect(changed).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    window.removeEventListener('hashchange', changed);
  });
});
