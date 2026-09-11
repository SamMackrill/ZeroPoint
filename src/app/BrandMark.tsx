import icon from '../../images/icon.png';
import './brand-mark.css';

/** Render the shared ZeroPoint application mark. */
export function BrandMark() {
  return <div className="brand-mark"><img src={icon} alt="" width="40" height="40"/></div>;
}
