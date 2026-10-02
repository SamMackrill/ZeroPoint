// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SplitView, type SplitPane } from '../../src/workbench/SplitView';

const PANES: SplitPane[] = [{ id: 'a', label: 'Section', content: <p>section body</p> }, { id: 'b', label: 'Motion', content: <p>motion body</p> }];

/** A SplitView holding its own split and pane state, as the labs do. */
function Harness({ panes = PANES, active = true, initial = false }: { panes?: SplitPane[]; active?: boolean; initial?: boolean }) {
  const [split, setSplit] = useState(initial), [pane, setPane] = useState('a');
  return <><SplitView primary={<p>viewport</p>} panes={panes} split={split} onSplit={setSplit} pane={pane} onPane={setPane} active={active}/><input aria-label="field"/></>;
}

describe('SplitView', () => {
  it('toggles the second pane with the button and the \\ key, and picks between linked views', () => {
    const view = render(<Harness/>);
    expect(view.queryByText('section body')).toBeNull();
    fireEvent.click(view.getByTestId('split-toggle'));
    expect(view.getByText('section body')).toBeTruthy();
    expect(view.getByTestId('split-toggle').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(view.getByRole('radio', { name: 'Motion' }));
    expect(view.getByText('motion body')).toBeTruthy();
    fireEvent.keyDown(window, { key: '\\' });
    expect(view.queryByText('motion body')).toBeNull();
    fireEvent.keyDown(window, { key: '\\' });
    expect(view.getByText('motion body')).toBeTruthy();
  });

  it('ignores \\ from fields, with modifiers and while inactive', () => {
    const view = render(<Harness/>);
    fireEvent.keyDown(view.getByLabelText('field'), { key: '\\' });
    fireEvent.keyDown(window, { key: '\\', ctrlKey: true });
    expect(view.queryByText('section body')).toBeNull();
    view.rerender(<Harness active={false}/>);
    fireEvent.keyDown(window, { key: '\\' });
    expect(view.queryByText('section body')).toBeNull();
  });

  it('labels a single pane without a picker, and has no toggle without panes', () => {
    const view = render(<Harness panes={[PANES[0]]} initial/>);
    expect(view.queryByTestId('split-pane')).toBeNull();
    expect(view.getByRole('region', { name: 'Section' })).toBeTruthy();
    view.unmount();
    const none = render(<Harness panes={[]} initial/>);
    expect(none.queryByTestId('split-toggle')).toBeNull();
    expect(none.queryByRole('region')).toBeNull();
  });
});
