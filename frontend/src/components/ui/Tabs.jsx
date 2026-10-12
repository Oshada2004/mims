import './Tabs.css';

/**
 * Segmented tab switcher. tabs: [{ value, label }]. Renders only the tab buttons;
 * the caller shows the matching content.
 */
export default function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          className={['tabs__tab', tab.value === value && 'tabs__tab--active'].filter(Boolean).join(' ')}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
