import React from 'react';

/**
 * @param {{
 *  title?: string,
 *  description?: string,
 *  actionLabel?: string,
 *  onAction?: () => void
 * }} props
 */
function NotFoundPage({
  title = 'ページが見つかりません',
  description = '指定されたデータは見つからないか、すでに削除されています。',
  actionLabel = '戻る',
  onAction
}) {
  return (
    <section className="not-found-page" aria-label="404ページ">
      <div className="not-found-page__card">
        <p className="not-found-page__code">404</p>
        <h2 className="not-found-page__title">{title}</h2>
        <p className="not-found-page__description">{description}</p>
        {typeof onAction === 'function' && (
          <button type="button" className="secondary-button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}

export default NotFoundPage;
