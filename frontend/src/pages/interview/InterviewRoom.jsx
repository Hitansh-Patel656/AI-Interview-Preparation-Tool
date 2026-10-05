import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import {
  Mic,
  Square,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Send,
  Volume2
} from 'lucide-react';
import './InterviewRoom.css';

// Room states for the active question flow
const ROOM_STATES = {
  IDLE: 'IDLE',
  GENERATING_TTS: 'GENERATING_TTS',
  PLAYING_TTS: 'PLAYING_TTS',
  RECORDING: 'RECORDING',
  TRANSCRIBING: 'TRANSCRIBING',
  TRANSCRIPT_REVIEW: 'TRANSCRIPT_REVIEW',
  SUBMITTING: 'SUBMITTING',
  ERROR: 'ERROR',
};

export const InterviewRoom = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  // Core Data
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Page Status
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Question Flow State
  const [roomState, setRoomState] = useState(ROOM_STATES.IDLE);
  const [roomError, setRoomError] = useState(null);

  // Audio & TTS
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // Recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  // STT / Answer Data
  const [transcriptData, setTranscriptData] = useState(null); // { transcript, audio_url, duration_seconds }

  // Derived state
  const currentQuestion = questions.find(q => !q.answer) || null;
  const questionNumber = currentQuestion ? questions.findIndex(q => q._id === currentQuestion._id) + 1 : questions.length;

  // 3. Recording Flow
  const stopMediaTracks = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  // 1. Initial Load
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch session
        const sessionData = await api.get(`/sessions/${sessionId}`);
        if (!mounted) return;

        setSession(sessionData);

        if (sessionData.status === 'completed' || sessionData.status === 'abandoned') {
          setIsCompleted(true);
          setIsLoading(false);
          return;
        }

        // Fetch questions along with answer status from the feedback endpoint
        const reportData = await api.get(`/sessions/${sessionId}/feedback`);
        if (!mounted) return;

        const mappedQuestions = reportData.questions.map(q => ({
          ...q,
          _id: q.id // Ensure _id is available for compatibility
        }));

        setQuestions(mappedQuestions);

        // If there are questions but none are unanswered, the interview is effectively complete
        if (mappedQuestions.length > 0 && !mappedQuestions.find(q => !q.answer)) {
           // We could auto-complete here, but for now we'll just show completed UI
           setIsCompleted(true);
        }

        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        setError('Failed to load interview session. It may not exist or you do not have access.');
        setIsLoading(false);
      }
    };

    loadSession();

    return () => {
      mounted = false;
      stopMediaTracks(); // Cleanup mic on unmount
    };
  }, [sessionId, stopMediaTracks]);

  // 2. TTS Flow
  const handlePlayTTS = async () => {
    if (!currentQuestion) return;

    try {
      setRoomError(null);

      // If we already generated it for this exact question, just play
      if (ttsAudioUrl && audioRef.current) {
        setRoomState(ROOM_STATES.PLAYING_TTS);
        audioRef.current.play();
        return;
      }

      setRoomState(ROOM_STATES.GENERATING_TTS);

      const response = await api.post(`/sessions/${sessionId}/questions/${currentQuestion._id}/audio`, {});

      // Update state and immediately play
      setTtsAudioUrl(response.audio_url);

      // Wait for React to render the <audio> tag with the new src
      setTimeout(() => {
        if (audioRef.current) {
          setRoomState(ROOM_STATES.PLAYING_TTS);
          audioRef.current.play().catch(e => {
            console.error("Audio playback blocked", e);
            setRoomState(ROOM_STATES.IDLE);
          });
        }
      }, 100);

    } catch (err) {
      console.error(err);
      setRoomError('Failed to generate question audio.');
      setRoomState(ROOM_STATES.IDLE);
    }
  };

  const handleAudioEnded = () => {
    if (roomState === ROOM_STATES.PLAYING_TTS) {
      setRoomState(ROOM_STATES.IDLE);
    }
  };


  const startRecording = async () => {
    try {
      setRoomError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Ensure any existing audio playback stops
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start();
      setRoomState(ROOM_STATES.RECORDING);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone access denied or failed:', err);
      setRoomError('Microphone access is required to record your answer.');
      setRoomState(ROOM_STATES.IDLE);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordingStop = async () => {
    clearInterval(timerRef.current);
    stopMediaTracks(); // Turn off mic light immediately

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    if (audioBlob.size === 0 || recordingTime < 1) {
      setRoomError('Recording was too short. Please try again.');
      setRoomState(ROOM_STATES.IDLE);
      return;
    }

    // 4. STT Upload
    try {
      setRoomState(ROOM_STATES.TRANSCRIBING);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'answer.webm');

      // Use the new postForm abstraction
      const result = await api.postForm(`/sessions/${sessionId}/audio`, formData);

      setTranscriptData({
        transcript: result.transcript,
        audio_url: result.audio_url,
        duration_seconds: result.duration_seconds
      });

      setRoomState(ROOM_STATES.TRANSCRIPT_REVIEW);
    } catch (err) {
      console.error(err);
      setRoomError(err?.message || 'Failed to process audio. Please try again.');
      setRoomState(ROOM_STATES.IDLE);
    }
  };

  const handleDiscardRecording = () => {
    setTranscriptData(null);
    setRoomState(ROOM_STATES.IDLE);
  };

  // 5. Submit Answer & Evaluation
  const handleSubmitAnswer = async () => {
    if (!transcriptData || !currentQuestion) return;

    try {
      setRoomError(null);
      setRoomState(ROOM_STATES.SUBMITTING);

      const body = {
        question_id: currentQuestion._id,
        transcript: transcriptData.transcript,
        audio_url: transcriptData.audio_url
        // duration_seconds is deliberately omitted; backend authoritative STT metadata is used.
      };

      const result = await api.post(`/sessions/${sessionId}/answers`, body);

      // Mark current question as answered
      setQuestions(prev => prev.map(q =>
        q._id === currentQuestion._id ? { ...q, answer: { id: result.answer._id } } : q
      ));

      // Check for next question.
      if (result.next_question) {
        // We have a follow-up
        setQuestions(prev => [...prev, result.next_question]);

        // Reset state for new question
        setTtsAudioUrl(null);
        setTranscriptData(null);
        setRoomState(ROOM_STATES.IDLE);
      } else {
        // No follow-up generated. The session can be completed.
        // Let's just finish the session automatically or let the user do it.
        // SRS says "allow completion". We'll just transition to completed state.
        handleCompleteSession();
      }
    } catch (err) {
      console.error(err);
      setRoomError(err?.message || 'Failed to submit answer.');
      setRoomState(ROOM_STATES.TRANSCRIPT_REVIEW); // Allow retry
    }
  };

  // 6. Complete Session
  const handleCompleteSession = async () => {
    try {
      setRoomState(ROOM_STATES.SUBMITTING);
      await api.post(`/sessions/${sessionId}/complete`, {});
      setIsCompleted(true);
      setRoomState(ROOM_STATES.IDLE);
    } catch (err) {
      console.error(err);
      setRoomError('Failed to complete session.');
      setRoomState(ROOM_STATES.IDLE);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Renderers
  if (isLoading) {
    return (
      <div className="room-container">
        <div className="room-loading">
          <Loader2 className="spinner" size={32} />
          <p>Connecting to interview room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-container">
        <div className="room-error">
          <AlertCircle size={48} />
          <h2>Cannot Load Session</h2>
          <p>{error}</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="room-container">
        <div className="room-completed">
          <div className="completed-icon">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h2 className="completed-title">Interview Completed</h2>
            <p className="completed-text">
              Great job! Your responses have been recorded and evaluated.
              Feedback reports will be available on your dashboard soon.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isRecording = roomState === ROOM_STATES.RECORDING;
  const isProcessing = roomState === ROOM_STATES.TRANSCRIBING || roomState === ROOM_STATES.SUBMITTING || roomState === ROOM_STATES.GENERATING_TTS;
  const showTranscript = roomState === ROOM_STATES.TRANSCRIPT_REVIEW && transcriptData;

  return (
    <div className="room-container">
      {/* Audio element for TTS */}
      {ttsAudioUrl && (
        <audio
          ref={audioRef}
          src={ttsAudioUrl}
          onEnded={handleAudioEnded}
          style={{ display: 'none' }}
        />
      )}

      {/* Header */}
      <header className="room-header">
        <div className="room-title-area">
          <h1 className="room-title">{session.role} Interview</h1>
          <p className="room-subtitle">
            <span className="room-badge">{session.interview_type}</span>
            In Progress
          </p>
        </div>

        {/* Only allow complete if not currently recording or processing */}
        {!isRecording && !isProcessing && (
          <Button variant="ghost" onClick={handleCompleteSession}>
            End Interview
          </Button>
        )}
      </header>

      {/* Error Banner */}
      {roomError && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--color-error)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={18} />
          {roomError}
        </div>
      )}

      {/* Active Question */}
      {currentQuestion && (
        <div className="question-card">
          <div className="question-header">
            <h2 className="question-number">Question {questionNumber}</h2>
            {currentQuestion.is_followup && (
              <span className="room-badge" style={{ backgroundColor: '#F3F4F6' }}>Follow-up</span>
            )}
          </div>

          <p className="question-text">{currentQuestion.text}</p>

          <div className="question-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePlayTTS}
              disabled={isRecording || isProcessing || roomState === ROOM_STATES.PLAYING_TTS}
            >
              {roomState === ROOM_STATES.GENERATING_TTS ? (
                <><Loader2 size={16} className="btn-spinner" /> Generating audio...</>
              ) : roomState === ROOM_STATES.PLAYING_TTS ? (
                <><Volume2 size={16} /> Playing...</>
              ) : (
                <><Volume2 size={16} /> Play Audio</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main Interaction Area */}
      {showTranscript ? (
        // Transcript Review
        <div className="transcript-area">
          <h3 className="transcript-label">Your Answer</h3>
          <p className="transcript-text">{transcriptData.transcript}</p>

          <div className="transcript-actions">
            <Button
              variant="ghost"
              onClick={handleDiscardRecording}
              disabled={roomState === ROOM_STATES.SUBMITTING}
            >
              <RefreshCw size={16} />
              Re-record
            </Button>
            <Button
              onClick={handleSubmitAnswer}
              isLoading={roomState === ROOM_STATES.SUBMITTING}
              disabled={roomState === ROOM_STATES.SUBMITTING}
            >
              <Send size={16} />
              Submit Answer
            </Button>
          </div>
        </div>
      ) : (
        // Recording Controls
        <div className="recording-area">
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={32} className="spinner" />
              <p>
                {roomState === ROOM_STATES.TRANSCRIBING && "Transcribing audio..."}
                {roomState === ROOM_STATES.SUBMITTING && "Evaluating answer..."}
                {roomState === ROOM_STATES.GENERATING_TTS && "Preparing audio..."}
              </p>
            </div>
          ) : (
            <>
              <div className={`recording-status ${isRecording ? 'active' : ''}`}>
                <div className="recording-indicator" />
                {isRecording ? 'Recording in progress' : 'Ready to record'}
              </div>

              <div className="recording-timer">
                {formatTime(recordingTime)}
              </div>

              <div className="recording-controls">
                {!isRecording ? (
                  <button
                    className="btn-record start"
                    onClick={startRecording}
                    aria-label="Start recording"
                    disabled={roomState === ROOM_STATES.PLAYING_TTS}
                  >
                    <Mic size={24} />
                  </button>
                ) : (
                  <button
                    className="btn-record stop"
                    onClick={stopRecording}
                    aria-label="Stop recording"
                  >
                    <Square size={24} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
