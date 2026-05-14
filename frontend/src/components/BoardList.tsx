"use client";

import { useState, useRef, useEffect } from "react";

export type BoardSummary = {
  id: string;
  title: string;
  created_at: string;
  archived?: number;
};

type BoardListProps = {
  boards: BoardSummary[];
  activeBoardId: string | null;
  onSelect: (boardId: string) => void;
  onCreate: () => void;
  onRename: (boardId: string, title: string) => void;
  onDelete: (boardId: string) => void;
  onArchive?: (boardId: string) => void;
  onUnarchive?: (boardId: string) => void;
};

export const BoardList = ({
  boards,
  activeBoardId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onArchive,
  onUnarchive,
}: BoardListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
        setConfirmDeleteId(null);
        setShowArchived(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const handleStartRename = (board: BoardSummary) => {
    setEditingId(board.id);
    setEditTitle(board.title);
  };

  const handleFinishRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleConfirmDelete = (boardId: string) => {
    onDelete(boardId);
    setConfirmDeleteId(null);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--dark-teal)] shadow-[var(--shadow)] transition hover:border-[var(--accent-turquoise)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="7" y="2" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="max-w-[200px] truncate">{activeBoard?.title || "Select Board"}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[var(--stroke)] bg-white/95 p-2 shadow-lg backdrop-blur">
          <div className="max-h-[400px] overflow-y-auto">
            {boards.map((board) => (
              <div key={board.id} className="group">
                {editingId === board.id ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2">
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded-lg border border-[var(--accent-turquoise)] px-2 py-1 text-sm outline-none"
                    />
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition cursor-pointer ${
                      board.id === activeBoardId
                        ? "bg-[var(--accent-turquoise)]/10 text-[var(--accent-turquoise)]"
                        : "text-[var(--dark-teal)] hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      onSelect(board.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className="truncate text-sm font-medium">{board.title}</span>
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartRename(board); }}
                        className="rounded-lg p-1 text-[var(--gray-text)] transition hover:bg-gray-100 hover:text-[var(--dark-teal)]"
                        aria-label={`Rename ${board.title}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {boards.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(board.id); }}
                          className="rounded-lg p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`Delete ${board.title}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 2h8M4.5 2V1h3v1M3 2v8.5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {confirmDeleteId === board.id && (
                  <div className="mx-3 mb-1 mt-1 rounded-xl bg-red-50 px-3 py-2">
                    <p className="text-xs font-medium text-red-700">Delete &ldquo;{board.title}&rdquo;?</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleConfirmDelete(board.id)}
                        className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-1 border-t border-[var(--stroke)] pt-1">
            {boards.some((b) => b.archived) && (
              <div className="mb-1">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:bg-gray-50"
                >
                  <span>Archived ({boards.filter((b) => b.archived).length})</span>
                  <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    className={`transition-transform ${showArchived ? "rotate-180" : ""}`}
                  >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showArchived && boards.filter((b) => b.archived).map((board) => (
                  <div key={board.id} className="flex items-center justify-between rounded-xl px-3 py-2 text-[var(--gray-text)]">
                    <span className="truncate text-xs font-medium opacity-60">{board.title}</span>
                    <div className="flex items-center gap-1">
                      {onUnarchive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUnarchive(board.id); }}
                          className="rounded-lg p-1 text-[var(--gray-text)] transition hover:bg-green-50 hover:text-green-500"
                          aria-label={`Unarchive ${board.title}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => { onCreate(); setIsOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--accent-turquoise)] transition hover:bg-[var(--accent-turquoise)]/5"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New Board
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
