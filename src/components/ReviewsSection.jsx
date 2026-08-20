// src/components/ReviewsSection.jsx
// Displays reviews for a profile/property + leave-a-review form

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Star, MessageSquare, ThumbsUp } from 'lucide-react'

function StarRating({ value, onChange, size = 'md' }) {
  const [hover, setHover] = useState(0)
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${sz} transition-colors ${
              i <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-200 fill-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  const d = new Date(review.created_at)
  const date = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const initials = (review.reviewer_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
            <span className="text-[#1B3A6B] text-xs font-semibold">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.reviewer_name || 'Tenant'}</p>
            <p className="text-[10px] text-gray-400">{date}</p>
          </div>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>
      {review.content && (
        <p className="text-sm text-gray-600 leading-relaxed">{review.content}</p>
      )}
      {(review.rating_communication || review.rating_responsiveness) && (
        <div className="flex gap-3 pt-1">
          {review.rating_communication && (
            <span className="text-[10px] text-gray-400">
              Communication: <span className="text-amber-500">{'★'.repeat(review.rating_communication)}</span>
            </span>
          )}
          {review.rating_responsiveness && (
            <span className="text-[10px] text-gray-400">
              Responsiveness: <span className="text-amber-500">{'★'.repeat(review.rating_responsiveness)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function ReviewsDisplay({ revieweeId, propertyId }) {
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!revieweeId && !propertyId) return
    async function fetchReviews() {
      let q = supabase
        .from('reviews')
        .select('*, reviewer:reviewer_id(full_name)')
        .eq('is_public', true)
        .eq('flagged', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (propertyId) q = q.eq('property_id', propertyId)
      else q = q.eq('reviewee_id', revieweeId)

      const { data } = await q
      const enriched = (data || []).map(r => ({ ...r, reviewer_name: r.reviewer?.full_name }))
      setReviews(enriched)
      if (enriched.length > 0) {
        setAvgRating((enriched.reduce((s, r) => s + r.rating, 0) / enriched.length).toFixed(1))
      }
      setLoading(false)
    }
    fetchReviews()
  }, [revieweeId, propertyId])

  if (loading) return null
  if (reviews.length === 0) return (
    <div className="text-center py-6">
      <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-1" />
      <p className="text-xs text-gray-400">No reviews yet</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-gray-900">{avgRating}</span>
        <div>
          <StarRating value={Math.round(parseFloat(avgRating))} size="sm" />
          <p className="text-xs text-gray-400 mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
    </div>
  )
}

export function LeaveReviewForm({ revieweeId, propertyId, reviewerRole = 'tenant', onDone }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [commRating, setCommRating] = useState(0)
  const [respRating, setRespRating] = useState(0)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!rating) { toast.error('Please select a star rating'); return }
    if (!user?.id) { toast.error('Please sign in to leave a review'); return }
    setSaving(true)
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      property_id: propertyId || null,
      reviewer_role: reviewerRole,
      rating,
      content: content.trim() || null,
      rating_communication: commRating || null,
      rating_responsiveness: respRating || null,
    })
    if (error) {
      if (error.code === '23505') toast.error('You already reviewed this listing.')
      else toast.error(error.message)
    } else {
      toast.success('Review submitted!')
      onDone?.()
    }
    setSaving(false)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm">Leave a review</h3>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Overall rating *</p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Your experience</p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Tell others about your experience with this landlord or property…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none"
        />
        <p className="text-[10px] text-gray-400 text-right mt-0.5">{content.length}/1000</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Communication</p>
          <StarRating value={commRating} onChange={setCommRating} size="sm" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Responsiveness</p>
          <StarRating value={respRating} onChange={setRespRating} size="sm" />
        </div>
      </div>

      <button onClick={submit} disabled={saving || !rating}
        className="w-full bg-[#1B3A6B] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
        {saving ? 'Submitting…' : 'Submit review'}
      </button>
    </div>
  )
}
