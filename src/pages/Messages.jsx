// src/pages/Messages.jsx
// Unified messaging inbox — works for both landlords and tenants
// Real-time via Supabase subscriptions

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Send, MessageSquare, Home,
  Loader2, AlertTriangle, ChevronRight,
} from 'lucide-react'

function Avatar({ name, size = 9 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={`w-${size} h-${size} rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0`}>
      <span className="text-[#1B3A6B] font-semibold text-xs">{initials}</span>
    </div>
  )
}

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const openConvId = searchParams.get('conv')

  const [role, setRole]                   = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv]       = useState(null)
  const [messages, setMessages]           = useState([])
  const [draft, setDraft]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [loading, setLoading]             = useState(true)
  const bottomRef = useRef(null)

  // ── Fetch role + conversations ──
  useEffect(() => {
    if (!user?.id) return
    async function init() {
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole(prof?.role)

      const field = prof?.role === 'landlord' ? 'landlord_id' : 'tenant_id'
      const { data } = await supabase
        .from('conversations')
        .select(`
          id, created_at, last_message_at, landlord_unread, tenant_unread,
          properties:property_id(id, street_address, neighborhood, photos, bedrooms),
          landlord:landlord_id(id, full_name),
          tenant:tenant_id(id, full_name)
        `)
        .eq(field, user.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
      setConversations(data || [])

      if (openConvId) {
        const target = data?.find(c => c.id === openConvId)
        if (target) openConversation(target, prof?.role)
      }
      setLoading(false)
    }
    init()
  }, [user?.id])

  // ── Realtime: new messages ──
  useEffect(() => {
    if (!activeConv) return
    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
        payload => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activeConv?.id])

  // ── Open a conversation ──
  async function openConversation(conv, r) {
    setActiveConv(conv)
    setMessages([])
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // Mark as read
    const unreadField = (r || role) === 'landlord' ? { landlord_unread: 0 } : { tenant_unread: 0 }
    await supabase.from('conversations').update(unreadField).eq('id', conv.id)
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, ...unreadField } : c))
  }

  // ── Send message ──
  async function sendMessage() {
    const text = draft.trim()
    if (!text || !activeConv || sending) return
    setSending(true)
    setDraft('')

    const res = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: activeConv.id,
        sender_id: user.id,
        content: text,
      }),
    })
    const data = await res.json()
    if (data.error) {
      toast.error(data.error)
      setDraft(text)
    } else if (data.flagged) {
      toast('Message sent but flagged for review.', { icon: '⚠️' })
    }
    setSending(false)
  }

  // ── Helpers ──
  function otherParty(conv) {
    return role === 'landlord' ? conv.tenant : conv.landlord
  }

  function unreadCount(conv) {
    return role === 'landlord' ? conv.landlord_unread : conv.tenant_unread
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // ── Render: conversation detail ──
  if (activeConv) {
    const other = otherParty(activeConv)
    const prop = activeConv.properties
    const address = prop?.neighborhood || prop?.street_address || 'Property'
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-0">
        {/* Header */}
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-4 shrink-0">
          <button onClick={() => setActiveConv(null)} className="text-blue-200 flex items-center gap-1.5 text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> All messages
          </button>
          <div className="flex items-center gap-3">
            <Avatar name={other?.full_name} />
            <div>
              <p className="text-white font-semibold text-sm">{other?.full_name || 'User'}</p>
              <button
                onClick={() => navigate(role === 'landlord' ? `/landlord/applications` : `/tenant/listing/${prop?.id}`)}
                className="text-blue-200 text-xs flex items-center gap-1"
              >
                <Home className="w-3 h-3" /> {address}
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === user.id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                {msg.flagged && (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    This message was flagged for review.
                  </div>
                )}
                {!msg.flagged && (
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isMe
                      ? 'bg-[#1B3A6B] text-white rounded-tr-none'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !draft.trim()}
              className="w-11 h-11 bg-[#1B3A6B] rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            Never share cash payment info or personal contact details off-platform.
          </p>
        </div>
      </div>
    )
  }

  // ── Render: conversation list ──
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <button onClick={() => navigate(-1)} className="text-blue-200 flex items-center gap-1.5 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-white text-xl font-bold">Messages</h1>
        <p className="text-blue-200 text-xs mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-4 mt-4 space-y-2">
        {loading && [1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 flex gap-3 animate-pulse border border-gray-100">
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
          </div>
        ))}

        {!loading && conversations.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {role === 'tenant' ? 'Message a landlord from any listing page.' : 'Messages from tenants will appear here.'}
            </p>
          </div>
        )}

        {conversations.map(conv => {
          const other = otherParty(conv)
          const prop = conv.properties
          const unread = unreadCount(conv)
          return (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="w-full bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 active:bg-gray-50 transition-colors text-left"
            >
              <Avatar name={other?.full_name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                    {other?.full_name || 'User'}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {prop?.neighborhood || prop?.street_address || 'Property'}
                  {prop?.bedrooms != null ? ` · ${prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms} BR`}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unread > 0 && (
                  <span className="w-5 h-5 bg-[#1D9E75] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
