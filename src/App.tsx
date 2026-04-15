import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(mode === 'url' ? imageUrl.trim() : '')
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageUrl, mode, selectedFile])

  useEffect(() => {
    if (!cameraStream || !videoRef.current) {
      return
    }

    videoRef.current.srcObject = cameraStream
  }, [cameraStream])

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [cameraStream])

  const canSubmit = useMemo(() => {
    if (isSubmitting) {
      return false
    }

    if (mode === 'url') {
      return imageUrl.trim().length > 0
    }

    return selectedFile !== null
  }, [imageUrl, isSubmitting, mode, selectedFile])

  const stopCamera = () => {
    if (!cameraStream) {
      return
    }

    cameraStream.getTracks().forEach((track) => track.stop())
    setCameraStream(null)
    setIsCameraReady(false)
  }

  const handleModeChange = (nextMode: SourceMode) => {
    if (nextMode !== 'camera') {
      stopCamera()
    }

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

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Camera is not supported in this browser.')
      return
    }

    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      setCameraStream(stream)
      setSelectedFile(null)
      setStatus('Camera is on. Take a photo.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not open the camera.'
      setStatus(`Camera error: ${message}`)
    }
  }

  const takePhoto = async () => {
    const video = videoRef.current
    const canvas = cameraCanvasRef.current

    if (!video || !canvas || !isCameraReady) {
      setStatus('Camera is not ready yet.')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      setStatus('Could not capture the photo.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95)
    })

    if (!blob) {
      setStatus('Could not capture the photo.')
      return
    }

    const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
    setSelectedFile(file)
    setStatus('Photo captured.')
    stopCamera()
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
          ) : null}

          {mode === 'upload' ? (
            <input
              className="simple-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          ) : null}

          {mode === 'camera' ? (
            <div className="camera-panel">
              <div className="camera-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={startCamera}
                >
                  Open camera
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={takePhoto}
                  disabled={!cameraStream}
                >
                  Take photo
                </button>
              </div>

              <div className="camera-frame">
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => setIsCameraReady(true)}
                  />
                ) : (
                  <span className="preview-text">Camera is off</span>
                )}
              </div>

              <canvas ref={cameraCanvasRef} className="hidden-canvas" />
            </div>
          ) : null}

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
