import { useState, useCallback } from 'react'
import { StatusBar, TabBar, NavBar, ios } from './shared'

// ─── Shared mock data ───
// Course hierarchy: Sequential → Verticals → Blocks
// Dropdown shows verticals, progress bar shows blocks within current vertical.

type BlockType = 'html' | 'video' | 'problem' | 'discussion'
interface Block { id: string; name: string; type: BlockType; completion: number }
interface Vertical { name: string; type: BlockType; completion: number; blocks: Block[] }

const courseVerticals: Vertical[] = [
  {
    name: 'Welcome & Overview',
    type: 'html',
    completion: 1.0,
    blocks: [
      { id: '1', name: 'Welcome Message', type: 'html', completion: 1.0 },
      { id: '2', name: 'What is AI?', type: 'video', completion: 1.0 },
    ],
  },
  {
    name: 'AI Foundations',
    type: 'problem',
    completion: 0,
    blocks: [
      { id: '3', name: 'History of AI', type: 'html', completion: 0 },
      { id: '4', name: 'Quiz: AI Basics', type: 'problem', completion: 0 },
    ],
  },
  {
    name: 'Community',
    type: 'discussion',
    completion: 0,
    blocks: [
      { id: '5', name: 'Discussion', type: 'discussion', completion: 0 },
    ],
  },
]

const allBlocks: Block[] = courseVerticals.flatMap((v) => v.blocks)

function getVerticalIndex(flatIndex: number): number {
  let remaining = flatIndex
  for (let v = 0; v < courseVerticals.length; v++) {
    if (remaining < courseVerticals[v]!.blocks.length) return v
    remaining -= courseVerticals[v]!.blocks.length
  }
  return courseVerticals.length - 1
}

function getBlockIndexInVertical(flatIndex: number): number {
  let remaining = flatIndex
  for (let v = 0; v < courseVerticals.length; v++) {
    if (remaining < courseVerticals[v]!.blocks.length) return remaining
    remaining -= courseVerticals[v]!.blocks.length
  }
  return 0
}

function getFirstBlockFlatIndex(verticalIndex: number): number {
  let idx = 0
  for (let v = 0; v < verticalIndex; v++) {
    idx += courseVerticals[v]!.blocks.length
  }
  return idx
}

// ─── Block type icon ───

function BlockTypeIcon({ type, size = 11 }: { type: string; size?: number }) {
  const color = ios.textSecondary
  switch (type) {
    case 'video':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    case 'html':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
        </svg>
      )
    case 'problem':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
        </svg>
      )
    case 'discussion':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
        </svg>
      )
    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════
// ─── Block Content Components (WebView-style) ───
// ═══════════════════════════════════════════════════════════

function WelcomeContent() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#fff' }}>
      <img
        src="https://picsum.photos/seed/openedx-welcome/536/354"
        alt=""
        style={{ width: '100%', height: 120, objectFit: 'cover' }}
      />
      <div style={{ padding: '12px 14px 20px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.35 }}>
          Welcome to the Open edX® learning management system!
        </p>
        <p style={{ fontSize: 10, color: '#4B5563', lineHeight: 1.6, marginTop: 10 }}>
          The Open edX platform is one of the globe&apos;s leading open-source online learning
          platforms which has been widely adopted by educational institutions, corporations,
          governments and other organizations around the world to offer Massive Open Online
          Courses (MOOCs) and online learning programs.
        </p>
        <p style={{ fontSize: 10, color: '#4B5563', lineHeight: 1.6, marginTop: 8 }}>
          In this course, you will learn the fundamentals of Artificial Intelligence and explore
          how it is transforming industries across the globe.
        </p>
      </div>
    </div>
  )
}

function VideoContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Video player */}
      <div style={{ height: 155, backgroundColor: '#000', position: 'relative', flexShrink: 0 }}>
        <img
          src="https://picsum.photos/seed/ai-lecture/536/300"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Video progress bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.3)' }}>
          <div style={{ width: '35%', height: '100%', backgroundColor: '#FF0000' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 6, right: 8 }}>
          <span style={{ fontSize: 8, color: '#fff', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>3:24 / 9:47</span>
        </div>
      </div>

      {/* Subtitles area */}
      <div style={{ flex: 1, backgroundColor: '#fff', overflowY: 'auto', padding: '10px 14px 20px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Subtitles</h3>
        <p style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>[music playing]</p>
        <p style={{ fontSize: 10, color: '#2563EB', lineHeight: 1.65, marginBottom: 8 }}>
          The Open edX® platform is the free to use learning management system developed by Harvard
          and MIT and with the stated mission to democratize education and power advances in learning.
        </p>
        <p style={{ fontSize: 10, color: '#2563EB', lineHeight: 1.65, marginBottom: 8 }}>
          Today, the Open edX® software is in use by over 4,500 organizations teaching over 70 million
          learners across 50 languages and a hundred different countries.
        </p>
        <p style={{ fontSize: 10, color: '#2563EB', lineHeight: 1.65 }}>
          The Open edX® platform is an all in one solution that includes a traditional student facing
          LMS, a CMS backend for creating courses, mobile apps for iOS and Android, and analytics.
        </p>
      </div>
    </div>
  )
}

function ReadingContent() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#fff', padding: '14px 14px 20px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 8 }}>
        A Brief History of Artificial Intelligence
      </h2>
      <p style={{ fontSize: 10, color: '#4B5563', lineHeight: 1.65, marginBottom: 10 }}>
        The concept of artificial intelligence dates back to ancient myths and stories of artificial
        beings endowed with intelligence. However, the formal field of AI research was founded at a
        workshop held at Dartmouth College in 1956.
      </p>
      <img
        src="https://picsum.photos/seed/ai-history/400/200"
        alt=""
        style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginBottom: 10 }}
      />
      <p style={{ fontSize: 10, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>
        Key milestones in AI history:
      </p>
      <div style={{ fontSize: 10, color: '#4B5563', lineHeight: 1.75, paddingLeft: 8 }}>
        <p style={{ margin: '0 0 2px' }}>• 1950 — Alan Turing proposes the Turing Test</p>
        <p style={{ margin: '0 0 2px' }}>• 1956 — Dartmouth Workshop: birth of AI</p>
        <p style={{ margin: '0 0 2px' }}>• 1997 — Deep Blue defeats Garry Kasparov</p>
        <p style={{ margin: '0 0 2px' }}>• 2011 — IBM Watson wins Jeopardy!</p>
        <p style={{ margin: 0 }}>• 2012 — Deep learning breakthrough</p>
      </div>
      <p style={{ fontSize: 10, color: '#4B5563', lineHeight: 1.65, marginTop: 10 }}>
        The modern era of AI has been marked by significant advances in machine learning, particularly
        deep learning, which has enabled breakthroughs in computer vision, natural language processing,
        and game playing.
      </p>
    </div>
  )
}

function ProblemContent({
  selectedAnswer,
  onSelectAnswer,
}: {
  selectedAnswer: number | null
  onSelectAnswer: (i: number) => void
}) {
  const options = ['Supervised Learning', 'Unsupervised Learning', 'Compiled Learning', 'Reinforcement Learning']

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#fff', padding: '14px 14px 20px' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 2 }}>
        Multiple Choice
      </h2>
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>1 point possible (graded)</span>

      <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, margin: '14px 0 12px' }}>
        Which of the following is <strong>NOT</strong> a type of machine learning?
      </p>

      {options.map((opt, i) => {
        const isSelected = selectedAnswer === i
        return (
          <div
            key={i}
            onClick={() => onSelectAnswer(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 4,
              border: `1px solid ${isSelected ? '#0077B6' : '#E5E7EB'}`,
              marginBottom: 6,
              cursor: 'pointer',
              backgroundColor: '#fff',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                flexShrink: 0,
                border: isSelected ? 'none' : '2px solid #D1D5DB',
                backgroundColor: isSelected ? '#0077B6' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && (
                <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
              )}
            </div>
            <span style={{ fontSize: 11, color: '#374151' }}>{opt}</span>
          </div>
        )
      })}

      <button
        style={{
          width: '100%',
          height: 38,
          borderRadius: 4,
          backgroundColor: '#0077B6',
          border: 'none',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          marginTop: 10,
          cursor: 'pointer',
        }}
      >
        Submit
      </button>
    </div>
  )
}

function DiscussionContent() {
  return (
    <div style={{ padding: '14px 14px', height: '100%', overflowY: 'auto', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
          <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>Discussion</span>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1F2937' }}>
          Share your thoughts on AI
        </span>
        <p style={{ fontSize: 10, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>
          What areas of artificial intelligence excite you the most? How do you think AI will
          impact your field of study or work?
        </p>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4A90D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>S</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, color: '#1F2937' }}>Sarah M.</span>
          <span style={{ fontSize: 8, color: '#9CA3AF' }}>· 2h ago</span>
        </div>
        <p style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.5 }}>
          I&apos;m really excited about NLP and how it can make education more accessible to students
          worldwide. The potential for AI tutoring systems is amazing!
        </p>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#E67E22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>J</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, color: '#1F2937' }}>James K.</span>
          <span style={{ fontSize: 8, color: '#9CA3AF' }}>· 5h ago</span>
        </div>
        <p style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.5 }}>
          Computer vision is fascinating to me. Self-driving cars and medical imaging are going to
          change the world.
        </p>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>Add a response...</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ─── Unified Course Content Screen ───
//
// Single interactive screen matching CourseUnitView.swift design.
// No TabBar — matches real iOS behavior where tab bar is hidden
// inside a course unit.
//
// Scale: 280px preview ÷ 393pt iPhone ≈ 0.712
//   42pt → 30px   24pt → 17px   50pt → 36px
//    8pt → 6px    10pt → 7px    14pt → 10px
//   48pt → 34px   22pt → 16px
// ═══════════════════════════════════════════════════════════

interface CourseContentScreenProps {
  showProgress?: boolean
  showDropdownNav?: boolean
}

export function CourseContentScreen({
  showProgress = false,
  showDropdownNav = false,
}: CourseContentScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0) // flat index across all blocks
  const [selectedAnswer, setSelectedAnswer] = useState<number>(2)
  const [showDropdown, setShowDropdown] = useState(false)
  // Track visited blocks so the progress bar fills progressively as the user navigates
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))

  const currentBlock = allBlocks[currentIndex]!
  const vIdx = getVerticalIndex(currentIndex)
  const bIdx = getBlockIndexInVertical(currentIndex)
  const currentVertical = courseVerticals[vIdx]!
  const isFirst = currentIndex === 0
  const isLast = currentIndex === allBlocks.length - 1

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.min(allBlocks.length - 1, prev + 1)
      setVisited((v) => new Set(v).add(next))
      return next
    })
    setShowDropdown(false)
  }, [])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.max(0, prev - 1)
      setVisited((v) => new Set(v).add(next))
      return next
    })
    setShowDropdown(false)
  }, [])

  const goToVertical = useCallback((verticalIndex: number) => {
    const flatIdx = getFirstBlockFlatIndex(verticalIndex)
    setCurrentIndex(flatIdx)
    setVisited((v) => new Set(v).add(flatIdx))
    setShowDropdown(false)
  }, [])

  const renderContent = () => {
    switch (currentBlock.id) {
      case '1':
        return <WelcomeContent />
      case '3':
        return <ReadingContent />
      default:
        break
    }
    switch (currentBlock.type) {
      case 'video':
        return <VideoContent />
      case 'problem':
        return <ProblemContent selectedAnswer={selectedAnswer} onSelectAnswer={setSelectedAnswer} />
      case 'discussion':
        return <DiscussionContent />
      default:
        return <WelcomeContent />
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />

      {/* ── Navigation Bar ──
          Custom bar matching CourseUnitView.swift: .navigationBarHidden(true)
          Back chevron (accent) + centered title (16px bold) */}
      <div
        className="relative flex items-center justify-center"
        style={{ padding: '2px 17px 4px', minHeight: 30 }}
      >
        <div className="absolute left-[17px] flex items-center">
          <svg
            width="8"
            height="14"
            viewBox="0 0 10 16"
            fill="none"
            stroke={ios.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2L2 8l6 6" />
          </svg>
        </div>
        <span
          className="font-semibold"
          style={{ fontSize: 12, color: ios.textPrimary, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          Introduction to AI
        </span>
      </div>

      {/* ── Dropdown Title ── (CourseUnitDropDownTitle.swift)
          bodyMedium 14pt → 10px, padding horizontal 48pt → 34px
          chevron.down rotates when open */}
      {showDropdownNav && (
        <div style={{ padding: '0 34px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: ios.textPrimary,
                opacity: showDropdown ? 0.7 : 1,
                transition: 'opacity 0.15s',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentVertical.name}
            </span>
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill={ios.textPrimary}
              style={{
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-out',
              }}
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Progress Bar ── (LessonLineProgressView.swift)
          Total height 10pt → 7px, bar 5pt → 4px, selected 7pt → 5px
          Spacing 8pt → 6px, padding top 4pt → 3px */}
      {showProgress && (
        <div style={{ paddingTop: 3 }}>
          <div style={{ height: 7, display: 'flex', alignItems: 'center', backgroundColor: ios.bg }}>
            <div style={{ display: 'flex', gap: 6, height: 4, width: '100%' }}>
              {currentVertical.blocks.map((block, i) => {
                const flatIdx = getFirstBlockFlatIndex(vIdx) + i
                const isSelected = i === bIdx
                const isDone = block.completion === 1.0 || visited.has(flatIdx)

                let color: string
                if (isSelected && isDone) {
                  color = '#6EC6FF' // progressSelectedAndDone
                } else if (isSelected) {
                  color = ios.accent // onProgress
                } else if (isDone) {
                  color = '#3A99E8' // progressDone
                } else {
                  color = '#2F3B4E' // progressSkip
                }

                return (
                  <div
                    key={block.id}
                    style={{
                      flex: 1,
                      height: isSelected ? 5 : 4,
                      backgroundColor: color,
                      transition: 'all 0.2s ease',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Content zone ──
          Without progress bar: rounded top corners + stroke (roundedBackgroundWeb)
          With progress bar: square, edge-to-edge */}
      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        style={{
          backgroundColor: '#fff',
          ...(showProgress
            ? {}
            : {
                borderTopLeftRadius: 17,
                borderTopRightRadius: 17,
                border: '0.7px solid #E0E0E0',
                borderBottom: 'none',
                marginTop: 4,
              }),
        }}
      >
        {/* Scrollable content */}
        <div className="relative flex-1 overflow-hidden">
          <div
            key={currentBlock.id}
            style={{
              animation: 'ccs-fadeIn 0.2s ease',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {renderContent()}
          </div>

          {/* ── Dropdown Overlay ── */}
          {showDropdown && showDropdownNav && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <div
                onClick={() => setShowDropdown(false)}
                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.15)' }}
              />
              <div
                style={{
                  position: 'relative',
                  margin: '0 14px',
                  borderRadius: 7,
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                  maxHeight: 285,
                  overflow: 'auto',
                  animation: 'ccs-dropSlide 0.2s ease-out',
                  border: '0.5px solid #E0E0E0',
                }}
              >
                {courseVerticals.map((vertical, index) => {
                  const isSelected = index === vIdx
                  const isLastItem = index === courseVerticals.length - 1
                  const firstFlat = getFirstBlockFlatIndex(index)
                  const isDone = vertical.completion === 1.0 ||
                    vertical.blocks.every((_, i) => visited.has(firstFlat + i))

                  return (
                    <div key={index}>
                      <button
                        onClick={() => goToVertical(index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '6px 14px',
                          background: isSelected ? 'rgba(66,170,255,0.08)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          gap: 0,
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 18, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                          {isDone && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={ios.accent}>
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </div>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 10,
                            fontWeight: isSelected ? 600 : 500,
                            color: '#1F2937',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginLeft: 2,
                          }}
                        >
                          {vertical.name}
                        </span>
                        <div style={{ flexShrink: 0, marginLeft: 4 }}>
                          <BlockTypeIcon type={vertical.type} size={10} />
                        </div>
                      </button>

                      {!isLastItem && (
                        <div style={{ height: 0.5, backgroundColor: '#E5E7EB', margin: '0 14px' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation Buttons on white bg ── (CourseNavigationView.swift)
            Prev: white bg, 1pt accent border | Next: accent bg, shadow */}
        <div
          style={{
            padding: '8px 17px',
            paddingBottom: 36,
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {!isFirst && (
            <button
              onClick={goPrev}
              style={{
                flex: 1,
                height: 30,
                borderRadius: 6,
                backgroundColor: '#fff',
                border: `1px solid ${ios.accent}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <svg width="7" height="10" viewBox="0 0 10 16" fill="none" stroke={ios.accent} strokeWidth="2" strokeLinecap="round">
                <path d="M8 2L2 8l6 6" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 500, color: ios.accent }}>Previous</span>
            </button>
          )}
          <button
            onClick={isLast ? undefined : goNext}
            style={{
              flex: isFirst ? undefined : 1,
              width: isFirst ? 153 : undefined,
              marginLeft: isFirst ? 'auto' : undefined,
              height: 30,
              borderRadius: 6,
              backgroundColor: ios.accent,
              border: `1px solid ${ios.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              boxShadow: '0 3px 15px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>
              {isLast ? 'Finish' : 'Next'}
            </span>
            {isLast ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg width="7" height="10" viewBox="0 0 10 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ccs-fadeIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes ccs-dropSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ─── Downloads Screen ───
export function DownloadsScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />
      <div className="px-5 pt-2">
        <h1 className="text-[28px] font-bold" style={{ color: ios.textPrimary }}>Downloads</h1>
        <p className="text-[14px]" style={{ color: ios.textSecondary }}>Manage offline content</p>
      </div>

      <div className="mt-5 space-y-3 px-5">
        <DownloadItem title="AI For Beginners" size="245 MB" progress={100} />
        <DownloadItem title="Open edX Demo Course" size="180 MB" progress={65} />
        <DownloadItem title="Data Science 101" size="320 MB" progress={0} />
      </div>

      <div className="mx-5 mt-5 rounded-lg p-4" style={{ backgroundColor: ios.bgCard }}>
        <div className="flex items-center justify-between">
          <span className="text-[13px]" style={{ color: ios.textSecondary }}>Total Downloaded</span>
          <span className="text-[13px] font-semibold" style={{ color: ios.textPrimary }}>425 MB</span>
        </div>
        <div className="mt-2 h-[6px] overflow-hidden rounded-full" style={{ backgroundColor: ios.bgInput }}>
          <div className="h-full w-[30%] rounded-full" style={{ backgroundColor: ios.accent }} />
        </div>
      </div>

      <TabBar active="learn" />
    </div>
  )
}

function DownloadItem({ title, size, progress }: { title: string; size: string; progress: number }) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: ios.bgCard }}>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold" style={{ color: ios.textPrimary }}>{title}</span>
        <span className="text-[12px]" style={{ color: ios.textSecondary }}>{size}</span>
      </div>
      <div className="mt-2 h-[4px] overflow-hidden rounded-full" style={{ backgroundColor: ios.bgInput }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: ios.accent }} />
      </div>
      <div className="mt-1 flex items-center gap-1">
        {progress === 100 && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ios.success} strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <span className="text-[11px]" style={{ color: progress === 100 ? ios.success : ios.textSecondary }}>
          {progress === 100 ? 'Downloaded' : progress > 0 ? `${progress}% downloading...` : 'Not downloaded'}
        </span>
      </div>
    </div>
  )
}

// ─── SCORM Support Screen ───
export function SCORMSupportScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />
      <NavBar title="Course Materials" />

      <div className="mx-5 mt-3 flex-1 overflow-hidden rounded-lg" style={{ backgroundColor: '#ffffff' }}>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-[28px] w-[28px] items-center justify-center rounded-md" style={{ backgroundColor: ios.accent + '20' }}>
              <span className="text-[14px]">📦</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">Interactive Module</p>
              <p className="text-[10px] text-gray-500">SCORM 1.2 Package</p>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="h-2.5 w-3/4 rounded bg-gray-300" />
            <div className="mt-2 h-2 w-full rounded bg-gray-200" />
            <div className="mt-1.5 h-2 w-5/6 rounded bg-gray-200" />
            <div className="mt-3 h-[60px] rounded bg-gray-100" />
            <div className="mt-3 flex gap-2">
              <div className="h-[30px] flex-1 rounded-md bg-blue-100" />
              <div className="h-[30px] flex-1 rounded-md bg-blue-100" />
            </div>
            <div className="mt-2 flex gap-2">
              <div className="h-[30px] flex-1 rounded-md bg-blue-100" />
              <div className="h-[30px] flex-1 rounded-md bg-blue-100" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Slide 3 of 8</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="h-[4px] w-[12px] rounded-full"
                  style={{ backgroundColor: i <= 3 ? '#3B82F6' : '#E5E7EB' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="mx-5 mb-16 mt-3 flex items-center gap-2 rounded-lg px-4 py-2.5"
        style={{ backgroundColor: ios.warning + '15', border: `1px solid ${ios.warning}30` }}
      >
        <span className="text-[12px]">⚠️</span>
        <span className="text-[11px]" style={{ color: ios.warning }}>
          Content must be mobile-responsive
        </span>
      </div>

      <TabBar active="learn" />
    </div>
  )
}
