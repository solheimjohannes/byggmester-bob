import { useRef, useState } from 'react';
// TODO: MOCK DATA — replace with real Server Actions before production
import { createPost } from '../lib/mock/queries';
import type { EventPost } from '../types';
import './EventDiscussion.css';

const MAX_CHARS = 1000;

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  initialPosts: EventPost[];
  eventId: string;
  currentUserId: string;
  isOwner: boolean;
}

export function EventDiscussion({ initialPosts, eventId, currentUserId, isOwner }: Props) {
  const [posts, setPosts] = useState<EventPost[]>(initialPosts);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const newPostRef = useRef<HTMLDivElement | null>(null);

  // TODO: add polling — replace with useInterval(() => refetch(), 15000)
  // when real backend is connected

  const charsLeft = MAX_CHARS - input.length;
  const canSubmit = input.trim().length > 0 && input.length <= MAX_CHARS && !submitting;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const post = await createPost(eventId, input.trim());
      setPosts((prev) => [...prev, post]);
      setInput('');
      setHighlightedId(post.id);
      setTimeout(() => setHighlightedId(null), 1800);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(postId: string) {
    // TODO: wire to real deletePost Server Action before production
    showToast('Delete coming soon.');
    void postId;
  }

  return (
    <section className="discussion" aria-label="Discussion">
      {toast && (
        <div className="discussion__toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <h2 className="discussion__heading">
        Discussion
        <span className="discussion__count">{posts.length}</span>
      </h2>

      <div className="discussion__list">
        {posts.length === 0 ? (
          <p className="discussion__empty">No posts yet — be the first to say something!</p>
        ) : (
          posts.map((post) => {
            const canDelete = post.authorId === currentUserId || isOwner;
            const isNew = post.id === highlightedId;
            return (
              <div
                key={post.id}
                className={`discussion__post${isNew ? ' discussion__post--new' : ''}`}
                ref={isNew ? newPostRef : null}
              >
                <div className="discussion__avatar" aria-hidden="true">
                  {post.author.image
                    ? <img src={post.author.image} alt="" className="discussion__avatar-img" />
                    : <span>{getInitials(post.author.name, post.author.email)}</span>
                  }
                </div>
                <div className="discussion__post-body">
                  <div className="discussion__post-header">
                    <span className="discussion__author">{post.author.name ?? post.author.email}</span>
                    <span className="discussion__time">{relativeTime(post.createdAt)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        className="discussion__delete"
                        aria-label="Delete post"
                        onClick={() => handleDelete(post.id)}
                        title="Delete post"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p className="discussion__content">{post.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="discussion__compose" onSubmit={handleSubmit} aria-label="Write a post">
        <textarea
          className="discussion__input"
          placeholder="Write something…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          maxLength={MAX_CHARS + 1}
          aria-label="Post content"
        />
        <div className="discussion__compose-footer">
          <span className={`discussion__counter${charsLeft < 50 ? ' discussion__counter--warn' : ''}`}>
            {input.length} / {MAX_CHARS}
          </span>
          <button
            type="submit"
            className="btn btn--primary discussion__submit"
            disabled={!canSubmit}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </section>
  );
}
