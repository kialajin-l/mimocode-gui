import { useThemeStore } from '../../stores/themeStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useI18n } from '../../i18n'

interface SettingsPageProps {
  onClose: () => void
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const { theme, setTheme } = useThemeStore()
  const { locale, setLocale } = useI18n()
  const {
    defaultModel, setDefaultModel,
    defaultReasoning, setDefaultReasoning,
    defaultPermission, setDefaultPermission,
    showStatusCard, setShowStatusCard,
  } = useSettingsStore()

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <div className="settings-kicker">Configuration</div>
          <h3>设置</h3>
          <p>管理 MiMoCode 的外观、语言和默认行为。</p>
        </div>
        <button className="settings-close-btn" onClick={onClose} title="返回工作台">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="settings-sections">
        <section className="settings-section">
          <h4>外观</h4>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">主题</span>
              <span className="settings-desc">切换深色或浅色模式</span>
            </div>
            <div className="settings-toggle-group">
              <button
                className={`settings-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                深色
              </button>
              <button
                className={`settings-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                浅色
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h4>语言</h4>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">界面语言</span>
              <span className="settings-desc">切换 MiMoCode 界面显示语言</span>
            </div>
            <div className="settings-toggle-group">
              <button
                className={`settings-toggle-btn ${locale === 'zh' ? 'active' : ''}`}
                onClick={() => setLocale('zh')}
              >
                中文
              </button>
              <button
                className={`settings-toggle-btn ${locale === 'en' ? 'active' : ''}`}
                onClick={() => setLocale('en')}
              >
                English
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h4>默认设置</h4>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">默认模型</span>
              <span className="settings-desc">新建会话时使用的默认模型</span>
            </div>
            <select
              className="settings-select"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            >
              <option value="auto">自动选择</option>
              <option value="mimo-7b">MiMo-7B</option>
              <option value="mimo-32b">MiMo-32B</option>
              <option value="mimo-72b">MiMo-72B</option>
            </select>
          </div>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">默认推理强度</span>
              <span className="settings-desc">控制模型推理的深度</span>
            </div>
            <div className="settings-toggle-group">
              {['low', 'medium', 'high'].map((level) => (
                <button
                  key={level}
                  className={`settings-toggle-btn ${defaultReasoning === level ? 'active' : ''}`}
                  onClick={() => setDefaultReasoning(level)}
                >
                  {level === 'low' ? '低' : level === 'medium' ? '中' : '高'}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">默认权限</span>
              <span className="settings-desc">工具调用的默认权限策略</span>
            </div>
            <div className="settings-toggle-group">
              {['ask', 'auto', 'always'].map((perm) => (
                <button
                  key={perm}
                  className={`settings-toggle-btn ${defaultPermission === perm ? 'active' : ''}`}
                  onClick={() => setDefaultPermission(perm)}
                >
                  {perm === 'ask' ? '询问' : perm === 'auto' ? '自动' : '始终允许'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h4>界面</h4>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">状态卡片</span>
              <span className="settings-desc">在侧边显示会话和项目状态卡片</span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={showStatusCard}
                onChange={(e) => setShowStatusCard(e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}
