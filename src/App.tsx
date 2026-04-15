import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type SourceMode = 'url' | 'upload' | 'camera'

function App() {
  const [mode, setMode] = useState<SourceMode>('url')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState('Choose an image to continue.')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(mode === 'url' ? imageUrl.trim() : '')
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageUrl, mode, selectedFile])

  const canSubmit = useMemo(() => {
    if (isSubmitting) {
      return false
    }

    if (mode === 'url') {
      return imageUrl.trim().length > 0
    }

    return selectedFile !== null
  }, [imageUrl, isSubmitting, mode, selectedFile])

  const handleModeChange = (nextMode: SourceMode) => {
    setMode(nextMode)
    setImageUrl('')
    setSelectedFile(null)
    setStatus('Choose an image to continue.')
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setStatus(file ? 'Image selected.' : 'Choose an image to continue.')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)
    setStatus('Submitting...')

    try {
      const payload =
        mode === 'url'
          ? { sourceType: 'url', imageUrl: imageUrl.trim() }
          : { sourceType: mode, fileName: selectedFile?.name ?? '' }

      const response = await fetch('/todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      setStatus('Submitted.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach the endpoint.'
      setStatus(`Error: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="workspace-card">
        <h1>Apple and Orange Classifier</h1>
        <p className="intro-text">
          Add an image by URL, upload, or camera, then submit it to the demo
          endpoint.
        </p>

        <form className="classifier-form" onSubmit={handleSubmit}>
          <div className="source-grid">
            <button
              type="button"
              className={`source-option ${mode === 'url' ? 'active' : ''}`}
              onClick={() => handleModeChange('url')}
            >
              URL
            </button>
            <button
              type="button"
              className={`source-option ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => handleModeChange('upload')}
            >
              Upload
            </button>
            <button
              type="button"
              className={`source-option ${mode === 'camera' ? 'active' : ''}`}
              onClick={() => handleModeChange('camera')}
            >
              Camera
            </button>
          </div>

          {mode === 'url' ? (
            <input
              className="simple-input"
              type="url"
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value)
                setStatus(
                  event.target.value.trim()
                    ? 'Image URL added.'
                    : 'Choose an image to continue.',
                )
              }}
              placeholder="Enter image URL"
            />
          ) : (
            <input
              className="simple-input"
              type="file"
              accept="image/*"
              capture={mode === 'camera' ? 'environment' : undefined}
              onChange={handleFileChange}
            />
          )}

          <div className="preview-frame">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" />
            ) : (
              <span className="preview-text">No image selected</span>
            )}
          </div>

          <div className="submit-row">
            <span className="status-text">{status}</span>
            <button className="submit-button" type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default App
