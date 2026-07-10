export const FEEDBACK_FORM_URL = 'https://forms.gle/TH5uGex3LobzAyAu7';

export const openFeedbackForm = (e?: any) => {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
};
