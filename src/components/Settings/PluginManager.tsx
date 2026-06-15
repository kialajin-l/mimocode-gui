import { useEffect, useRef, useState } from 'react'
import { usePluginStore, Plugin } from '../../stores/pluginStore'
import { useSkillStore, Skill } from '../../stores/skillStore'

interface PluginManagerProps {
  onClose: () => void
}

export function PluginManager({ onClose }: PluginManagerProps) {
  const { plugins, loaded, scanning, loadPlugins, scanPlugins, installPlugin, togglePlugin, removePlugin } = usePluginStore()
  const { skills, loaded: skillsLoaded, scanning: skillsScanning, loadSkills, scanSkills, installSkill, toggleSkill, removeSkill } = useSkillStore()
  const [installModule, setInstallModule] = useState('')
  const [installing, setInstalling] = useState(false)
  const [installResult, setInstallResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'plugins' | 'skills'>('plugins')
  const [skillSearch, setSkillSearch] = useState('')
  const skillListRef = useRef<HTMLDivElement>(null)

  const enabledCount = plugins.filter(p => p.enabled).length
  const discoveredCount = plugins.filter(p => p.source === 'discovered').length
  const enabledSkills = skills.filter(s => s.enabled).length
  const discoveredSkills = skills.filter(s => s.source === 'discovered').length

  // Filter skills by search query
  const filteredSkills = skillSearch.trim()
    ? skills.filter(s =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(skillSearch.toLowerCase())
      )
    : skills

  useEffect(() => {
    loadPlugins()
    loadSkills()
  }, [loadPlugins, loadSkills])

  // Reset scroll position when search changes
  useEffect(() => {
    skillListRef.current?.scrollTo(0, 0)
  }, [skillSearch])

  const handleScan = async () => {
    await scanPlugins()
  }

  const handleInstall = async () => {
    const module = installModule.trim()
    if (!module) return
    setInstalling(true)
    setInstallResult(null)
    const res = await installPlugin(module)
    setInstalling(false)
    setInstallResult(res.success ? `Installed ${module}` : `Failed: ${res.error}`)
    if (res.success) setInstallModule('')
  }

  const handleSkillInstall = async () => {
    const input = installModule.trim()
    if (!input) return
    setInstalling(true)
    setInstallResult(null)
    // If it's a GitHub URL, extract repo path for npm install
    let installTarget = input
    const githubMatch = input.match(/github\.com\/([^/]+\/[^/]+)/)
    if (githubMatch) {
      installTarget = githubMatch[1]
    }
    const res = await installSkill(installTarget)
    setInstalling(false)
    setInstallResult(res.success ? `已安装 ${installTarget}` : `安装失败: ${res.error}`)
    if (res.success) setInstallModule('')
  }

  const isGithubUrl = installModule.includes('github.com')

  return (
    <div className="plugin-manager">
      <div className="plugin-manager-header">
        <div>
          <div className="plugin-manager-kicker">扩展能力</div>
          <h3>插件与技能</h3>
          <p>管理 MiMoCode 可用的插件和技能，保持编程工作流可扩展但不偏离技术工作台。</p>
        </div>
        <div className="plugin-manager-actions">
          <div className="plugin-stat">
            <span>{activeTab === 'plugins' ? enabledCount : enabledSkills}</span>
            已启用
          </div>
          <div className="plugin-stat">
            <span>{activeTab === 'plugins' ? discoveredCount : discoveredSkills}</span>
            已发现
          </div>
          <button className="plugin-close-btn" onClick={onClose} title="返回工作台">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="plugin-tab-bar">
        <button
          className={`plugin-tab ${activeTab === 'plugins' ? 'active' : ''}`}
          onClick={() => setActiveTab('plugins')}
        >
          插件 ({plugins.length})
        </button>
        <button
          className={`plugin-tab ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          技能 ({skills.length})
        </button>
      </div>

      {activeTab === 'plugins' ? (
        <>
          <div className="plugin-library-summary">
            <div>
              <strong>插件库</strong>
              <span>
                MiMoCode 插件兼容 OpenCode 插件生态，可增强代码审查、工具调用、自动化工作流等能力。
                插件以项目目录形式组织，包含多个功能模块。
              </span>
            </div>
            <span className="plugin-compat-badge">兼容 OpenCode</span>
          </div>

          <div className="plugin-toolbar">
            <button className="plugin-scan-btn" onClick={handleScan} disabled={scanning}>
              {scanning ? '扫描中...' : '扫描插件目录'}
            </button>
            <div className="plugin-install-row">
              <input
                type="text"
                className="plugin-install-input"
                placeholder="模块名（npm 包或路径）"
                value={installModule}
                onChange={e => setInstallModule(e.target.value)}
                disabled={installing}
              />
              <button className="plugin-install-btn" onClick={handleInstall} disabled={installing || !installModule.trim()}>
                {installing ? '安装中...' : '安装'}
              </button>
            </div>
            {installResult && <div className="plugin-install-result">{installResult}</div>}
          </div>

          <div className="plugin-list">
            {!loaded ? (
              <div className="plugin-empty">
                <p>加载中...</p>
              </div>
            ) : plugins.length === 0 ? (
              <div className="plugin-empty">
                <div className="plugin-empty-icon">⌘</div>
                <p>暂无已安装的插件</p>
                <p className="plugin-empty-hint">点击"扫描插件目录"发现已有的插件，或使用"安装"添加新插件。</p>
              </div>
            ) : (
              plugins.map(plugin => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onToggle={() => togglePlugin(plugin.id)}
                  onRemove={() => removePlugin(plugin.id)}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="plugin-library-summary">
            <div>
              <strong>技能库</strong>
              <span>
                技能是 MiMoCode 的 AI 能力扩展模块，遵循 OpenCode/Codex 标准（SKILL.md 格式）。
                扫描 ~/.agents/skills、~/.claude/skills、~/.codex/skills 等目录发现已安装的技能。
              </span>
            </div>
          </div>

          <div className="plugin-toolbar">
            <button className="plugin-scan-btn" onClick={() => scanSkills()} disabled={skillsScanning}>
              {skillsScanning ? '扫描中...' : '扫描技能目录'}
            </button>
            <div className="plugin-install-row">
              <span className="install-prefix">
                {isGithubUrl ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                ) : null}
              </span>
              <input
                type="text"
                className="plugin-install-input"
                placeholder={isGithubUrl ? 'GitHub 仓库地址（如 owner/repo）' : '技能名称或 GitHub 地址'}
                value={installModule}
                onChange={e => setInstallModule(e.target.value)}
                disabled={installing}
              />
              <button className="plugin-install-btn" onClick={handleSkillInstall} disabled={installing || !installModule.trim()}>
                {installing ? '安装中...' : '安装'}
              </button>
            </div>
            {installResult && <div className="plugin-install-result">{installResult}</div>}
          </div>

          {/* Skill search/filter bar */}
          <div className="skill-search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="skill-search-input"
              placeholder="搜索技能..."
              value={skillSearch}
              onChange={e => setSkillSearch(e.target.value)}
            />
            {skillSearch && (
              <button className="skill-search-clear" onClick={() => setSkillSearch('')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <span className="skill-search-count">{filteredSkills.length} 个结果</span>
          </div>

          <div className="plugin-list" ref={skillListRef} key={skillSearch || 'all'}>
            {!skillsLoaded ? (
              <div className="plugin-empty">
                <p>加载中...</p>
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="plugin-empty">
                <div className="plugin-empty-icon">⚡</div>
                <p>{skillSearch ? '没有找到匹配的技能' : '暂无已安装的技能'}</p>
                <p className="plugin-empty-hint">
                  {skillSearch
                    ? '尝试其他关键词，或点击"扫描技能目录"发现更多技能。'
                    : '点击"扫描技能目录"发现已有的技能，或使用"安装"添加新技能。'}
                </p>
              </div>
            ) : (
              filteredSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={() => toggleSkill(skill.id)}
                  onRemove={() => removeSkill(skill.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PluginCard({ plugin, onToggle, onRemove }: {
  plugin: Plugin
  onToggle: () => void
  onRemove: () => void
}) {
  const capability = getPluginCapability(plugin)
  const isDiscovered = plugin.source === 'discovered'

  return (
    <div className={`plugin-card ${plugin.enabled ? 'enabled' : ''} ${isDiscovered ? 'discovered' : ''}`}>
      <div className="plugin-card-info">
        <div className="plugin-card-topline">
          <div className="plugin-card-name">{plugin.name}</div>
          <span className={`plugin-status-chip ${plugin.enabled ? 'enabled' : ''}`}>
            {plugin.enabled ? '已启用' : '已停用'}
          </span>
          {isDiscovered && <span className="plugin-source-chip discovered">已发现</span>}
          {!isDiscovered && <span className="plugin-source-chip registered">已注册</span>}
        </div>
        <div className="plugin-card-desc">{plugin.description}</div>
        <div className="plugin-card-chips">
          <span>{capability}</span>
          <span>兼容 OpenCode</span>
          <span>本地</span>
        </div>
        <div className="plugin-card-path">{plugin.path}</div>
      </div>
      <div className="plugin-card-actions">
        <button className="plugin-config-btn" type="button" disabled title="暂未实现配置">配置</button>
        <label className="plugin-toggle">
          <input
            type="checkbox"
            checked={plugin.enabled}
            onChange={onToggle}
          />
          <span className="plugin-toggle-slider" />
        </label>
        <button className="plugin-remove-btn" onClick={onRemove} title="移除插件">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function getPluginCapability(plugin: Plugin) {
  const text = `${plugin.name} ${plugin.description} ${plugin.path}`.toLowerCase()
  if (text.includes('git') || text.includes('review') || text.includes('diff')) return '代码审查'
  if (text.includes('terminal') || text.includes('shell') || text.includes('run')) return '运行环境'
  if (text.includes('mcp') || text.includes('tool')) return '工具能力'
  if (text.includes('context') || text.includes('memory')) return '上下文'
  return '工作流'
}

function SkillCard({ skill, onToggle, onRemove }: {
  skill: Skill
  onToggle: () => void
  onRemove: () => void
}) {
  const isDiscovered = skill.source === 'discovered'
  // Extract source directory name for display
  const sourceDir = (skill.source || '').split(/[\\/]/).pop() || skill.source || ''

  return (
    <div className={`plugin-card ${skill.enabled ? 'enabled' : ''} ${isDiscovered ? 'discovered' : ''}`}>
      <div className="plugin-card-info">
        <div className="plugin-card-topline">
          <div className="plugin-card-name">{skill.name}</div>
          <span className={`plugin-status-chip ${skill.enabled ? 'enabled' : ''}`}>
            {skill.enabled ? '已启用' : '已停用'}
          </span>
          {isDiscovered && <span className="plugin-source-chip discovered">已发现</span>}
          {!isDiscovered && <span className="plugin-source-chip registered">已注册</span>}
        </div>
        <div className="plugin-card-desc">{skill.description}</div>
        <div className="plugin-card-chips">
          <span>技能</span>
          <span>{sourceDir}</span>
          <span>本地</span>
        </div>
        <div className="plugin-card-path">{skill.path}</div>
      </div>
      <div className="plugin-card-actions">
        <label className="plugin-toggle">
          <input
            type="checkbox"
            checked={skill.enabled}
            onChange={onToggle}
          />
          <span className="plugin-toggle-slider" />
        </label>
        <button className="plugin-remove-btn" onClick={onRemove} title="移除技能">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
