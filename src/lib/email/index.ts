export { emailConfigured, emailFromAddress } from "./config";
export { redactEmailAddress } from "./redact";
export {
  deskReadyEmailContent,
  welcomeEmailContent,
  type DeskReadyEmailInput,
  type WelcomeEmailInput,
} from "./templates";
export { sendTransactional, type SendTransactionalInput, type SendTransactionalResult } from "./send";
export {
  DESK_READY_AUDIT_KIND,
  maybeNotifyDeskReady,
  ownerEmailDeliverable,
} from "./desk-ready";