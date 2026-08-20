// src/pages/AITools.jsx
// Layer 4 — AI Features: Section 8 Q&A assistant + AI Listing Writer entry point

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { ArrowLeft, Bot, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react'

const SAMPLE_QUESTIONS = [
  'How does the annual recertification process work?',
  'What do inspectors look for in an HQS inspection?',
  'Can my landlord raise my rent if I have a Section 8 voucher?',
  'What happens if I fail my HQS inspection?',
  'How long does the RFTA approval process take?',
  'What income counts toward my recertification?',
]

export default function AITools() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

  async function askQuestion(q) {
    const text = q || question.trim()
    if (!text) return
    setLoading(true)
    setQuestion('')

    const newHistory = [...history, { role: 'user', content: text }]
    setHistory(newHistory)
    setAnswer('')

    try {
      const res = await fetch('/api/ai-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, role: 'tenant' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setHistory([...newHistory, { role: 'assistant', content: data.answer }])
    } catch (err) {
      toast.error('Failed to get answer. Please try again.')
      setHistory(history) // revert
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-28">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6 shrink-0">
        <button onClick={() => navigate(-1)} className="text-blue-200 flex items-center gap-1.5 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Section 8 Assistant</h1>
            <p className="text-blue-200 text-xs mt-0.5">Powered by AI · HUD & AHA knowledge</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {history.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Try asking:</p>
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => askQuestion(q)}
                className="w-full text-left bg-white rounded-xl px-4 py-3 text-sm text-gray-700 border border-gray-100 hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-[#1B3A6B] rounded-full flex items-center justify-center mr-2 shrink-0 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#1B3A6B] text-white rounded-tr-none'
                : 'bg-white text-gray-700 shadow-sm rounded-tl-none border border-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-[#1B3A6B] rounded-full flex items-center justify-center mr-2 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 shrink-0">
        {history.length > 0 && (
          <button
            onClick={() => setHistory([])}
            className="flex items-center gap-1.5 text-xs text-gray-400 mb-2"
          >
            <RotateCcw className="w-3 h-3" /> New conversation
          </button>
        )}
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askQuestion()}
            placeholder="Ask anything about Section 8…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          />
          <button
            onClick={() => askQuestion()}
            disabled={loading || !question.trim()}
            className="w-11 h-11 bg-[#1B3A6B] rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          AI answers are informational only. Contact your housing authority for official guidance.
        </p>
      </div>
    </div>
  )
}
