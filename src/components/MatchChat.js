import React, { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { python } from '@codemirror/lang-python';
import { css as cssLanguage } from '@codemirror/lang-css';
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import JSZip from 'jszip';
import chatService from '../services/chatService';
import collabEditorService from '../services/collabEditorService';
import storageService from '../services/storageService';
import { getUserImageCandidates, loadNextImageCandidate } from '../utils/userImage';

function formatMessageTime(timestamp) {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isSameMessage(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.id && right.id) {
    return left.id === right.id;
  }
  return (
    left.senderId === right.senderId
    && left.receiverId === right.receiverId
    && left.text === right.text
    && left.timestamp === right.timestamp
  );
}

function dedupeMessages(messages) {
  return messages.reduce((acc, message) => {
    if (acc.some((item) => isSameMessage(item, message))) {
      return acc;
    }
    return [...acc, message];
  }, []);
}

function upsertEditorFile(files, nextFile) {
  if (!nextFile) {
    return files;
  }
  const index = files.findIndex((file) => file.id === nextFile.id);
  if (index === -1) {
    return [...files, nextFile];
  }
  const updated = [...files];
  updated[index] = { ...updated[index], ...nextFile };
  return updated;
}

function removeEditorFile(files, fileId) {
  return files.filter((file) => file.id !== fileId);
}

function makeNextFileName(files) {
  const existingNames = new Set(files.map((file) => file.name));
  let index = 1;
  while (existingNames.has(`memo-${index}.txt`)) {
    index += 1;
  }
  return `memo-${index}.txt`;
}

function sanitizeFileName(name, fallback = 'memo.txt') {
  const raw = typeof name === 'string' ? name.trim() : '';
  const normalized = (raw || fallback).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
  return normalized || fallback;
}

function createUniqueFileName(name, usedNames) {
  const dotIndex = name.lastIndexOf('.');
  const hasExtension = dotIndex > 0 && dotIndex < name.length - 1;
  const base = hasExtension ? name.slice(0, dotIndex) : name;
  const ext = hasExtension ? name.slice(dotIndex) : '';

  let candidate = name;
  let index = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base} (${index})${ext}`;
    index += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function isOlderUpdate(currentFile, nextFile) {
  if (!currentFile || !nextFile) {
    return false;
  }
  if (typeof currentFile.updatedAt !== 'number' || typeof nextFile.updatedAt !== 'number') {
    return false;
  }
  return nextFile.updatedAt < currentFile.updatedAt;
}

/**
 * @param {{ matchId: string, currentUser: Object, onSend: (matchId: string, text:string) => void, onBack?: () => void }} props
 */
function MatchChat({ matchId, currentUser, onSend, onBack }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [matchUser, setMatchUser] = useState(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorFiles, setEditorFiles] = useState([]);
  const [activeEditorFileId, setActiveEditorFileId] = useState(null);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editorError, setEditorError] = useState('');
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const localRevisionByFileRef = useRef({});
  const lastAppliedRevisionByFileRef = useRef({});
  const dirtyFileIdsRef = useRef(new Set());
  const messagesContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);

  useEffect(() => {
    const fetchMatchUser = async () => {
      const user = await storageService.getUserById(matchId);
      setMatchUser(user);
    };
    if (matchId) {
      fetchMatchUser();
    }
  }, [matchId]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const loaded = await chatService.getMessages(currentUser.id, matchId);
        setMessages(dedupeMessages(loaded));
        await chatService.markMessagesAsRead(currentUser.id, matchId);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      }
    };
    fetchMessages();

    const channel = chatService.subscribe((event) => {
      if (event.matchKey !== chatService.getMatchKey(currentUser.id, matchId)) {
        return;
      }
      if (event.type === 'message') {
        setMessages((prev) => (prev.some((item) => isSameMessage(item, event)) ? prev : [...prev, event]));
        return;
      }
      if (event.type === 'read') {
        chatService.getMessages(currentUser.id, matchId).then((loaded) => setMessages(dedupeMessages(loaded)));
      }
    });
    return () => channel.unsubscribe();
  }, [currentUser.id, matchId]);

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    localRevisionByFileRef.current = {};
    lastAppliedRevisionByFileRef.current = {};
    dirtyFileIdsRef.current = new Set();
    setIsEditorOpen(false);
    setEditorFiles([]);
    setActiveEditorFileId(null);
    setEditorError('');
  }, [matchId]);

  useEffect(() => {
    if (!currentUser?.id || !matchId) {
      return undefined;
    }

    const channel = collabEditorService.subscribe(currentUser.id, matchId, (event) => {
      if (event.type === 'editor:file-deleted' && event.fileId) {
        setEditorFiles((prev) => removeEditorFile(prev, event.fileId));
        setActiveEditorFileId((prev) => (prev === event.fileId ? null : prev));
        if (pendingSaveRef.current?.fileId === event.fileId) {
          pendingSaveRef.current = null;
        }
        delete localRevisionByFileRef.current[event.fileId];
        delete lastAppliedRevisionByFileRef.current[event.fileId];
        dirtyFileIdsRef.current.delete(event.fileId);
        return;
      }
      if (!event.file) {
        return;
      }
      setEditorFiles((prev) => {
        const current = prev.find((file) => file.id === event.file.id);
        if (current && isOlderUpdate(current, event.file)) {
          return prev;
        }
        if (current && dirtyFileIdsRef.current.has(event.file.id)) {
          // Preserve local draft while edits are unsaved to avoid cursor jumps/reverts.
          return upsertEditorFile(prev, { ...event.file, content: current.content });
        }
        return upsertEditorFile(prev, event.file);
      });
      if (event.type === 'editor:file-created') {
        setActiveEditorFileId((prev) => prev || event.file.id);
      }
    });

    return () => channel.unsubscribe();
  }, [currentUser?.id, matchId]);

  useEffect(() => {
    if (!isEditorOpen || !currentUser?.id || !matchId) {
      return;
    }

    let cancelled = false;
    const loadFiles = async () => {
      setIsEditorLoading(true);
      setEditorError('');
      try {
        let loadedFiles = await collabEditorService.getFiles(currentUser.id, matchId);
        if (!Array.isArray(loadedFiles)) {
          loadedFiles = [];
        }

        if (!cancelled && loadedFiles.length === 0) {
          const created = await collabEditorService.createFile(currentUser.id, matchId, 'memo-1.txt');
          loadedFiles = created ? [created] : [];
        }

        if (cancelled) {
          return;
        }

        setEditorFiles(loadedFiles);
        setActiveEditorFileId((prev) => (
          prev && loadedFiles.some((file) => file.id === prev)
            ? prev
            : (loadedFiles[0]?.id || null)
        ));
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load editor files:', error);
          setEditorError('エディタファイルの取得に失敗しました。');
        }
      } finally {
        if (!cancelled) {
          setIsEditorLoading(false);
        }
      }
    };

    loadFiles();

    return () => {
      cancelled = true;
    };
  }, [isEditorOpen, currentUser?.id, matchId]);

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    pendingSaveRef.current = null;
    dirtyFileIdsRef.current = new Set();
  }, []);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }
    shouldScrollToBottomRef.current = false;
    if (!messagesContainerRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      if (!messagesContainerRef.current) {
        return;
      }
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const message = await onSend(matchId, trimmed);
    setText('');
    if (message) {
      shouldScrollToBottomRef.current = true;
      setMessages((prev) => (prev.some((item) => isSameMessage(item, message)) ? prev : [...prev, message]));
    }
  };

  const handleCreateFile = async () => {
    if (!currentUser?.id || !matchId) {
      return;
    }

    await flushPendingSave(activeEditorFileId);

    try {
      const fileName = makeNextFileName(editorFiles);
      const created = await collabEditorService.createFile(currentUser.id, matchId, fileName);
      if (!created) {
        return;
      }
      setEditorFiles((prev) => upsertEditorFile(prev, created));
      setActiveEditorFileId(created.id);
      setEditorError('');
    } catch (error) {
      console.error('Failed to create editor file:', error);
      setEditorError('ファイル作成に失敗しました。');
    }
  };

  const activeEditorFile = useMemo(() => {
    return editorFiles.find((file) => file.id === activeEditorFileId) || null;
  }, [editorFiles, activeEditorFileId]);

  useEffect(() => {
    if (editorFiles.length === 0) {
      if (activeEditorFileId) {
        setActiveEditorFileId(null);
      }
      return;
    }
    if (!activeEditorFileId || !editorFiles.some((file) => file.id === activeEditorFileId)) {
      setActiveEditorFileId(editorFiles[0].id);
    }
  }, [editorFiles, activeEditorFileId]);

  useEffect(() => {
    const existingIds = new Set(editorFiles.map((file) => file.id));
    Object.keys(localRevisionByFileRef.current).forEach((fileId) => {
      if (!existingIds.has(fileId)) {
        delete localRevisionByFileRef.current[fileId];
      }
    });
    Object.keys(lastAppliedRevisionByFileRef.current).forEach((fileId) => {
      if (!existingIds.has(fileId)) {
        delete lastAppliedRevisionByFileRef.current[fileId];
      }
    });
    dirtyFileIdsRef.current.forEach((fileId) => {
      if (!existingIds.has(fileId)) {
        dirtyFileIdsRef.current.delete(fileId);
      }
    });
  }, [editorFiles]);

  const persistEditorContent = async (fileId, content, revision = null) => {
    if (!currentUser?.id || !matchId || !fileId) {
      return;
    }
    try {
      const updated = await collabEditorService.updateFile(currentUser.id, matchId, fileId, {
        content
      });
      if (!updated) {
        return;
      }
      if (revision !== null) {
        const latestRevision = localRevisionByFileRef.current[fileId] || 0;
        const lastAppliedRevision = lastAppliedRevisionByFileRef.current[fileId] || 0;
        if (revision < latestRevision || revision < lastAppliedRevision) {
          return;
        }
        lastAppliedRevisionByFileRef.current[fileId] = revision;
        dirtyFileIdsRef.current.delete(fileId);
      }
      setEditorFiles((prev) => {
        const current = prev.find((file) => file.id === fileId);
        if (current && isOlderUpdate(current, updated)) {
          return prev;
        }
        return upsertEditorFile(prev, updated);
      });
    } catch (error) {
      console.error('Failed to update editor file:', error);
    }
  };

  const flushPendingSave = async (onlyFileId = null) => {
    const pending = pendingSaveRef.current;
    if (!pending) {
      return;
    }
    if (onlyFileId && pending.fileId !== onlyFileId) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    await persistEditorContent(pending.fileId, pending.content, pending.revision ?? null);
  };

  const handleDownloadAllFiles = async () => {
    if (!currentUser?.id || !matchId || editorFiles.length === 0 || isDownloading) {
      return;
    }

    setIsDownloading(true);
    try {
      await flushPendingSave(activeEditorFileId);

      let filesToDownload = editorFiles;
      try {
        const latestFiles = await collabEditorService.getFiles(currentUser.id, matchId);
        if (Array.isArray(latestFiles) && latestFiles.length > 0) {
          filesToDownload = latestFiles;
          setEditorFiles(latestFiles);
        }
      } catch {
        // fallback to current in-memory data
      }

      if (!Array.isArray(filesToDownload) || filesToDownload.length === 0) {
        setEditorError('ダウンロード対象のファイルがありません。');
        return;
      }

      const zip = new JSZip();
      const usedNames = new Set();
      filesToDownload.forEach((file) => {
        const safeName = sanitizeFileName(file.name, 'memo.txt');
        const uniqueName = createUniqueFileName(safeName, usedNames);
        zip.file(uniqueName, file.content || '');
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const label = (matchUser?.displayName || matchId || 'chat').replace(/[^\w.-]+/g, '_');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const anchor = document.createElement('a');
      const url = URL.createObjectURL(blob);
      anchor.href = url;
      anchor.download = `editor-files-${label}-${stamp}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setEditorError('');
    } catch (error) {
      console.error('Failed to download editor files:', error);
      setEditorError('ファイルのダウンロードに失敗しました。');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEditorChange = (nextContent) => {
    if (!activeEditorFile || !currentUser?.id || !matchId) {
      return;
    }

    const targetFileId = activeEditorFile.id;
    const nextRevision = (localRevisionByFileRef.current[targetFileId] || 0) + 1;
    localRevisionByFileRef.current[targetFileId] = nextRevision;
    dirtyFileIdsRef.current.add(targetFileId);
    setEditorFiles((prev) => prev.map((file) => (
      file.id === targetFileId ? { ...file, content: nextContent } : file
    )));
    pendingSaveRef.current = { fileId: targetFileId, content: nextContent, revision: nextRevision };

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const pending = pendingSaveRef.current;
      if (!pending || pending.fileId !== targetFileId) {
        return;
      }
      saveTimerRef.current = null;
      pendingSaveRef.current = null;
      await persistEditorContent(pending.fileId, pending.content, pending.revision ?? null);
    }, 220);
  };

  const handleSelectEditorFile = async (fileId) => {
    if (fileId === activeEditorFileId) {
      return;
    }
    await flushPendingSave(activeEditorFileId);
    setActiveEditorFileId(fileId);
  };

  const handleRenameActiveFile = async () => {
    if (!activeEditorFile || !currentUser?.id || !matchId) {
      return;
    }

    const nameInput = window.prompt('ファイル名を入力してください', activeEditorFile.name || '');
    if (nameInput === null) {
      return;
    }
    const nextName = nameInput.trim();
    if (!nextName || nextName === activeEditorFile.name) {
      return;
    }

    await flushPendingSave(activeEditorFile.id);
    try {
      const updated = await collabEditorService.updateFile(currentUser.id, matchId, activeEditorFile.id, {
        name: nextName
      });
      if (!updated) {
        return;
      }
      setEditorFiles((prev) => upsertEditorFile(prev, updated));
      setEditorError('');
    } catch (error) {
      console.error('Failed to rename editor file:', error);
      setEditorError('ファイル名の変更に失敗しました。');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!fileId || !currentUser?.id || !matchId) {
      return;
    }
    const target = editorFiles.find((file) => file.id === fileId);
    if (!target) {
      return;
    }
    const ok = window.confirm(`「${target.name}」を削除しますか？`);
    if (!ok) {
      return;
    }

    await flushPendingSave(fileId);
    try {
      const removed = await collabEditorService.deleteFile(currentUser.id, matchId, fileId);
      if (!removed) {
        return;
      }
      setEditorFiles((prev) => {
        const next = removeEditorFile(prev, fileId);
        setActiveEditorFileId((currentActiveId) => {
          if (currentActiveId !== fileId) {
            return currentActiveId;
          }
          return next[0]?.id || null;
        });
        return next;
      });
      delete localRevisionByFileRef.current[fileId];
      delete lastAppliedRevisionByFileRef.current[fileId];
      dirtyFileIdsRef.current.delete(fileId);
      setEditorError('');
    } catch (error) {
      console.error('Failed to delete editor file:', error);
      setEditorError('ファイル削除に失敗しました。');
    }
  };

  const handleToggleEditor = async () => {
    if (isEditorOpen) {
      await flushPendingSave(activeEditorFileId);
    }
    setIsEditorOpen((prev) => !prev);
  };

  const handleCloseEditor = async () => {
    await flushPendingSave(activeEditorFileId);
    setIsEditorOpen(false);
  };

  const languageExtension = useMemo(() => {
    const fileName = (activeEditorFile?.name || '').toLowerCase();
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      return html();
    }
    if (fileName.endsWith('.py')) {
      return python();
    }
    if (fileName.endsWith('.ts')) {
      return javascript({ typescript: true });
    }
    if (fileName.endsWith('.tsx')) {
      return javascript({ typescript: true, jsx: true });
    }
    if (fileName.endsWith('.css')) {
      return cssLanguage();
    }
    return javascript({ jsx: true });
  }, [activeEditorFile?.name]);

  const codeMirrorExtensions = useMemo(() => ([
    languageExtension,
    EditorView.domEventHandlers({
      keydown: (event, view) => {
        if (event.key !== 'Tab') {
          return false;
        }
        event.preventDefault();
        if (event.shiftKey) {
          return true;
        }
        return acceptCompletion(view) || startCompletion(view) || true;
      }
    }),
    Prec.highest(keymap.of([{
      key: 'Tab',
      run: (view) => acceptCompletion(view) || startCompletion(view) || true
    }, {
      key: 'Shift-Tab',
      run: () => true
    }]))
  ]), [languageExtension]);

  const avatarCandidates = useMemo(() => getUserImageCandidates(matchUser, 220), [matchUser]);

  return (
    <section className={`chat-room ${isEditorOpen ? 'chat-room--editor-open' : ''}`} aria-label="チャット画面">
      <div className="chat-room__chat-pane">
        <header className="chat-room__header">
          <button
            type="button"
            className="chat-room__back"
            onClick={onBack}
            aria-label="チャット一覧に戻る"
          >
            {'<'}
          </button>
          <h2 className="chat-room__name">{matchUser?.displayName || 'チャット'}</h2>
          <button
            type="button"
            className={`chat-room__edit ${isEditorOpen ? 'chat-room__edit--active' : ''}`}
            aria-label="共同エディタ"
            aria-pressed={isEditorOpen}
            aria-expanded={isEditorOpen}
            aria-controls="chat-editor-panel"
            onClick={handleToggleEditor}
          >
            <img src="/images/edit-text-file.png" alt="" className="chat-room__edit-icon" />
          </button>
        </header>

        <div className="chat-room__messages" role="log" aria-live="polite" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <p className="chat-room__empty">メッセージがありません</p>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.senderId === currentUser.id;
              const timeLabel = formatMessageTime(message.timestamp);
              const isRead = Boolean(message.isRead);
              const shouldShowMeta = Boolean(timeLabel) || (isOwn && isRead);
              return (
                <div
                  key={message.id || `${message.timestamp}-${index}`}
                  className={`chat-room__row ${isOwn ? 'chat-room__row--own' : 'chat-room__row--other'}`}
                >
                  {!isOwn && (
                    <img
                      className="chat-room__avatar"
                      src={avatarCandidates[0]}
                      alt={matchUser?.displayName || '相手ユーザー'}
                      data-candidate-index="0"
                      onError={(event) => {
                        loadNextImageCandidate(event, avatarCandidates);
                      }}
                    />
                  )}
                  <div>
                    <p className={`chat-room__bubble ${isOwn ? 'chat-room__bubble--own' : 'chat-room__bubble--other'}`}>
                      {message.text}
                    </p>
                    {shouldShowMeta && (
                      <div className={`chat-room__meta ${isOwn ? 'chat-room__meta--own' : 'chat-room__meta--other'}`}>
                        {timeLabel && <span className="chat-room__time">{timeLabel}</span>}
                        {isOwn && isRead && <span className="chat-room__status">既読</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmit} className="chat-room__composer">
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="メッセージ"
            className="chat-room__input"
          />
          <button type="submit" className="chat-room__send" aria-label="送信">
            <svg
              className="chat-room__send-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" />
            </svg>
          </button>
        </form>
      </div>

      <aside id="chat-editor-panel" className={`chat-editor ${isEditorOpen ? 'chat-editor--open' : ''}`} aria-hidden={!isEditorOpen}>
        <header className="chat-editor__header">
          <button
            type="button"
            className="chat-editor__back"
            onClick={handleCloseEditor}
            aria-label="チャットに戻る"
          >
            {'<'}
          </button>
          <h3 className="chat-editor__title">共同エディタ</h3>
          <div className="chat-editor__actions">
            <button
              type="button"
              className="chat-editor__mini"
              onClick={handleDownloadAllFiles}
              aria-label="編集ファイルをまとめてダウンロード"
              disabled={editorFiles.length === 0 || isDownloading}
            >
              <img src="/images/download.svg" alt="" className="chat-editor__mini-icon" />
              <span className="chat-editor__mini-label">{isDownloading ? 'Zip...' : 'Download'}</span>
            </button>
            <button type="button" className="chat-editor__mini" onClick={handleRenameActiveFile} aria-label="ファイル名を変更">
              Rename
            </button>
            <button
              type="button"
              className="chat-editor__mini chat-editor__mini--danger"
              onClick={() => handleDeleteFile(activeEditorFileId)}
              aria-label="選択中のファイルを削除"
              disabled={!activeEditorFileId}
            >
              Delete
            </button>
            <button type="button" className="chat-editor__add" onClick={handleCreateFile} aria-label="ファイルを追加">
              +
            </button>
          </div>
        </header>

        <div className="chat-editor__tabs" role="tablist" aria-label="エディタファイルタブ">
          {editorFiles.map((file) => (
            <div
              key={file.id}
              role="tab"
              className={`chat-editor__tab ${activeEditorFileId === file.id ? 'chat-editor__tab--active' : ''}`}
              aria-selected={activeEditorFileId === file.id}
            >
              <button
                type="button"
                className="chat-editor__tab-main"
                onClick={() => handleSelectEditorFile(file.id)}
                title={file.name}
              >
                {file.name}
              </button>
              <button
                type="button"
                className="chat-editor__tab-close"
                aria-label={`${file.name} を削除`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteFile(file.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="chat-editor__surface">
          {isEditorLoading && <p className="chat-editor__status">読み込み中...</p>}
          {!isEditorLoading && editorError && <p className="chat-editor__status chat-editor__status--error">{editorError}</p>}
          {!isEditorLoading && !editorError && !activeEditorFile && (
            <p className="chat-editor__status">右上の + でファイルを追加してください。</p>
          )}
          {!isEditorLoading && !editorError && activeEditorFile && (
            <CodeMirror
              value={activeEditorFile.content || ''}
              height="100%"
              extensions={codeMirrorExtensions}
              onChange={handleEditorChange}
              className="chat-editor__codemirror"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightActiveLine: true,
                indentWithTab: false
              }}
            />
          )}
        </div>
      </aside>
    </section>
  );
}

export default MatchChat;
