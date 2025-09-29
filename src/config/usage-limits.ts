export const MONTHLY_SPEND_CAP_USD = 0.5; // USD cap per user per calendar month
export const WARNING_THRESHOLD_PERCENT = 0.8; // 80% warning threshold
export const ALERT_RECIPIENTS = ["info@meal-maestro.com"] as const;
export const RATE_LIMIT_ALERT_WINDOW_MINUTES = 15; // consolidate repeated rate-limit alerts

export const MONTHLY_SUMMARY_LOOKBACK_MONTHS = 6; // for admin dashboards/reporting

export type AlertLevel = "warning" | "limit" | "rate-limit";

export const ALERT_RETRY_BUFFER_MINUTES = 60; // don't resend same alert level within this window
