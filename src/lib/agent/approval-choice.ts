/**
 * The textarea is the command or body the owner is looking at.
 * Approve stays enabled only while that text is unchanged.
 * A dirty draft has one button, so the original command cannot run by mistake.
 */
export function approvalChoice(original: string, draft: string) {
  const dirty = draft !== original;
  return {
    dirty,
    approveEnabled: !dirty,
    editEnabled: dirty,
  };
}
