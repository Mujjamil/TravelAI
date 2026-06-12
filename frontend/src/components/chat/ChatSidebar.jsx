import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ChatSidebar({
  open,
  onClose,
  conversations = [],
  activeConversationId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const { t } = useTranslation()
  const defaultTitle = t('chat.newConversation')

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const handleStartRename = (e, conv) => {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditTitle(conv.title || defaultTitle)
  }

  const handleSaveRename = (id) => {
    if (editTitle.trim() && onRename) {
      onRename(id, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleStartDelete = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    setDeletingId(id)
  }

  const handleConfirmDelete = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    if (onDelete) onDelete(id)
    setDeletingId(null)
  }

  const handleCancelDelete = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setDeletingId(null)
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          flex flex-col bg-gradient-to-b from-slate-50 to-white border-r border-slate-200
          transition-all duration-200
          /* Mobile: fixed overlay */
          fixed inset-y-0 left-0 z-50 w-72
          md:static md:z-auto md:h-full md:translate-x-0
          ${open ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ top: 0 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200/70 flex items-center gap-2 font-sans">
          <button
            type="button"
            onClick={onCreate}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all text-sm"
          >
            + {t('chat.newConversation')}
          </button>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-sans">
          {conversations.length === 0 && (
            <p className="text-xs text-gray-400 p-2">{t('chat.noConversationsYet')}</p>
          )}
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const lastMsg = conv.messages?.[conv.messages.length - 1]?.text || t('chat.noMessagesYet')
            const isEditing = conv.id === editingId
            const isDeleting = conv.id === deletingId

            return (
              <div
                key={conv.id}
                className={`group relative flex items-center w-full rounded-xl transition-all border ${
                  isDeleting
                    ? 'bg-rose-50/50 border-rose-200 shadow-sm'
                    : isActive
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                {isDeleting ? (
                  <div className="w-full p-2 flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-rose-700 pl-2">Delete chat?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleConfirmDelete(e, conv.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow-sm"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelDelete}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold px-2 py-1 rounded-lg shadow-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="w-full p-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(conv.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 text-sm bg-white border border-blue-400 rounded-lg px-2 py-1 outline-none font-medium focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(conv.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { onSelect(conv); onClose() }}
                      className="flex-1 text-left px-3 py-3 pr-14"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        <div className="text-sm font-semibold text-slate-800 truncate max-w-[170px]">
                          {conv.title || defaultTitle}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5 pl-4 max-w-[185px]">
                        {lastMsg.replace(/\n/g, ' ')}
                      </div>
                    </button>

                    {/* Inline actions (show on hover) */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white pl-4 via-white/90 to-transparent group-hover:from-blue-50/0 py-1 rounded-r-xl">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(e, conv)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleStartDelete(e, conv.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
