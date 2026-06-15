import { useState, useEffect } from 'react'
import { PROVIDER_PRESETS, ProviderPreset } from '../../data/presetProviders'
import { useModelStore, CustomProvider } from '../../stores/modelStore'

interface ProviderFormModalProps {
  initial?: CustomProvider
  onClose: () => void
}

export function ProviderFormModal({ initial, onClose }: ProviderFormModalProps) {
  const { addCustomProvider, updateCustomProvider, fetchProviderModelsResult } = useModelStore()
  const [providerType, setProviderType] = useState<'preset' | 'custom'>(initial ? 'custom' : 'preset')
  const [selectedPreset, setSelectedPreset] = useState<ProviderPreset | null>(
    initial ? null : PROVIDER_PRESETS[0]
  )
  const [name, setName] = useState(initial?.name || '')
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl || '')
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<{ configured: boolean; masked?: string; error?: string }>({ configured: false })
  const [defaultModel, setDefaultModel] = useState(initial?.defaultModel || '')
  const [contextLength, setContextLength] = useState(initial?.contextLength || 0)
  const [models, setModels] = useState<string[]>(initial?.models || [])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [fetchSuccess, setFetchSuccess] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  // Load key status from secure storage when editing
  useEffect(() => {
    if (initial?.id) {
      window.electronAPI?.apiKeyGetStatus(initial.id).then(status => {
        if (status) setKeyStatus(status)
      })
    }
  }, [initial?.id])

  const handlePresetChange = (presetValue: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.value === presetValue)
    if (preset) {
      setSelectedPreset(preset)
      setBaseUrl(preset.base_url)
      setModels(preset.models)
      if (preset.models.length > 0) {
        setDefaultModel(preset.models[0])
      }
    }
  }

  const handleFetchModels = async () => {
    if (!baseUrl) return
    setFetchingModels(true)
    setFetchError('')
    setFetchSuccess('')
    setSaveSuccess('')
    setSaveError('')
    try {
      const result = await fetchProviderModelsResult(baseUrl, initial?.id)
      const fetchedModels = result.models
      if (fetchedModels.length > 0) {
        setModels(fetchedModels)
        setFetchSuccess(`成功获取 ${fetchedModels.length} 个模型`)
        if (!defaultModel && fetchedModels.length > 0) {
          setDefaultModel(fetchedModels[0])
        }
      } else {
        setFetchError(result.error || '未获取到模型，请检查 Base URL 和 API Key')
      }
    } catch (err) {
      setFetchError('获取失败: ' + String(err))
    } finally {
      setFetchingModels(false)
    }
  }

  const handleSubmit = async () => {
    if (providerType === 'preset' && selectedPreset) {
      const provider: Omit<CustomProvider, 'id'> = {
        name: selectedPreset.label,
        baseUrl: selectedPreset.base_url,
        defaultModel,
        models: models.length > 0 ? models : selectedPreset.models,
        apiMode: selectedPreset.api_mode,
      }

      if (initial) {
        const updated = await updateCustomProvider(initial.id, provider)
        if (!updated) {
          setSaveError('已存在相同 Provider，请勿重复添加。')
          return
        }
        // Save API key through secure storage if provided
        if (apiKey.trim()) {
          await window.electronAPI?.apiKeySave(initial.id, apiKey.trim())
        }
        setSaveSuccess('Provider 已更新')
      } else {
        const added = await addCustomProvider(provider)
        if (!added) {
          setSaveError('已存在相同 Provider，请勿重复添加。')
          return
        }
        // Save API key through secure storage if provided
        if (apiKey.trim()) {
          await window.electronAPI?.apiKeySave(added, apiKey.trim())
        }
        setSaveSuccess('Provider 已添加')
      }
      window.setTimeout(onClose, 450)
    } else if (providerType === 'custom') {
      if (!name.trim() || !baseUrl.trim()) return

      const provider: Omit<CustomProvider, 'id'> = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        defaultModel: defaultModel.trim() || undefined,
        contextLength: contextLength > 0 ? contextLength : undefined,
        models,
      }

      if (initial) {
        const updated = await updateCustomProvider(initial.id, provider)
        if (!updated) {
          setSaveError('已存在相同 Provider，请勿重复添加。')
          return
        }
        // Save API key through secure storage if provided
        if (apiKey.trim()) {
          await window.electronAPI?.apiKeySave(initial.id, apiKey.trim())
        }
        setSaveSuccess('Provider 已更新')
      } else {
        const added = await addCustomProvider(provider)
        if (!added) {
          setSaveError('已存在相同 Provider，请勿重复添加。')
          return
        }
        // Save API key through secure storage if provided
        if (apiKey.trim()) {
          await window.electronAPI?.apiKeySave(added, apiKey.trim())
        }
        setSaveSuccess('Provider 已添加')
      }
      window.setTimeout(onClose, 450)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content provider-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial ? '编辑 Provider' : '添加 Provider'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!initial && (
            <div className="form-group">
              <label>Provider 类型</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${providerType === 'preset' ? 'active' : ''}`}
                  onClick={() => setProviderType('preset')}
                >
                  预设
                </button>
                <button
                  className={`toggle-btn ${providerType === 'custom' ? 'active' : ''}`}
                  onClick={() => setProviderType('custom')}
                >
                  自定义
                </button>
              </div>
            </div>
          )}

          {providerType === 'preset' ? (
            <>
              <div className="form-group">
                <label>选择 Provider *</label>
                <select
                  value={selectedPreset?.value || ''}
                  onChange={e => handlePresetChange(e.target.value)}
                >
                  {PROVIDER_PRESETS.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>API Key</label>
                {initial && keyStatus.configured ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={keyStatus.masked || '已配置 ✓'}
                      readOnly
                      style={{ flex: 1, opacity: 0.7 }}
                    />
                  </div>
                ) : initial && keyStatus.error ? (
                  <div className="form-error" style={{ marginBottom: 4 }}>
                    密钥读取失败，请重新输入
                  </div>
                ) : (
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="输入 API Key"
                  />
                )}
              </div>

              <div className="form-group">
                <label>Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="API 基础 URL"
                />
              </div>

              <div className="form-group">
                <label>默认模型 *</label>
                <div className="input-with-button">
                  <select
                    value={defaultModel}
                    onChange={e => setDefaultModel(e.target.value)}
                  >
                    <option value="">选择模型</option>
                    {models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <button
                    className="secondary-btn"
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !baseUrl}
                    title="从 API 获取最新模型列表"
                  >
                    {fetchingModels ? '获取中...' : '获取'}
                  </button>
                </div>
                {fetchError && <div className="form-error">{fetchError}</div>}
                {fetchSuccess && <div className="form-success">{fetchSuccess}</div>}
                {saveError && <div className="form-error">{saveError}</div>}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例如：My Custom Provider"
                />
              </div>

              <div className="form-group">
                <label>Base URL *</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="例如：https://api.example.com/v1"
                />
              </div>

              <div className="form-group">
                <label>API Key</label>
                {initial && keyStatus.configured ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={keyStatus.masked || '已配置 ✓'}
                      readOnly
                      style={{ flex: 1, opacity: 0.7 }}
                    />
                  </div>
                ) : initial && keyStatus.error ? (
                  <div className="form-error" style={{ marginBottom: 4 }}>
                    密钥读取失败，请重新输入
                  </div>
                ) : (
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                )}
              </div>

              <div className="form-group">
                <label>默认模型</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={defaultModel}
                    onChange={e => setDefaultModel(e.target.value)}
                    placeholder="例如：gpt-4"
                  />
                  <button
                    className="secondary-btn"
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !baseUrl}
                    title="从 API 获取最新模型列表"
                  >
                    {fetchingModels ? '获取中...' : '获取'}
                  </button>
                </div>
                {fetchError && <div className="form-error">{fetchError}</div>}
                {fetchSuccess && <div className="form-success">{fetchSuccess}</div>}
                {saveError && <div className="form-error">{saveError}</div>}
              </div>

              <div className="form-group">
                <label>上下文长度</label>
                <input
                  type="number"
                  value={contextLength || ''}
                  onChange={e => setContextLength(parseInt(e.target.value) || 0)}
                  placeholder="例如：256000（可选）"
                />
              </div>

              {models.length > 0 && (
                <div className="form-group">
                  <label>可用模型 ({models.length})</label>
                  <div className="model-tags">
                    {models.map(model => (
                      <span key={model} className="model-tag">{model}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>取消</button>
          <button
            className="primary-btn"
            onClick={handleSubmit}
            disabled={
              (providerType === 'preset' && (!selectedPreset || !defaultModel)) ||
              (providerType === 'custom' && (!name.trim() || !baseUrl.trim()))
            }
          >
            {initial ? '保存' : '添加'}
          </button>
        </div>
        {saveSuccess && <div className="form-success provider-save-success">{saveSuccess}</div>}
      </div>
    </div>
  )
}
