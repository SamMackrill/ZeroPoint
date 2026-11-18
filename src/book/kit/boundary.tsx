// A fallback for parts of a diagram that can fail at run time, such as a three-dimensional scene whose code does not load.
import { Component, type ReactNode } from 'react';

/** Shows `fallback` in place of its children if they fail, such as the 3D scene's code failing to download. */
export class FallbackOnError extends Component<{ fallback: ReactNode; children: ReactNode; onError?(): void }, { failed: boolean }> {
  state = { failed: false };
  /** Switch to the fallback on any error below. */
  static getDerivedStateFromError() { return { failed: true }; }
  /** Tell the figure, so controls that only the 3D view has can step aside. */
  componentDidCatch() { this.props.onError?.(); }
  /** The children, or the fallback once they have failed. */
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
