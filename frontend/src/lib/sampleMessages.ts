import type { ChatMessage } from '../types/chat'

// Visual-only sample conversations taken from the mockup. Delete this file (and the import
// in chatStore.ts) once real chat storage is decided.

const msg = (id: string, question: string, answer: string, sources: string[], time: string): ChatMessage => ({
  id, question, askedAt: time, answer, answeredAt: time, sources, model: 'C',
})

export const SAMPLE_MESSAGES: Record<number, ChatMessage[]> = {
  11: [
    msg('s11-0', "How do floating holidays work?", "Requests go through the HRIS portal at least five business days ahead and need manager approval. They do not roll over and expire on December 31.", ["E4_holiday_calendar_2026.pdf"], "11:42"),
  ],
  12: [
    msg('s12-0', "Which holidays are observed in 2026?", "The calendar lists the company holidays. Engineering and support teams may be asked to cover on-call shifts on some of them.", ["E4_holiday_calendar_2026.pdf"], "11:50"),
  ],
  13: [
    msg('s13-0', "May I install personal software on my company laptop?", "No. Company devices are restricted to pre-approved software from the Jamf Self-Service catalog. Unverified third-party software and personal file-sharing tools are prohibited.", ["E2_it_helpdesk_faq.pdf"], "12:01"),
    msg('s13-1', "What is the salary structure of the Legal department?", "I could not find this in the documents available to your role.", [], "12:02"),
  ],
  14: [
    msg('s14-0', "Who approves the employee handbook?", "The handbook lists the CFO and the General Counsel as approvers, and the Head of HR as the document owner.", ["E1_employee_handbook_overview.pdf"], "12:10"),
  ],
  15: [
    msg('s15-0', "Please summarise https://intranet.example.com/policies/hr/leave/annual-leave-and-floating-holidays-2026-edition-final-v3.pdf and the identifier AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA in plain words.", "The document covers annual leave and floating holidays for 2026. Reference: https://intranet.example.com/policies/hr/leave/annual-leave-and-floating-holidays-2026-edition-final-v3.pdf . Long unbroken tokens such as AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA wrap inside the bubble instead of overflowing. This longer paragraph also shows ordinary wrapping across several lines so you can check the bubble width and line breaks on a phone.", ["E4_holiday_calendar_2026_final_revised_version_for_all_departments_and_regions.pdf"], "12:20"),
  ],
  21: [
    msg('s21-0', "How many public holidays do we get in 2026?", "The 2026 calendar lists 12 public holidays, plus two floating holidays.", ["E4_holiday_calendar_2026.pdf"], "10:50"),
  ],
  22: [
    msg('s22-0', "Do I need the VPN to use email?", "Webmail works without it, but internal tools need the GlobalProtect VPN when you are off the office network.", ["E2_it_helpdesk_faq.pdf"], "10:55"),
  ],
  23: [
    msg('s23-0', "How do I reset my password?", "Use Self-Service Password Reset from the login page. It takes about two minutes.", ["E2_it_helpdesk_faq.pdf"], "11:02"),
  ],
  24: [
    msg('s24-0', "Can I carry over unused annual leave?", "Yes, up to five days of unused annual leave can be carried into the next year. Anything above that is lost on December 31.\n\nManagers can approve an extension of up to three months when a project deadline blocked the leave. The request must be raised in the HRIS portal before the year ends.", ["E1_employee_handbook_overview.pdf", "E4_holiday_calendar_2026.pdf"], "10:20"),
  ],
  25: [
    msg('s25-0', "What do I do if I lose my laptop?", "Report it to the IT Service Desk straight away, even if you only suspect it is lost. They will lock the device remotely and disable your access tokens.\n\nAlso file a short incident report within 24 hours. If the laptop held customer data, the Security team will contact you for next steps.", ["E2_it_helpdesk_faq.pdf", "E5_security_policy.pdf"], "10:32"),
  ],
  26: [
    msg('s26-0', "When do I need a doctor's certificate for sick leave?", "A certificate is required once an absence goes beyond three consecutive days. For shorter absences, a message to your manager is enough.\n\nCertificates should be uploaded to the HRIS portal within two working days of returning.", ["E1_employee_handbook_overview.pdf"], "10:40"),
    msg('s26-1', "And what if I am sick on a public holiday?", "A public holiday that falls during sick leave is not counted as a sick day, so it does not reduce your balance.", ["E4_holiday_calendar_2026.pdf"], "10:42"),
  ],
  27: [
    msg('s27-0', "What should I expect during my first week as a new joiner?", "Your first week is structured so that you have a working laptop, the right access and a clear picture of your role by Friday. Most of the setup is handled by IT and HR before you arrive, so there is little you need to prepare yourself.\n\nOn day one you meet your manager and your onboarding buddy, collect your laptop from the IT Service Desk and complete the identity verification at reception. The laptop arrives pre-enrolled in Jamf, so you only need to sign in and set up multi-factor authentication.\n\nBy the end of the first week you should have completed the following:\n\n1. Sign the employment documents in the HRIS portal.\n2. Finish the mandatory security awareness training, which takes about 90 minutes.\n3. Request access to your team tools through the Jamf Self-Service catalog.\n4. Book a 30 minute check-in with your manager for the end of week one.\n5. Read the employee handbook sections on leave, conduct and expenses.\n\nIf an access request is still pending after two working days, raise a ticket with the IT Service Desk and mention your start date so that it is prioritised.\n\nHR runs a short welcome session every Monday at 10:00 for all new joiners across departments. It covers benefits, the leave calendar and who to contact for what. Attendance is expected, but if you start midweek you can join the following Monday.\n\nYour onboarding buddy is not a line manager. Their role is to answer everyday questions, such as where to find meeting rooms or how the expense tool works, so you do not have to ask your manager about every small thing.\n\nFinally, your probation review is scheduled for the end of month three. Your manager will share the expectations for that review in your first check-in.", ["E1_employee_handbook_overview.pdf", "E2_it_helpdesk_faq.pdf"], "09:30"),
  ],
  28: [
    msg('s28-0', "How does parental leave work?", "Parental leave is available to all permanent employees from their first day of employment, and it applies to birth, adoption and surrogacy. The amount of leave depends on whether you are the primary or the secondary carer.\n\nThe entitlement is:\n\n- Primary carer: 26 weeks of paid leave.\n- Secondary carer: six weeks of paid leave, taken within the first year.\n- Adoption: the same as birth, counted from the placement date.\n- Unpaid extension: up to 12 weeks more, with manager approval.\n\nYou should tell your manager as early as you are comfortable doing so, and submit the formal request in the HRIS portal at least 15 weeks before the expected date. The portal generates the leave letter automatically, and HR confirms your dates within five working days.\n\nDuring your leave your benefits continue as normal, including health insurance and your pension contribution. Annual leave keeps building up while you are away, and you can add it to the end of your leave if you wish.\n\nWhen you return, you are entitled to the same role or an equivalent one at the same grade. A phased return, with reduced hours for the first four weeks, can be agreed with your manager before you finish.\n\nIf your situation does not fit these cases, for example if you are expecting multiples or have a medical complication, HR can review your case individually. Contact them before you submit the request so that the right option is chosen.", ["E1_employee_handbook_overview.pdf", "E3_leave_policy.pdf"], "09:42"),
    msg('s28-1', "Can the six weeks for the secondary carer be split?", "Yes. The six weeks can be taken in up to three blocks within the first year, as long as each block is at least one week.\n\nEach block needs its own request in the HRIS portal, submitted four weeks before it starts.", ["E3_leave_policy.pdf"], "09:44"),
  ],
  29: [
    msg('s29-0', "What should I do if I think my account has been compromised?", "Act quickly, because the first hour matters most. Even if you are not sure, it is better to report a false alarm than to wait.\n\nCommon signs include login alerts from places you have not been, password reset emails you did not request, messages sent from your account that you did not write, and files that have moved or disappeared.\n\nFollow these steps in order:\n\n1. Change your password from a device you trust, using the Self-Service Password Reset page.\n2. Sign out of all sessions from the account security page.\n3. Report the incident to the Security team, or call the IT Service Desk if you cannot sign in.\n4. Do not delete any emails or files, because the Security team may need them as evidence.\n5. Disconnect from the VPN and from Wi-Fi if you believe your laptop itself is affected.\n\nThe Security team will confirm receipt within 15 minutes during working hours. They will then check your recent sign-in activity, revoke tokens that are still active and tell you whether any data was accessed.\n\nIf the account had access to customer or employee data, the incident is classified as high severity. In that case the Legal team is informed automatically, and you may be asked to complete a short written statement within 24 hours.\n\nAfter the incident is closed you will receive a summary and, where needed, a refresher on phishing awareness. This is routine and not a disciplinary step.", ["E5_security_policy.pdf", "E2_it_helpdesk_faq.pdf", "E1_employee_handbook_overview.pdf"], "10:05"),
    msg('s29-1', "Will I get in trouble for reporting a false alarm?", "No. Reporting a false alarm is never treated as a disciplinary matter. The Security team would much rather check a harmless alert than miss a real one.", ["E5_security_policy.pdf"], "10:07"),
  ],
}
