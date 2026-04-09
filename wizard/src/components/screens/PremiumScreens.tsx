import { useState, useEffect, useRef, useCallback } from 'react'
import { StatusBar, TabBar, NavBar, StyledButton, ios } from './shared'
import learn0 from '@/assets/app/learn0.png'
import phoneBg from '@/assets/app/phone-screenshot.jpeg'

// ═══════════════════════════════════════════════════════════
// ─── AI Assistant Interactive Demo ───
// Mirrors the iOS AIAssistChatView + AIButton + AIAssistOverlayView
// + AIAssistQuizView from white-label-ios.
//
// Modes:  idle → menu → chat | summary | quiz
// Course content (reading) is always visible behind overlays.
// ═══════════════════════════════════════════════════════════

type AIMode =
  | 'idle'
  | 'menu-primary'
  | 'menu-secondary'
  | 'chat'
  | 'summary'
  | 'quiz'

// ─── Mock data ────────────────────────────────────────────

const mockChatConversation: { role: 'user' | 'assistant'; text: string }[] = [
  { role: 'user', text: 'Can you explain what neural networks are?' },
  {
    role: 'assistant',
    text: 'Neural networks are computing systems inspired by biological neural networks in the brain. They consist of layers of interconnected nodes (neurons) that process and transform data to recognize patterns and make decisions.',
  },
  { role: 'user', text: 'Can you give me an example?' },
  {
    role: 'assistant',
    text: 'Image recognition is a great example. A neural network can learn to identify cats in photos by analyzing thousands of labeled images, gradually improving its accuracy through training.',
  },
]

const mockChatResponses = [
  "That's a great question! Machine learning is a subset of AI where systems learn from data rather than being explicitly programmed. The key types are supervised, unsupervised, and reinforcement learning.",
  'The Turing Test, proposed by Alan Turing in 1950, evaluates a machine\'s ability to exhibit intelligent behavior indistinguishable from a human.',
  'Deep learning uses multi-layered neural networks to progressively extract higher-level features from raw input — lower layers detect edges while higher layers identify complex objects.',
]

const summaryTexts: Record<string, { title: string; lines: string[] }> = {
  Summarize: {
    title: 'Summary',
    lines: [
      '• Course Overview — Introduction to key concepts and objectives of the unit.',
      '• Assessment Methods — Explanation of grading criteria and evaluation techniques.',
      '• Learning Resources — Overview of materials and tools available for study.',
      '• Weekly Schedule — Week 1: Orientation, syllabus walkthrough, and baseline assessment.',
      '• Weekly Schedule — Week 2: Fundamentals, terminology, and core patterns with hands-on practice.',
      '• Weekly Schedule — Week 3: Deeper dive into architecture, common pitfalls, and best practices.',
      '• Assignments — A1: Foundational concepts quiz and short reflection.',
      '• Assignments — A2: Build a small feature end-to-end.',
      '• Grading Breakdown: Quizzes (15%), Assignments (45%), Participation (10%), Final Project (30%).',
    ],
  },
  Simplify: {
    title: 'Simplified',
    lines: [
      '• AI is about making computers do things that normally require human intelligence.',
      '• Think of it like teaching a child — you show many examples and the system figures out the rules.',
      '• Machine learning = learning from data instead of following step-by-step instructions.',
      '• Neural networks are loosely inspired by how our brain cells connect to each other.',
      '• The more data you give, the better the model gets at recognizing patterns.',
    ],
  },
  'Different Perspective': {
    title: 'Different Perspective',
    lines: [
      '• From an economist\'s view: AI is the next general-purpose technology, like electricity or the internet.',
      '• From an ethicist\'s view: AI raises important questions about bias, privacy, and autonomy.',
      '• From a neuroscientist\'s view: AI models are crude approximations of biological computation.',
      '• From an educator\'s view: AI can personalize learning paths and provide instant feedback.',
      '• From a historian\'s view: Every industrial revolution brought both disruption and opportunity.',
    ],
  },
  'Practical Examples': {
    title: 'Practical Examples',
    lines: [
      '• Spam filters — classify emails as spam or not using learned patterns.',
      '• Voice assistants — convert speech to text, understand intent, and generate responses.',
      '• Medical imaging — detect tumors in X-rays with accuracy matching radiologists.',
      '• Recommendation engines — Netflix and Spotify suggest content based on your behavior.',
      '• Self-driving cars — combine computer vision, sensor fusion, and planning.',
      '• Language translation — Google Translate processes billions of sentence pairs.',
    ],
  },
  'Common Mistakes': {
    title: 'Common Mistakes',
    lines: [
      '• Confusing AI with AGI — today\'s AI is narrow, not general-purpose.',
      '• Overfitting — training a model that memorizes data instead of learning patterns.',
      '• Ignoring data quality — garbage in, garbage out still applies.',
      '• Assuming more data always helps — without diversity, more data can amplify bias.',
      '• Skipping evaluation — always test on unseen data before drawing conclusions.',
    ],
  },
  'Deep Dive': {
    title: 'Deep Dive',
    lines: [
      '• Backpropagation — the algorithm that lets neural networks learn by computing gradients layer by layer.',
      '• Attention mechanism — allows models to focus on relevant parts of input, powering transformers.',
      '• Transfer learning — reuse a model trained on one task for a related task with less data.',
      '• Gradient descent variants — SGD, Adam, and RMSprop each balance speed and stability differently.',
      '• Regularization — techniques like dropout and L2 penalty prevent overfitting.',
      '• Embedding spaces — map words or items into dense vectors where distance encodes similarity.',
    ],
  },
}

interface QuizQuestion {
  prompt: string
  answers: { text: string; isCorrect: boolean; feedback: string }[]
}

const mockQuiz: QuizQuestion[] = [
  {
    prompt: 'What does AI stand for?',
    answers: [
      { text: 'Artificial Intelligence', isCorrect: true, feedback: 'Correct! AI stands for Artificial Intelligence.' },
      { text: 'Automated Integration', isCorrect: false, feedback: 'Not quite — AI stands for Artificial Intelligence.' },
      { text: 'Applied Informatics', isCorrect: false, feedback: 'Not quite — AI stands for Artificial Intelligence.' },
    ],
  },
  {
    prompt: 'Which is NOT a type of machine learning?',
    answers: [
      { text: 'Supervised Learning', isCorrect: false, feedback: 'Supervised learning is a real ML type.' },
      { text: 'Compiled Learning', isCorrect: true, feedback: 'Correct! Compiled Learning is not a real type of ML.' },
      { text: 'Reinforcement Learning', isCorrect: false, feedback: 'Reinforcement learning is a real ML type.' },
    ],
  },
  {
    prompt: 'When was the Turing Test proposed?',
    answers: [
      { text: '1950', isCorrect: true, feedback: 'Correct! Alan Turing proposed it in 1950.' },
      { text: '1975', isCorrect: false, feedback: 'It was proposed earlier, in 1950.' },
      { text: '2001', isCorrect: false, feedback: 'It was proposed much earlier, in 1950.' },
    ],
  },
]

// ─── Shared sub-components ────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 12 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: ios.textSecondary,
            animation: `aiTypingDot 0.6s ease-in-out ${i * 0.18}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

function MeshGradientBg({ borderRadius }: { borderRadius: number }) {
  const grad = 'linear-gradient(90deg, #ff6b6b, #ffa500, #ffd700, #98fb98, #87ceeb, #9370db, #ff6b6b)'
  return (
    <>
      {/* Subtle outer glow */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: borderRadius + 2,
          background: grad,
          backgroundSize: '200% 100%',
          filter: 'blur(4px)',
          opacity: 0.3,
        }}
      />
      {/* Button body */}
      <div style={{ position: 'absolute', inset: 0, borderRadius, overflow: 'hidden' }}>
        {/* Inner gradient layer */}
        <div
          style={{
            position: 'absolute',
            inset: -2,
            background: grad,
            backgroundSize: '200% 100%',
            filter: 'blur(4px)',
            opacity: 0.45,
          }}
        />
        {/* White fill — mostly opaque, thin rainbow rim at edges */}
        <div style={{ position: 'absolute', inset: 0, borderRadius, background: 'radial-gradient(circle, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.88) 65%, rgba(255,255,255,0.5) 100%)' }} />
      </div>
    </>
  )
}

function MeshGradientText({ text, fontSize = 13 }: { text: string; fontSize?: number }) {
  return (
    <span
      style={{
        fontSize,
        fontWeight: 700,
        background: 'linear-gradient(90deg, #ff6b6b, #ffa500, #ffd700, #98fb98, #87ceeb, #9370db, #ff6b6b)',
        backgroundSize: '200% 100%',
        animation: 'aiGradientSlide 3s linear infinite',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {text}
    </span>
  )
}

function SparklesIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="aiSparkGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff69b4" />
          <stop offset="100%" stopColor="#4a90d9" />
        </linearGradient>
      </defs>
      <path
        d="M9.937 15.5C8.99 13.576 7.424 12.01 5.5 11.063L4 10.313l1.5-.75C7.424 8.614 8.99 7.05 9.937 5.125L10.687 3.625l.75 1.5C12.385 7.05 13.95 8.614 15.875 9.563l1.5.75-1.5.75C13.95 12.01 12.385 13.576 11.437 15.5l-.75 1.5-.75-1.5z"
        fill="url(#aiSparkGrad)"
      />
      <path
        d="M18.5 15.5c-.375-.75-.937-1.312-1.687-1.687l-.75-.375.75-.375c.75-.375 1.312-.937 1.687-1.687l.375-.75.375.75c.375.75.937 1.312 1.687 1.687l.75.375-.75.375c-.75.375-1.312.937-1.687 1.687l-.375.75-.375-.75z"
        fill="url(#aiSparkGrad)"
      />
    </svg>
  )
}

function AssistantIcon() {
  return (
    <div
      style={{
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: ios.accentDark,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <svg width={10} height={10} viewBox="0 0 24 24" fill="white">
        <path d="M9.937 15.5C8.99 13.576 7.424 12.01 5.5 11.063L4 10.313l1.5-.75C7.424 8.614 8.99 7.05 9.937 5.125L10.687 3.625l.75 1.5C12.385 7.05 13.95 8.614 15.875 9.563l1.5.75-1.5.75C13.95 12.01 12.385 13.576 11.437 15.5l-.75 1.5-.75-1.5z" />
      </svg>
    </div>
  )
}

function ChatBubble({ isUser, text, isStreaming }: { isUser: boolean; text: string; isStreaming?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <AssistantIcon />}
      {isUser && <div style={{ minWidth: 22, flexShrink: 0 }} />}
      <div
        style={{
          maxWidth: '78%', padding: '6px 10px', borderRadius: 12,
          backgroundColor: isUser ? ios.accent : ios.bgCard,
        }}
      >
        {isStreaming ? (
          <TypingDots />
        ) : (
          <p style={{ fontSize: 9, lineHeight: 1.45, color: isUser ? ios.white : ios.textPrimary, margin: 0 }}>{text}</p>
        )}
      </div>
      {!isUser && <div style={{ minWidth: 22, flexShrink: 0 }} />}
    </div>
  )
}

// ─── Reading content (course background) ─────────────────

function CourseReadingContent() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#fff', padding: '12px 14px 60px' }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 6 }}>
        A Brief History of Artificial Intelligence
      </h2>
      <p style={{ fontSize: 9, color: '#4B5563', lineHeight: 1.65, marginBottom: 8 }}>
        The concept of artificial intelligence dates back to ancient myths and stories of artificial
        beings endowed with intelligence. However, the formal field of AI research was founded at a
        workshop held at Dartmouth College in 1956.
      </p>
      <img
        src="https://picsum.photos/seed/ai-history/400/200"
        alt=""
        style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
      />
      <p style={{ fontSize: 9, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
        Key milestones in AI history:
      </p>
      <div style={{ fontSize: 9, color: '#4B5563', lineHeight: 1.75, paddingLeft: 6 }}>
        <p style={{ margin: '0 0 2px' }}>{'•'} 1950 — Alan Turing proposes the Turing Test</p>
        <p style={{ margin: '0 0 2px' }}>{'•'} 1956 — Dartmouth Workshop: birth of AI</p>
        <p style={{ margin: '0 0 2px' }}>{'•'} 1997 — Deep Blue defeats Garry Kasparov</p>
        <p style={{ margin: '0 0 2px' }}>{'•'} 2011 — IBM Watson wins Jeopardy!</p>
        <p style={{ margin: 0 }}>{'•'} 2012 — Deep learning breakthrough (ImageNet)</p>
      </div>
      <p style={{ fontSize: 9, color: '#4B5563', lineHeight: 1.65, marginTop: 8 }}>
        The modern era of AI has been marked by significant advances in machine learning, particularly
        deep learning, which has enabled breakthroughs in computer vision, natural language processing,
        and game playing.
      </p>
      <p style={{ fontSize: 9, color: '#4B5563', lineHeight: 1.65, marginTop: 8 }}>
        Today, AI systems power search engines, virtual assistants, medical diagnostics, autonomous
        vehicles, and creative tools. The field continues to evolve rapidly, with new architectures
        and training methods emerging every year.
      </p>
      <p style={{ fontSize: 9, color: '#4B5563', lineHeight: 1.65, marginTop: 8 }}>
        Understanding AI requires knowledge of mathematics (linear algebra, calculus, probability),
        programming, and domain-specific expertise. This course provides a solid foundation in all
        three areas, preparing you to understand and apply modern AI techniques.
      </p>
    </div>
  )
}

// ─── Typewriter text hook ─────────────────────────────────

function useTypewriter(lines: string[], active: boolean) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (!active) { setVisibleCount(0); return }
    setVisibleCount(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), 300 + i * 220))
    })
    return () => timers.forEach(clearTimeout)
  }, [active, lines])

  return visibleCount
}

// ─── Quiz overlay component ──────────────────────────────

function QuizOverlay({ onClose }: { onClose: () => void }) {
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [incorrect, setIncorrect] = useState(0)
  const [finished, setFinished] = useState(false)

  const q = mockQuiz[qIdx]!

  const handleAnswer = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    if (q.answers[i]!.isCorrect) setCorrect((c) => c + 1)
    else setIncorrect((c) => c + 1)
  }

  const handleNext = () => {
    if (qIdx >= mockQuiz.length - 1) { setFinished(true); return }
    setQIdx((i) => i + 1)
    setSelected(null)
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#fff',
        animation: 'aiFadeIn 0.3s ease-out',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 60px' }}>
        {/* Title */}
        <MeshGradientText text="Generate a Quiz" fontSize={13} />

        {/* Score + Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill={ios.success}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            <span style={{ fontSize: 9, color: ios.success, fontWeight: 600 }}>{correct}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill={ios.alert}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            <span style={{ fontSize: 9, color: ios.alert, fontWeight: 600 }}>{incorrect}</span>
          </div>
          {!finished && (
            <>
              <div style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: '#E5E7EB' }}>
                <div style={{ width: `${((qIdx + 1) / mockQuiz.length) * 100}%`, height: '100%', borderRadius: 2, backgroundColor: ios.accent, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 8, color: '#374151' }}>{qIdx + 1} of {mockQuiz.length}</span>
            </>
          )}
        </div>

        {finished ? (
          /* ── Results ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 60 }}>{correct === mockQuiz.length ? '🥇' : correct >= mockQuiz.length / 2 ? '🥈' : '🥉'}</span>
            <span style={{ fontSize: 8, color: '#6B7280' }}>Your Score</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{correct} / {mockQuiz.length}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: ios.accent }}>Congratulations!</span>
            <span
              style={{
                fontSize: 9, color: '#6B7280', padding: '6px 10px', borderRadius: 10,
                backgroundColor: '#F3F4F6', border: `1px solid ${ios.accent}30`,
              }}
            >
              {correct === mockQuiz.length ? 'Excellent result! Keep it up!' : correct >= mockQuiz.length / 2 ? "Very good! You're so close to gold!" : 'Good start! Keep practicing.'}
            </span>
            <button
              onClick={onClose}
              style={{
                marginTop: 6, height: 26, paddingLeft: 16, paddingRight: 16, borderRadius: 8,
                backgroundColor: ios.accent, border: 'none', cursor: 'pointer',
                fontSize: 9, fontWeight: 600, color: '#fff',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* ── Question ── */}
            <div
              style={{
                padding: '8px 10px', borderRadius: 8, marginTop: 4,
                border: `1.5px solid ${ios.accent}`,
                backgroundColor: `${ios.accent}15`,
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 600, color: '#1F2937', margin: 0 }}>{q.prompt}</p>
            </div>

            {/* ── Answers ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {q.answers.map((a, i) => {
                const isSelected = selected === i
                const isRevealed = selected !== null
                const bgColor = isRevealed
                  ? isSelected
                    ? a.isCorrect ? `${ios.success}20` : `${ios.alert}20`
                    : a.isCorrect ? `${ios.success}12` : '#F3F4F6'
                  : '#F3F4F6'
                const borderColor = isRevealed
                  ? isSelected
                    ? a.isCorrect ? ios.success : ios.alert
                    : a.isCorrect ? ios.success : '#E5E7EB'
                  : '#E5E7EB'

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={isRevealed}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                      backgroundColor: bgColor, border: `1px solid ${borderColor}`,
                      cursor: isRevealed ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 9, color: '#374151', flex: 1 }}>{a.text}</span>
                    {isRevealed && (isSelected || a.isCorrect) && (
                      a.isCorrect ? (
                        <svg width={12} height={12} viewBox="0 0 24 24" fill={ios.success}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      ) : (
                        <svg width={12} height={12} viewBox="0 0 24 24" fill={ios.alert}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                      )
                    )}
                  </button>
                )
              })}
            </div>

            {/* Feedback */}
            {selected !== null && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: q.answers[selected]!.isCorrect ? ios.success : ios.alert }}>
                  {q.answers[selected]!.isCorrect ? 'Correct!' : 'Wrong'}
                </span>
                <p style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>{q.answers[selected]!.feedback}</p>
              </div>
            )}

            {/* Next button */}
            {selected !== null && (
              <button
                onClick={handleNext}
                style={{
                  marginTop: 10, width: '100%', height: 26, borderRadius: 8,
                  backgroundColor: ios.accent, border: 'none', cursor: 'pointer',
                  fontSize: 9, fontWeight: 600, color: '#fff',
                }}
              >
                {qIdx >= mockQuiz.length - 1 ? 'Finish' : 'Next Question'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Summary overlay component ───────────────────────────

function SummaryOverlay({ label }: { label: string }) {
  const data = summaryTexts[label] ?? summaryTexts['Summarize']!
  const visibleCount = useTypewriter(data.lines, true)

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#fff',
        animation: 'aiFadeIn 0.3s ease-out',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 60px' }}>
        <MeshGradientText text={data.title} fontSize={13} />
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.lines.slice(0, visibleCount).map((line, i) => (
            <p
              key={i}
              style={{
                fontSize: 9, lineHeight: 1.55, color: '#374151', margin: 0,
                animation: 'aiFadeIn 0.3s ease-out',
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main AI Assistant Screen ────────────────────────────

export function AIAssistantScreen() {
  const [mode, setMode] = useState<AIMode>('idle')
  const [summaryLabel, setSummaryLabel] = useState('Summarize')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; isStreaming?: boolean }[]>([])
  const [inputText, setInputText] = useState('')
  const [chatPhase, setChatPhase] = useState<'preparing' | 'connected'>('preparing')
  const [responseIdx, setResponseIdx] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef(false)

  const scrollToBottom = useCallback(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [])
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Auto-play mock conversation
  useEffect(() => {
    if (mode !== 'chat' || autoPlayRef.current) return
    autoPlayRef.current = true
    setChatPhase('preparing')
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setChatPhase('connected'), 800))
    let delay = 1000
    mockChatConversation.forEach((msg) => {
      if (msg.role === 'assistant') {
        timers.push(setTimeout(() => setMessages((p) => [...p, { ...msg, text: '', isStreaming: true }]), delay))
        delay += 600
        timers.push(setTimeout(() => setMessages((p) => p.map((m, idx) => idx === p.length - 1 ? { ...m, text: msg.text, isStreaming: false } : m)), delay))
        delay += 400
      } else {
        timers.push(setTimeout(() => setMessages((p) => [...p, msg]), delay))
        delay += 500
      }
    })
    return () => timers.forEach(clearTimeout)
  }, [mode])

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return
    const txt = inputText.trim()
    setInputText('')
    setMessages((p) => [...p, { role: 'user', text: txt }])
    setTimeout(() => setMessages((p) => [...p, { role: 'assistant', text: '', isStreaming: true }]), 300)
    setTimeout(() => {
      setMessages((p) => p.map((m, i) => i === p.length - 1 ? { ...m, text: mockChatResponses[responseIdx % mockChatResponses.length]!, isStreaming: false } : m))
      setResponseIdx((i) => i + 1)
    }, 1200)
  }, [inputText, responseIdx])

  const openChat = useCallback(() => { setMode('chat'); setMessages([]); autoPlayRef.current = false }, [])
  const openSummary = useCallback((label: string) => { setSummaryLabel(label); setMode('summary') }, [])
  const openQuiz = useCallback(() => { setMode('quiz') }, [])
  const closeOverlay = useCallback(() => { setMode('idle'); setMessages([]); autoPlayRef.current = false; setChatPhase('preparing') }, [])

  const isOverlay = mode === 'chat' || mode === 'summary' || mode === 'quiz'

  const menuOptions = mode === 'menu-primary'
    ? [
        { label: 'Ask About', action: openChat },
        { label: 'Summarize', action: () => openSummary('Summarize') },
        { label: 'Generate a Quiz', action: openQuiz },
        { label: 'More', action: () => setMode('menu-secondary') },
      ]
    : mode === 'menu-secondary'
      ? [
          { label: 'Simplify', action: () => openSummary('Simplify') },
          { label: 'Different Perspective', action: () => openSummary('Different Perspective') },
          { label: 'Practical Examples', action: () => openSummary('Practical Examples') },
          { label: 'Common Mistakes', action: () => openSummary('Common Mistakes') },
          { label: 'Deep Dive', action: () => openSummary('Deep Dive') },
        ]
      : []

  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />

      {/* Nav bar (matches CourseUnitView) */}
      <div className="relative flex items-center justify-center" style={{ padding: '2px 17px 4px', minHeight: 30 }}>
        <div className="absolute left-[17px] flex items-center">
          <svg width="8" height="14" viewBox="0 0 10 16" fill="none" stroke={ios.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L2 8l6 6" />
          </svg>
        </div>
        <span className="font-semibold" style={{ fontSize: 12, color: ios.textPrimary }}>Introduction to AI</span>
      </div>

      {/* Content zone */}
      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 17, borderTopRightRadius: 17,
          border: '0.7px solid #E0E0E0', borderBottom: 'none', marginTop: 4,
        }}
      >
        <CourseReadingContent />

        {/* Dim overlay when menu is open */}
        {(mode === 'menu-primary' || mode === 'menu-secondary') && (
          <div onClick={() => setMode('idle')} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 }} />
        )}

        {/* ── AI Button + Menu ── always visible, X in overlay modes */}
        {mode !== 'chat' && (
          <div style={{ position: 'absolute', bottom: 36, right: 12, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {menuOptions.map((opt, i) => (
              <button
                key={opt.label}
                onClick={opt.action}
                style={{
                  position: 'relative', height: 22, paddingLeft: 10, paddingRight: 10,
                  border: 'none', cursor: 'pointer', background: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: `aiMenuIn 0.25s ease-out ${i * 0.04}s both`,
                }}
              >
                <MeshGradientBg borderRadius={11} />
                <span style={{ position: 'relative', fontSize: 9, fontWeight: 600, color: 'rgba(0,0,0,0.55)', lineHeight: 1 }}>{opt.label}</span>
              </button>
            ))}

            {/* Main AI button */}
            <button
              onClick={() => {
                if (isOverlay) closeOverlay()
                else if (mode === 'idle') setMode('menu-primary')
                else if (mode === 'menu-primary' || mode === 'menu-secondary') setMode('idle')
              }}
              style={{ position: 'relative', width: 34, height: 34, borderRadius: 17, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}
            >
              <MeshGradientBg borderRadius={17} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                {mode === 'idle' ? <SparklesIcon size={18} /> : (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                )}
              </div>
            </button>
          </div>
        )}

        {/* ── Chat Bottom Sheet ── */}
        {mode === 'chat' && (
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, top: 60, zIndex: 30,
              display: 'flex', flexDirection: 'column',
              backgroundColor: ios.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18,
              boxShadow: '0 -3px 12px rgba(0,0,0,0.25)', animation: 'aiSheetUp 0.3s ease-out',
            }}
          >
            {/* Drag indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6, paddingBottom: 3 }}>
              <div style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: ios.textSecondary, opacity: 0.3 }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 6px' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: ios.textPrimary }}>Ask About</div>
                <div style={{ fontSize: 8, color: chatPhase === 'connected' ? ios.success : ios.textSecondary }}>
                  {chatPhase === 'preparing' ? 'Preparing the context...' : 'Connected'}
                </div>
              </div>
              <button
                onClick={closeOverlay}
                style={{
                  width: 22, height: 22, borderRadius: 11, backgroundColor: ios.accent,
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ height: 0.5, backgroundColor: ios.textSecondary, opacity: 0.2, margin: '0 14px' }} />

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((msg, i) => (
                  <ChatBubble key={i} isUser={msg.role === 'user'} text={msg.text} isStreaming={msg.isStreaming} />
                ))}
                <div ref={endRef} />
              </div>
            </div>

            {/* Input */}
            <div style={{ borderTop: `0.5px solid ${ios.cardStroke}`, padding: '6px 10px', paddingBottom: 30, backgroundColor: ios.bgCard }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about this lesson"
                  style={{
                    flex: 1, height: 26, borderRadius: 6,
                    border: `1px solid ${ios.strokeInput}`, backgroundColor: ios.bgInput,
                    color: ios.textPrimary, fontSize: 9, padding: '0 8px', outline: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  style={{
                    width: 24, height: 24, flexShrink: 0, border: 'none', background: 'none',
                    cursor: inputText.trim() ? 'pointer' : 'default',
                    opacity: inputText.trim() ? 1 : 0.4, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill={ios.accent}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Summary Overlay ── */}
        {mode === 'summary' && <SummaryOverlay label={summaryLabel} />}

        {/* ── Quiz Overlay ── */}
        {mode === 'quiz' && <QuizOverlay onClose={closeOverlay} />}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes aiTypingDot {
          from { transform: scale(0.6); opacity: 0.4; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes aiMenuIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiSheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes aiFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiGradientSlide {
          from { background-position: 0% 50%; }
          to { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  )
}

// ─── Offline Mode Screen ───
export function OfflineModeScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />
      <NavBar title="AI For Beginners" />

      {/* Offline banner */}
      <div
        className="mx-5 mt-2 flex items-center gap-2 rounded-lg px-4 py-3"
        style={{ backgroundColor: ios.warning + '15', border: `1px solid ${ios.warning}30` }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ios.warning} strokeWidth="2">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
          <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0122.56 9" />
          <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
          <path d="M8.53 16.11a6 6 0 016.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span className="text-[13px] font-medium" style={{ color: ios.warning }}>
          Offline Mode — Using downloaded content
        </span>
      </div>

      {/* Course content */}
      <div className="mx-5 mt-4 rounded-lg p-4" style={{ backgroundColor: ios.bgCard }}>
        <img src={learn0} alt="" className="h-[100px] w-full rounded-lg object-cover" />
        <h3 className="mt-3 text-[16px] font-bold" style={{ color: ios.textPrimary }}>
          What is Artificial Intelligence?
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: ios.textSecondary }}>
          Artificial intelligence refers to the simulation of human intelligence by machines...
        </p>
      </div>

      <div className="mx-5 mt-4 space-y-2">
        <OfflineSection title="Welcome Message" downloaded />
        <OfflineSection title="Introduction to AI" downloaded />
        <OfflineSection title="Machine Learning" downloaded />
        <OfflineSection title="Neural Networks" downloaded={false} />
      </div>

      <TabBar active="learn" />
    </div>
  )
}

function OfflineSection({ title, downloaded }: { title: string; downloaded: boolean }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-4 py-3"
      style={{ backgroundColor: ios.bgCard }}
    >
      <span className="text-[13px]" style={{ color: ios.textPrimary }}>{title}</span>
      <div className="flex items-center gap-1">
        {downloaded ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ios.success} strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ios.textTertiary} strokeWidth="2">
            <path d="M17.5 19H9a7 7 0 110-14h.5" />
            <path d="M22 10l-5 5-5-5" />
          </svg>
        )}
        <span className="text-[11px]" style={{ color: downloaded ? ios.success : ios.textTertiary }}>
          {downloaded ? 'Available' : 'Online only'}
        </span>
      </div>
    </div>
  )
}

// ─── Smart Push Notifications Screen ───

const pushNotifications = [
  {
    title: 'Keep It Going!',
    body: 'You made a great start yesterday — let\'s keep your spark alive 🔥',
    time: '2m ago',
  },
  {
    title: 'Great Progress!',
    body: 'You did amazing in your last lesson — ready to start "Introduction to AI"?',
    time: '1h ago',
  },
  {
    title: 'You\'re Crushing It!',
    body: 'You\'ve completed 65% of "AI For Beginners"! Let\'s keep that momentum going 🔥',
    time: '3h ago',
  },
]

export function SmartPushScreen() {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    const timers = pushNotifications.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), 600 + i * 800)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Lock screen wallpaper */}
      <img
        src={phoneBg}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Notifications stacking below the clock */}
      <div
        style={{
          position: 'absolute', left: 8, right: 8, top: 160,
          display: 'flex', flexDirection: 'column', gap: 5,
        }}
      >
        {pushNotifications.slice(0, visibleCount).map((n, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: 7, padding: '8px 10px',
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              animation: 'pushNotifIn 0.4s ease-out both',
            }}
          >
            {/* App icon */}
            <div
              style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: 'linear-gradient(135deg, #3A99E8, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#1a1a1a' }}>{n.title}</span>
                <span style={{ fontSize: 7.5, color: '#6B7280', flexShrink: 0 }}>{n.time}</span>
              </div>
              <p style={{ fontSize: 8, color: '#374151', lineHeight: 1.35, margin: '2px 0 0' }}>{n.body}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pushNotifIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── PDF Support Screen ───
export function PDFSupportScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />
      <NavBar title="Course Materials" />

      {/* PDF viewer mockup */}
      <div className="mx-5 mt-3 flex-1 overflow-hidden rounded-lg bg-white p-5">
        <div className="space-y-3">
          <div className="h-3 w-3/4 rounded bg-gray-300" />
          <div className="h-2.5 w-full rounded bg-gray-200" />
          <div className="h-2.5 w-full rounded bg-gray-200" />
          <div className="h-2.5 w-5/6 rounded bg-gray-200" />
          <div className="mt-4 h-[80px] rounded bg-gray-100" />
          <div className="h-2.5 w-full rounded bg-gray-200" />
          <div className="h-2.5 w-full rounded bg-gray-200" />
          <div className="h-2.5 w-2/3 rounded bg-gray-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-gray-300" />
          <div className="h-2.5 w-full rounded bg-gray-200" />
          <div className="h-2.5 w-full rounded bg-gray-200" />
        </div>
      </div>

      {/* PDF toolbar */}
      <div
        className="mx-5 mb-16 mt-3 flex items-center justify-between rounded-lg px-4 py-3"
        style={{ backgroundColor: ios.bgCard }}
      >
        <span className="text-[13px]" style={{ color: ios.textSecondary }}>lecture_notes.pdf</span>
        <div className="flex items-center gap-4">
          <span className="text-[13px]" style={{ color: ios.textSecondary }}>1 / 12</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ios.accent} strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
      </div>

      <TabBar active="learn" />
    </div>
  )
}

// ─── LMS Selection Screen ───
export function LMSSelectionScreen() {
  return (
    <div className="flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div
          className="flex h-[64px] w-[64px] items-center justify-center rounded-2xl"
          style={{ backgroundColor: ios.accent + '20' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ios.accent} strokeWidth="1.5">
            <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18Z" />
            <path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
            <path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
          </svg>
        </div>
        <h1 className="mt-4 text-[22px] font-bold" style={{ color: ios.textPrimary }}>
          Select your LMS
        </h1>
        <p className="mt-1 text-center text-[14px]" style={{ color: ios.textSecondary }}>
          Choose your learning platform
        </p>

        <div className="mt-6 w-full space-y-3">
          <LMSItem name="Production LMS" url="lms.example.com" selected />
          <LMSItem name="Staging LMS" url="stage.example.com" />
          <LMSItem name="Dev LMS" url="dev.example.com" />
        </div>

        <div className="mt-6 w-full">
          <StyledButton label="Continue" />
        </div>

        <button className="mt-4 text-[13px]" style={{ color: ios.accent }}>
          + Add Custom LMS
        </button>
      </div>
    </div>
  )
}

function LMSItem({ name, url, selected }: { name: string; url: string; selected?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg p-4"
      style={{
        backgroundColor: selected ? ios.accent + '10' : ios.bgCard,
        border: selected ? `1.5px solid ${ios.accent}` : `1px solid ${ios.cardStroke}`,
      }}
    >
      <div
        className="flex h-[24px] w-[24px] items-center justify-center rounded-full"
        style={{
          backgroundColor: selected ? ios.accent : 'transparent',
          border: selected ? 'none' : `2px solid ${ios.strokeInput}`,
        }}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-[14px] font-semibold" style={{ color: ios.textPrimary }}>{name}</p>
        <p className="text-[12px]" style={{ color: ios.textSecondary }}>{url}</p>
      </div>
    </div>
  )
}
