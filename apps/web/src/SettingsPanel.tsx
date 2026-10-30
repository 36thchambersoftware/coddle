import { en } from '@coddle/content';
import type { Settings } from './storage';

export function SettingsPanel({
  settings,
  update,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}) {
  const toggles = ['sound', 'haptics', 'reducedMotion', 'colorblind'] as const;
  return (
    <section className="panel settings">
      <h2>{en.settings}</h2>
      {toggles.map((key) => (
        <label key={key} className="toggle">
          {en[key]}
          <input
            type="checkbox"
            checked={settings[key]}
            onChange={(e) => update({ [key]: e.target.checked })}
          />
        </label>
      ))}
      <label>
        {en.textSize}
        <select
          value={settings.textSize}
          onChange={(e) =>
            update({
              textSize: e.target.value === 'large' ? 'large' : 'normal',
            })
          }
        >
          <option value="normal">{en.sizes.normal}</option>
          <option value="large">{en.sizes.large}</option>
        </select>
      </label>
      <label>
        {en.portrait}
        <select
          value={settings.portrait}
          onChange={(e) => update({ portrait: Number(e.target.value) })}
        >
          {en.portraits.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <p>{en.language}</p>
    </section>
  );
}
