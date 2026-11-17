// High-fidelity executive-assistant email mock dataset for AssistIQ
// Executive: David Vance (Managing Partner, Vance Capital / Nova Horizon)
// Assistant: Elena Rostova (Lead Executive Assistant & Chief of Staff)

export const INITIAL_MOCK_THREADS = [
  {
    id: 'thread-1',
    sender: {
      name: 'Sarah Jenkins',
      email: 's.jenkins@benchmarkcap.com',
      avatar: 'SJ',
      company: 'Benchmark Capital',
      isVIP: true,
    },
    recipients: ['david.vance@vancecap.com'],
    cc: ['elena.rostova@vancecap.com', 'legal@benchmarkcap.com'],
    subject: 'Series B Term Sheet Revisions & Board Seat Composition',
    preview: 'David, our investment committee met this morning. We are aligned on the $40M pre-money valuation, but we need to finalize the independent board seat before Friday 5 PM...',
    timestamp: '2026-11-16T22:15:00Z',
    dateStr: '45m ago',
    classification: 'CLIENT_REPLY', // 1 of 4 mutually exclusive
    priority: 'urgent',
    isHandled: false,
    isStarred: true,
    isImportant: true,
    isRead: false,
    isWaiting: false,
    aiConfidence: 0.96,
    aiReasoning: 'Sender is a Lead VC Partner requesting personal executive sign-off on term sheet governance before Friday deadline.',
    suggestedAction: 'Forward to David Vance with calendar summary of board options and prepare recommended draft.',
    meeting: {
      hasMeeting: true,
      title: 'Series B Legal & Governance Sign-off',
      date: 'Friday, Nov 20',
      time: '15:00 EST',
      attendees: ['s.jenkins@benchmarkcap.com', 'david.vance@vancecap.com'],
      location: 'Zoom Conference',
    },
    actionItems: [
      { id: 'act-1-1', task: 'Review independent board seat clause', assignedTo: 'client', completed: false, deadline: 'Nov 20, 5:00 PM' },
      { id: 'act-1-2', task: 'Check schedule for Friday closing call', assignedTo: 'assistant', completed: true, deadline: 'Nov 17' },
    ],
    attachments: [
      { id: 'att-1-1', name: 'Solaria_AI_Series_B_Term_Sheet_Benchmark_v3.pdf', size: '1.8 MB', type: 'pdf' },
      { id: 'att-1-2', name: 'Cap_Table_Model_Post_Series_B.xlsx', size: '640 KB', type: 'excel' },
    ],
    internalNotes: [
      { id: 'note-1-1', author: 'Elena Rostova (PA)', text: 'Reviewed cap table footnote. Valuation matches our model. Checked calendar: David is free Friday 3:00-4:30 PM for the closing call.', timestamp: '30m ago' }
    ],
    suggestedDraft: {
      to: 's.jenkins@benchmarkcap.com',
      cc: 'elena.rostova@vancecap.com, legal@benchmarkcap.com',
      subject: 'Re: Series B Term Sheet Revisions & Board Seat Composition',
      body: `Hi Sarah,

Thanks for the update following your investment committee meeting. 

We are aligned on the $40M pre-money valuation and the $12M check size. Regarding the independent board seat: we are comfortable with appointing a mutual independent director with enterprise AI background within 90 days of close.

Elena has set aside Friday at 3:00 PM EST for our final legal alignment call. Looking forward to completing this.

Best,
David Vance
Managing Partner | Vance Capital`,
      tone: 'Executive Concise'
    },
    messages: [
      {
        id: 'msg-1-1',
        sender: { name: 'David Vance', email: 'david.vance@vancecap.com', avatar: 'DV', isMe: true },
        recipients: ['s.jenkins@benchmarkcap.com'],
        timestamp: '2026-11-15T16:00:00Z',
        dateStr: 'Yesterday at 4:00 PM',
        body: `Hi Sarah,

Following up on our partner sync last Thursday regarding Solaria AI. We've reviewed the preliminary terms and feel confident moving ahead with Benchmark as lead. 

Let us know once your IC has ratified the valuation framework so we can finalize board mechanics.

Best,
David`,
      },
      {
        id: 'msg-1-2',
        sender: { name: 'Sarah Jenkins', email: 's.jenkins@benchmarkcap.com', avatar: 'SJ', company: 'Benchmark Capital', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: ['elena.rostova@vancecap.com', 'legal@benchmarkcap.com'],
        timestamp: '2026-11-16T22:15:00Z',
        dateStr: '45m ago',
        body: `Hi David,

Our investment committee met this morning to finalize the Series B term sheet for Solaria AI. We are pleased to confirm that we are fully aligned on the $40M pre-money valuation and the $12M lead check.

However, the committee has requested one revision to the governance clause:
1. Benchmark takes 1 board seat (Sarah Jenkins).
2. Founders retain 2 board seats (David Vance + Alex Chen).
3. 1 mutual independent board seat with enterprise AI expertise to be appointed within 90 days of closing.

Please let me know if you can sign off on this formulation by Friday at 5:00 PM EST so our counsel can begin drafting the definitive documents.

Best regards,
Sarah Jenkins
General Partner | Benchmark Capital`,
      }
    ],
    activityLog: [
      { id: 'actlog-1', action: 'AI Classified as Client to Reply (96% est. confidence)', timestamp: '45m ago', user: 'AI Engine' },
      { id: 'actlog-2', action: 'Flagged as Urgent due to Friday 5 PM deadline', timestamp: '44m ago', user: 'Rule Engine' },
    ],
  },
  {
    id: 'thread-2',
    sender: {
      name: 'Marcus Aurelius',
      email: 'm.aurelius@vancecap.com',
      avatar: 'MA',
      company: 'Vance Capital Finance',
      isVIP: false,
    },
    recipients: ['david.vance@vancecap.com'],
    cc: ['elena.rostova@vancecap.com'],
    subject: 'Q3 Tax Provisioning & Audit Representation Letter',
    preview: 'David, PwC requires your physical or DocuSign authorization on the attached Q3 tax representation letter before we release the LP quarterly report...',
    timestamp: '2026-11-16T21:40:00Z',
    dateStr: '1h ago',
    classification: 'CLIENT_REPLY',
    priority: 'high',
    isHandled: false,
    isStarred: false,
    isImportant: true,
    isRead: false,
    isWaiting: false,
    aiConfidence: 0.94,
    aiReasoning: 'CFO explicitly requires Managing Partner legal signature on audit document.',
    suggestedAction: 'Send DocuSign notification reminder to David and queue for signature.',
    meeting: null,
    actionItems: [
      { id: 'act-2-1', task: 'Execute DocuSign audit letter', assignedTo: 'client', completed: false, deadline: 'Nov 18, 12:00 PM' }
    ],
    attachments: [
      { id: 'att-2-1', name: 'Q3_2026_Tax_Representation_Letter_Signed_CFO.pdf', size: '2.4 MB', type: 'pdf' },
      { id: 'att-2-2', name: 'Q3_Variance_Summary_Final.xlsx', size: '840 KB', type: 'excel' }
    ],
    internalNotes: [
      { id: 'note-2-1', author: 'Elena Rostova (PA)', text: 'Pushed DocuSign directly to David iPad. Reminded him during morning briefing.', timestamp: '50m ago' }
    ],
    suggestedDraft: {
      to: 'm.aurelius@vancecap.com',
      cc: 'elena.rostova@vancecap.com',
      subject: 'Re: Q3 Tax Provisioning & Audit Representation Letter',
      body: `Marcus,

I have reviewed the variance numbers and signed the PwC representation letter via DocuSign just now. You are clear to distribute the Q3 reports to the LPs tomorrow morning.

Thanks,
David`,
      tone: 'Direct & Concise'
    },
    messages: [
      {
        id: 'msg-2-1',
        sender: { name: 'Marcus Aurelius', email: 'm.aurelius@vancecap.com', avatar: 'MA', company: 'Vance Capital Finance', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: ['elena.rostova@vancecap.com'],
        timestamp: '2026-11-16T21:40:00Z',
        dateStr: '1h ago',
        body: `David,

PwC requires your formal signature on the attached Q3 tax representation letter before we can release the Q3 LP quarterly reports. All numbers have been reviewed by my team and the audit committee.

Attached:
- Q3_2026_Tax_Representation_Letter_Signed_CFO.pdf (2.4 MB)
- Q3_Variance_Summary_Final.xlsx (840 KB)

Please execute the DocuSign link sent to your primary inbox, or let me know if you need any adjustments to footnote 4 regarding foreign tax credits.

Thanks,
Marcus Aurelius
Chief Financial Officer | Vance Capital`,
      }
    ],
    activityLog: [
      { id: 'actlog-3', action: 'AI Classified as Client to Reply (94% est. confidence)', timestamp: '1h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-3',
    sender: {
      name: 'Dr. Aris Thorne',
      email: 'keynotes@globaltechsummit.ch',
      avatar: 'AT',
      company: 'Global Tech Summit Zurich',
      isVIP: false,
    },
    recipients: ['david.vance@vancecap.com'],
    cc: ['speakers@globaltechsummit.ch'],
    subject: 'Keynote Speaker Invitation: Global Tech Summit 2027 (Zurich)',
    preview: 'Dear Mr. Vance, On behalf of the steering committee, we would be honored to invite you as our opening keynote speaker in Zurich on March 14, 2027...',
    timestamp: '2026-11-16T20:10:00Z',
    dateStr: '2h ago',
    classification: 'ASSISTANT_REPLY',
    priority: 'normal',
    isHandled: false,
    isStarred: false,
    isImportant: false,
    isRead: true,
    isWaiting: false,
    aiConfidence: 0.91,
    aiReasoning: 'Standard conference keynote invitation; can be triaged, calendar-checked, and replied to by the PA with standard availability response.',
    suggestedAction: 'Check 2027 Q1 schedule and draft polite holding response.',
    meeting: {
      hasMeeting: true,
      title: 'Global Tech Summit 2027 Zurich Keynote',
      date: 'March 14, 2027',
      time: '09:00 CET',
      attendees: ['keynotes@globaltechsummit.ch', 'david.vance@vancecap.com'],
      location: 'Zurich Kongresshaus, Switzerland',
    },
    actionItems: [
      { id: 'act-3-1', task: 'Cross-reference Q1 2027 travel calendar', assignedTo: 'assistant', completed: true, deadline: 'Nov 25' },
      { id: 'act-3-2', task: 'Draft response with speaker rider', assignedTo: 'assistant', completed: false, deadline: 'Nov 25' },
    ],
    attachments: [
      { id: 'att-3-1', name: 'GTS_2027_Keynote_Prospectus.pdf', size: '3.1 MB', type: 'pdf' }
    ],
    internalNotes: [
      { id: 'note-3-1', author: 'Elena Rostova (PA)', text: 'March 2027 is open right now, but Davos wrap-up is in late Jan. Recommending we express interest but request speaker honorarium details first.', timestamp: '1h ago' }
    ],
    suggestedDraft: {
      to: 'keynotes@globaltechsummit.ch',
      cc: 'speakers@globaltechsummit.ch',
      subject: 'Re: Keynote Speaker Invitation: Global Tech Summit 2027 (Zurich)',
      body: `Dear Dr. Thorne,

Thank you for the kind invitation to have David Vance deliver the opening keynote at the Global Tech Summit 2027 in Zurich.

Mr. Vance is currently reviewing his international commitments for Q1 2027. Could you please share the preliminary speaker guidelines, honorarium provisions, and plenary schedule? 

We will follow up with our definitive confirmation prior to your December 1st deadline.

Best regards,
Elena Rostova
Executive Office of David Vance | Vance Capital`,
      tone: 'Diplomatic & Professional'
    },
    messages: [
      {
        id: 'msg-3-1',
        sender: { name: 'Dr. Aris Thorne', email: 'keynotes@globaltechsummit.ch', avatar: 'AT', company: 'Global Tech Summit Zurich', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: ['speakers@globaltechsummit.ch'],
        timestamp: '2026-11-16T20:10:00Z',
        dateStr: '2h ago',
        body: `Dear Mr. Vance,

On behalf of the European AI Leadership Council, we would be deeply honored to invite you as our opening keynote speaker for the Global Tech Summit 2027, taking place in Zurich on March 14-16, 2027.

We have reserved a 45-minute plenary session for your address on "Sovereign AI & Autonomous Capital Deployment". First-class travel and lodging at Baur au Lac will be fully arranged for you and a companion.

Please have your executive office let us know of your availability by December 1st.

Warm regards,
Dr. Aris Thorne
Chair of the Keynote Committee`,
      }
    ],
    activityLog: [
      { id: 'actlog-4', action: 'AI Classified as Assistant to Reply (91% est. confidence)', timestamp: '2h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-4',
    sender: {
      name: 'Delta Air Lines Priority Desk',
      email: 'reservations@delta.com',
      avatar: 'DA',
      company: 'Delta Air Lines',
      isVIP: false,
    },
    recipients: ['elena.rostova@vancecap.com'],
    cc: ['david.vance@vancecap.com'],
    subject: 'URGENT: Flight DL 482 (JFK -> SFO) Canceled due to mechanical delay',
    preview: 'Mr. Vance has been impacted by the cancellation of DL 482 scheduled for 8:15 AM tomorrow. Automated rebooking options are held for 90 minutes...',
    timestamp: '2026-11-16T19:55:00Z',
    dateStr: '3h ago',
    classification: 'ASSISTANT_REPLY',
    priority: 'urgent',
    isHandled: false,
    isStarred: true,
    isImportant: true,
    isRead: false,
    isWaiting: false,
    aiConfidence: 0.98,
    aiReasoning: 'Urgent travel disruption for tomorrow morning. Standard PA operational task to select optimal rebooking without disturbing client.',
    suggestedAction: 'Accept 11:30 AM flight DL 514 and notify driver for adjusted 9:30 AM pickup.',
    meeting: {
      hasMeeting: true,
      title: 'Rescheduled Flight DL 514 (JFK -> SFO)',
      date: 'Tomorrow, Nov 17',
      time: '11:30 EST',
      attendees: ['david.vance@vancecap.com'],
      location: 'JFK Terminal 4 -> SFO Terminal 2',
    },
    actionItems: [
      { id: 'act-4-1', task: 'Confirm seat 2A on DL 514 rebooking', assignedTo: 'assistant', completed: false, deadline: 'Tonight 11:00 PM' },
      { id: 'act-4-2', task: 'Update JFK private car pickup to 9:30 AM', assignedTo: 'assistant', completed: false, deadline: 'Tonight 11:00 PM' },
    ],
    attachments: [
      { id: 'att-4-1', name: 'Updated_Itinerary_DL514.pdf', size: '420 KB', type: 'pdf' }
    ],
    internalNotes: [
      { id: 'note-4-1', author: 'Elena Rostova (PA)', text: 'Seat 2A confirmed on 11:30 AM DL 514. Called Empire Chauffeur to move pickup from 6:30 AM to 9:30 AM. David notified via Slack.', timestamp: '2h ago' }
    ],
    suggestedDraft: {
      to: 'reservations@delta.com',
      cc: 'elena.rostova@vancecap.com',
      subject: 'Re: URGENT: Flight DL 482 (JFK -> SFO) Canceled',
      body: `Hello Delta Priority Desk,

Please confirm seat 2A for passenger David Vance (Confirmation #DV994K) on flight DL 514 departing JFK at 11:30 AM tomorrow.

Thank you,
Elena Rostova
Executive Assistant to David Vance`,
      tone: 'Direct & Clear'
    },
    messages: [
      {
        id: 'msg-4-1',
        sender: { name: 'Delta Air Lines Priority Desk', email: 'reservations@delta.com', avatar: 'DA', company: 'Delta Air Lines', isMe: false },
        recipients: ['elena.rostova@vancecap.com'],
        cc: ['david.vance@vancecap.com'],
        timestamp: '2026-11-16T19:55:00Z',
        dateStr: '3h ago',
        body: `Dear Elena Rostova,

We regret to inform you that passenger David Vance (Confirmation #DV994K) has been impacted by the cancellation of flight DL 482 departing JFK at 8:15 AM tomorrow due to unscheduled maintenance.

We have temporarily reserved seat 2A on DL 514 departing JFK at 11:30 AM arriving SFO at 2:55 PM.
Alternatively, seat 3B on DL 620 departing JFK at 2:15 PM is available.

Please confirm your selection within 90 minutes or manage your itinerary at delta.com.

Delta Executive Priority Team`,
      }
    ],
    activityLog: [
      { id: 'actlog-5', action: 'AI Classified as Assistant to Reply (98% est. confidence)', timestamp: '3h ago', user: 'AI Engine' },
      { id: 'actlog-6', action: 'Urgent flight cancellation detected', timestamp: '3h ago', user: 'Rule Engine' },
    ],
  },
  {
    id: 'thread-5',
    sender: {
      name: 'Julian Mercer',
      email: 'j.mercer@lathamwatkins.com',
      avatar: 'JM',
      company: 'Latham & Watkins LLP',
      isVIP: false,
    },
    recipients: ['david.vance@vancecap.com'],
    cc: ['elena.rostova@vancecap.com', 'counsel@vancecap.com'],
    subject: 'Feedback needed on indemnification carve-outs in LP Side Letter',
    preview: 'David, regarding the sovereign wealth co-investor side letter: there is ambiguity in Section 9.2 regarding whether indemnification covers third-party regulatory inquiries...',
    timestamp: '2026-11-16T18:30:00Z',
    dateStr: '4h ago',
    classification: 'NEEDS_REVIEW',
    priority: 'high',
    isHandled: false,
    isStarred: false,
    isImportant: true,
    isRead: false,
    isWaiting: false,
    aiConfidence: 0.68,
    aiReasoning: 'Low confidence (0.68 < 0.70 threshold). Highly nuanced legal dispute involving strategic LP relationship. PA should review and determine if David Vance should decide or outside counsel handles.',
    suggestedAction: 'PA to review with General Counsel or escalate to David.',
    meeting: null,
    actionItems: [
      { id: 'act-5-1', task: 'Determine if this requires David or General Counsel sign-off', assignedTo: 'assistant', completed: false, deadline: 'Nov 17, 10:00 AM' }
    ],
    attachments: [
      { id: 'att-5-1', name: 'Fund_IV_LP_Side_Letter_Redline_v7.docx', size: '512 KB', type: 'doc' }
    ],
    internalNotes: [],
    suggestedDraft: {
      to: 'j.mercer@lathamwatkins.com',
      cc: 'counsel@vancecap.com, elena.rostova@vancecap.com',
      subject: 'Re: Feedback needed on indemnification carve-outs in LP Side Letter',
      body: `Julian,

Thanks for flagging. I will consult our internal counsel this afternoon. Given their allocation size, our preliminary stance is to maintain standard GP protections, but we can offer a customized reporting threshold.

Expect our definitive response by 11:00 AM tomorrow.

Best,
David Vance`,
      tone: 'Firm & Professional'
    },
    messages: [
      {
        id: 'msg-5-1',
        sender: { name: 'Julian Mercer', email: 'j.mercer@lathamwatkins.com', avatar: 'JM', company: 'Latham & Watkins LLP', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: ['elena.rostova@vancecap.com', 'counsel@vancecap.com'],
        timestamp: '2026-11-16T18:30:00Z',
        dateStr: '4h ago',
        body: `David,

Regarding the sovereign wealth co-investor side letter for Fund IV:
There is substantial ambiguity in Section 9.2 regarding whether the general partner indemnification carve-out extends to informal third-party regulatory inquiries or only formal SEC subpoenas.

Their counsel in London is pushing for broader language. I can hold the line on the original standard, but it may cause friction given their $75M commitment size.

Do you want us to concede this clause or hold our firm precedent?

Best,
Julian Mercer | Latham & Watkins LLP`,
      }
    ],
    activityLog: [
      { id: 'actlog-7', action: 'Flagged as Needs Review: AI confidence 0.68 below 0.70 threshold', timestamp: '4h ago', user: 'Safety Guardrail' },
    ],
  },
  {
    id: 'thread-6',
    sender: {
      name: 'Klara Lindqvist',
      email: 'events.ny@ritzcarlton.com',
      avatar: 'KL',
      company: 'The Ritz-Carlton New York',
      isVIP: false,
    },
    recipients: ['elena.rostova@vancecap.com'],
    cc: [],
    subject: 'Private Dining Contract & Sommelier Menu for Vance Capital Annual LP Dinner',
    preview: 'Dear Elena, Attached is the revised banquet event order for the private dining room on December 10th. Please confirm wine pairings and deposit authorization...',
    timestamp: '2026-11-16T17:15:00Z',
    dateStr: '5h ago',
    classification: 'ASSISTANT_REPLY',
    priority: 'normal',
    isHandled: false,
    isStarred: false,
    isImportant: false,
    isRead: true,
    isWaiting: false,
    aiConfidence: 0.93,
    aiReasoning: 'Standard executive hospitality and event vendor coordination; fully handled by assistant with company corporate card.',
    suggestedAction: 'Sign deposit authorization and coordinate dietary restrictions.',
    meeting: {
      hasMeeting: true,
      title: 'Vance Capital Annual LP Dinner',
      date: 'Dec 10, 2026',
      time: '19:00 EST',
      attendees: ['david.vance@vancecap.com', 'elena.rostova@vancecap.com'],
      location: 'The Ritz-Carlton, NYC (Presidential Suite)',
    },
    actionItems: [
      { id: 'act-6-1', task: 'Execute $5,000 deposit via corporate card', assignedTo: 'assistant', completed: false, deadline: 'Nov 20' }
    ],
    attachments: [
      { id: 'att-6-1', name: 'BEO_VanceCapital_LP_Dinner_Dec10.pdf', size: '1.2 MB', type: 'pdf' },
      { id: 'att-6-2', name: 'Sommelier_Reserve_Menu_Selection.pdf', size: '780 KB', type: 'pdf' }
    ],
    internalNotes: [],
    suggestedDraft: {
      to: 'events.ny@ritzcarlton.com',
      cc: '',
      subject: 'Re: Private Dining Contract & Sommelier Menu',
      body: `Dear Klara,

Thank you for sending the revised Banquet Event Order. The 5-course menu with Sommelier reserve pairings looks wonderful.

I will process the $5,000 preliminary hold authorization today using our corporate card on file. Please hold the room firm.

Warm regards,
Elena Rostova
Lead Executive Assistant | Vance Capital`,
      tone: 'Warm & Professional'
    },
    messages: [
      {
        id: 'msg-6-1',
        sender: { name: 'Klara Lindqvist', email: 'events.ny@ritzcarlton.com', avatar: 'KL', company: 'The Ritz-Carlton New York', isMe: false },
        recipients: ['elena.rostova@vancecap.com'],
        cc: [],
        timestamp: '2026-11-16T17:15:00Z',
        dateStr: '5h ago',
        body: `Dear Elena,

Thank you for your patience. Attached is the revised Banquet Event Order (BEO) for the Vance Capital Annual LP Dinner on Thursday, December 10th, 2026.

Details:
- Room: The Presidential Suite Dining Salon (Capacity: 24 guests)
- Custom 5-course tasting menu prepared by Chef Dubois
- Sommelier Reserve Burgundy and Bordeaux pairings

Attached is the deposit authorization form for the $5,000 preliminary hold. Please return the signed authorization by Friday to guarantee reservation.

Kind regards,
Klara Lindqvist
Director of Private Events | The Ritz-Carlton`,
      }
    ],
    activityLog: [
      { id: 'actlog-8', action: 'AI Classified as Assistant to Reply (93% est. confidence)', timestamp: '5h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-7',
    sender: {
      name: 'Jonathan Reed',
      email: 'jreed@microsoft.com',
      avatar: 'JR',
      company: 'Microsoft M&A / Corporate Dev',
      isVIP: true,
    },
    recipients: ['david.vance@vancecap.com'],
    cc: ['elena.rostova@vancecap.com'],
    subject: 'Catching up at SFO / Quick sync on enterprise AI infrastructure roadmap',
    preview: 'David, saw you will be in the Bay Area next week. Would love to grab 30 minutes over breakfast at Rosewood Sand Hill or in our Mountain View campus...',
    timestamp: '2026-11-16T16:00:00Z',
    dateStr: '6h ago',
    classification: 'CLIENT_REPLY',
    priority: 'high',
    isHandled: false,
    isStarred: true,
    isImportant: true,
    isRead: false,
    isWaiting: false,
    aiConfidence: 0.92,
    aiReasoning: 'VIP Tech Executive proposing strategic meeting with David Vance personally.',
    suggestedAction: 'Prepare calendar availability for Wednesday 8:30 AM at Rosewood and draft response.',
    meeting: {
      hasMeeting: true,
      title: 'Breakfast with Jonathan Reed (Microsoft VP M&A)',
      date: 'Wednesday, Nov 18',
      time: '08:30 PST',
      attendees: ['jreed@microsoft.com', 'david.vance@vancecap.com'],
      location: 'Rosewood Sand Hill, Menlo Park',
    },
    actionItems: [
      { id: 'act-7-1', task: 'Check Wednesday morning availability in Menlo Park', assignedTo: 'assistant', completed: true, deadline: 'Nov 17' },
      { id: 'act-7-2', task: 'David to decide whether to accept Microsoft sync', assignedTo: 'client', completed: false, deadline: 'Nov 17' }
    ],
    attachments: [],
    internalNotes: [
      { id: 'note-7-1', author: 'Elena Rostova (PA)', text: 'Wednesday morning is clear between 8:00 AM and 10:30 AM. Rosewood is 12 mins from David hotel.', timestamp: '4h ago' }
    ],
    suggestedDraft: {
      to: 'jreed@microsoft.com',
      cc: 'elena.rostova@vancecap.com',
      subject: 'Re: Catching up at SFO / Quick sync on enterprise AI infrastructure roadmap',
      body: `Jonathan,

Great to hear from you. I will indeed be in Menlo Park next week.

Wednesday morning at 8:30 AM at Rosewood Sand Hill works well for me. Elena is copied here to coordinate table arrangements.

Look forward to comparing notes on infrastructure plays.

Best,
David`,
      tone: 'Collegial & Decisive'
    },
    messages: [
      {
        id: 'msg-7-1',
        sender: { name: 'Jonathan Reed', email: 'jreed@microsoft.com', avatar: 'JR', company: 'Microsoft M&A / Corporate Dev', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: ['elena.rostova@vancecap.com'],
        timestamp: '2026-11-16T16:00:00Z',
        dateStr: '6h ago',
        body: `David,

Hope you are well. Saw via Sarah Jenkins that you will be in the Bay Area next week for the Solaria AI board meeting.

Our corporate development team is actively tracking a few companies in your portfolio around agentic infrastructure. Would love to grab 30 minutes over coffee or breakfast at Rosewood Sand Hill on Wednesday morning (Nov 18) if you have bandwidth.

Let me know if Elena can coordinate a slot.

Best,
Jonathan Reed
VP Corporate Development | Microsoft`,
      }
    ],
    activityLog: [
      { id: 'actlog-9', action: 'AI Classified as Client to Reply (92% est. confidence)', timestamp: '6h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-8',
    sender: {
      name: 'Rachel Adams',
      email: 'r.adams@sequoiacap.com',
      avatar: 'RA',
      company: 'Sequoia Capital',
      isVIP: true,
    },
    recipients: ['elena.rostova@vancecap.com'],
    cc: ['david.vance@vancecap.com'],
    subject: 'Awaiting co-investment allocation breakdown for Project Apex',
    preview: 'Elena, following up on our email from Tuesday. We are holding $5M in LP syndication space for Vance Capital, but need your allocation breakdown by end of week...',
    timestamp: '2026-11-16T14:30:00Z',
    dateStr: '8h ago',
    classification: 'ASSISTANT_REPLY',
    priority: 'high',
    isHandled: false,
    isStarred: false,
    isImportant: true,
    isRead: true,
    isWaiting: true, // Independent Waiting For status
    waitingSince: '2 days ago',
    aiConfidence: 0.95,
    aiReasoning: 'Outbound negotiation thread where we owe Rachel allocation details from our family office partners. Tagged as Waiting For external inputs.',
    suggestedAction: 'Ping Marcus in Finance for the finalized LP entity list today.',
    meeting: null,
    actionItems: [
      { id: 'act-8-1', task: 'Obtain family office breakdown from Marcus', assignedTo: 'assistant', completed: false, deadline: 'Nov 17, 3:00 PM' }
    ],
    attachments: [
      { id: 'att-8-1', name: 'Project_Apex_Syndicate_Summary.pdf', size: '1.5 MB', type: 'pdf' }
    ],
    internalNotes: [
      { id: 'note-8-1', author: 'Elena Rostova (PA)', text: 'Followed up with Marcus at 11 AM. He is waiting on signature from Zurich family office. Will follow up again at 4 PM.', timestamp: '3h ago' }
    ],
    suggestedDraft: {
      to: 'r.adams@sequoiacap.com',
      cc: 'david.vance@vancecap.com',
      subject: 'Re: Awaiting co-investment allocation breakdown for Project Apex',
      body: `Hi Rachel,

Thanks for the follow-up. We are finalizing the last entity allocation with our Swiss family office affiliate this afternoon.

I will send over the complete Excel allocation breakdown and signing entities tomorrow morning before 10:00 AM EST. Thank you for holding the allocation space.

Warm regards,
Elena Rostova
Lead PA & Operations | Vance Capital`,
      tone: 'Prompt & Reassuring'
    },
    messages: [
      {
        id: 'msg-8-1',
        sender: { name: 'Rachel Adams', email: 'r.adams@sequoiacap.com', avatar: 'RA', company: 'Sequoia Capital', isMe: false },
        recipients: ['elena.rostova@vancecap.com'],
        cc: ['david.vance@vancecap.com'],
        timestamp: '2026-11-16T14:30:00Z',
        dateStr: '8h ago',
        body: `Hi Elena,

Following up on our email from Tuesday regarding Project Apex.

We are holding $5M in co-investment syndication capacity for Vance Capital and your preferred LPs. However, our deal team needs the finalized name and entity distribution list by this Thursday close of business.

Are you still waiting on the family office commitments, or can we lock in the current allocation?

Warmly,
Rachel Adams
Chief of Staff to Roelof Botha | Sequoia Capital`,
      }
    ],
    activityLog: [
      { id: 'actlog-10', action: 'Classified as Waiting For Response (Pending external LP info)', timestamp: '8h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-9',
    sender: {
      name: 'Stripe Billing',
      email: 'invoices@stripe.com',
      avatar: 'ST',
      company: 'Stripe Payments',
      isVIP: false,
    },
    recipients: ['billing@vancecap.com'],
    cc: ['elena.rostova@vancecap.com'],
    subject: 'Receipt: Invoice #INV-2026-9042 for Vance Capital Management ($4,820.00)',
    preview: 'Your receipt for invoice #INV-2026-9042 is ready. Payment of $4,820.00 was successfully processed via American Express ending in 4019...',
    timestamp: '2026-11-16T12:00:00Z',
    dateStr: '10h ago',
    classification: 'NO_REPLY_NEEDED',
    priority: 'low',
    isHandled: false,
    isStarred: false,
    isImportant: false,
    isRead: true,
    isWaiting: false,
    aiConfidence: 0.99,
    aiReasoning: 'Automated software subscription receipt. Explicitly tagged No Reply Needed. Kept accessible in No Reply Needed segment.',
    suggestedAction: 'Auto-categorized for monthly bookkeeping.',
    meeting: null,
    actionItems: [],
    attachments: [
      { id: 'att-9-1', name: 'Invoice_INV-2026-9042.pdf', size: '210 KB', type: 'pdf' }
    ],
    internalNotes: [],
    suggestedDraft: null,
    messages: [
      {
        id: 'msg-9-1',
        sender: { name: 'Stripe Billing', email: 'invoices@stripe.com', avatar: 'ST', company: 'Stripe Payments', isMe: false },
        recipients: ['billing@vancecap.com'],
        cc: ['elena.rostova@vancecap.com'],
        timestamp: '2026-11-16T12:00:00Z',
        dateStr: '10h ago',
        body: `Hello Vance Capital,

Your monthly payment of $4,820.00 for Stripe Enterprise Billing was successfully charged to your American Express ending in 4019 on November 16, 2026.

No further action is required. You can view or download your invoice PDF directly from your Stripe dashboard.

Thank you for your business!
The Stripe Team`,
      }
    ],
    activityLog: [
      { id: 'actlog-11', action: 'Classified as No Reply Needed (99% est. confidence)', timestamp: '10h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-10',
    sender: {
      name: 'Gartner Research Alerts',
      email: 'executive-alerts@gartner.com',
      avatar: 'GR',
      company: 'Gartner Inc.',
      isVIP: false,
    },
    recipients: ['david.vance@vancecap.com'],
    cc: [],
    subject: 'Gartner Executive Research: The 2026 Sovereign AI Infrastructure Report',
    preview: 'The latest research document on global compute sovereignty, datacenter energy constraints, and sovereign LLM adoption is now available for download...',
    timestamp: '2026-11-16T10:15:00Z',
    dateStr: '12h ago',
    classification: 'NO_REPLY_NEEDED',
    priority: 'low',
    isHandled: false,
    isStarred: false,
    isImportant: false,
    isRead: true,
    isWaiting: false,
    aiConfidence: 0.98,
    aiReasoning: 'Automated industry newsletter/research alert. No response required.',
    suggestedAction: 'Available in No Reply Needed archive.',
    meeting: null,
    actionItems: [],
    attachments: [
      { id: 'att-10-1', name: 'Gartner_Sovereign_AI_2026.pdf', size: '4.8 MB', type: 'pdf' }
    ],
    internalNotes: [],
    suggestedDraft: null,
    messages: [
      {
        id: 'msg-10-1',
        sender: { name: 'Gartner Research Alerts', email: 'executive-alerts@gartner.com', avatar: 'GR', company: 'Gartner Inc.', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: [],
        timestamp: '2026-11-16T10:15:00Z',
        dateStr: '12h ago',
        body: `Executive Research Alert:

The 2026 Sovereign AI Infrastructure Report is now published. Key takeaways include:
- Global compute clustering trends among tier-1 private equity.
- Power grid negotiation frameworks for multi-gigawatt AI training campuses.
- Emerging sovereign data privacy mandates across 18 jurisdictions.

Access the full PDF report via your client portal token.`,
      }
    ],
    activityLog: [
      { id: 'actlog-12', action: 'Classified as No Reply Needed (98% est. confidence)', timestamp: '12h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-11',
    sender: {
      name: 'Alexandre Dumas',
      email: 'a.dumas@solaria.ai',
      avatar: 'AD',
      company: 'Solaria AI (Portfolio Co)',
      isVIP: true,
    },
    recipients: ['david.vance@vancecap.com'],
    cc: ['elena.rostova@vancecap.com'],
    subject: 'Solaria Q3 ARR growth ($14.2M) & Series B follow-on allocation',
    preview: 'David, thrilled to share our Q3 metrics: ARR reached $14.2M (up 180% YoY). Ahead of the Benchmark term sheet sign-off, wanted to ensure Vance Capital takes its full pro-rata...',
    timestamp: '2026-11-16T09:00:00Z',
    dateStr: '13h ago',
    classification: 'CLIENT_REPLY',
    priority: 'high',
    isHandled: false,
    isStarred: true,
    isImportant: true,
    isRead: false,
    isWaiting: false,
    aiConfidence: 0.95,
    aiReasoning: 'Portfolio CEO requesting direct founder decision regarding $4M pro-rata capital commitment.',
    suggestedAction: 'Coordinate 15-minute alignment call with David.',
    meeting: {
      hasMeeting: true,
      title: 'Pro-Rata Alignment with Alex Dumas (Solaria AI CEO)',
      date: 'Tuesday, Nov 17',
      time: '16:30 EST',
      attendees: ['a.dumas@solaria.ai', 'david.vance@vancecap.com'],
      location: 'Phone Call',
    },
    actionItems: [
      { id: 'act-11-1', task: 'Confirm pro-rata fund capacity with Marcus', assignedTo: 'assistant', completed: true, deadline: 'Nov 16' },
      { id: 'act-11-2', task: 'David to confirm $4M follow-on allocation', assignedTo: 'client', completed: false, deadline: 'Nov 17' },
    ],
    attachments: [
      { id: 'att-11-1', name: 'Solaria_AI_Q3_2026_Investor_Update.pdf', size: '2.1 MB', type: 'pdf' }
    ],
    internalNotes: [
      { id: 'note-11-1', author: 'Elena Rostova (PA)', text: 'Marcus confirmed Fund IV reserves have $5.2M earmarked for Solaria follow-on. We are fully covered.', timestamp: '6h ago' }
    ],
    suggestedDraft: {
      to: 'a.dumas@solaria.ai',
      cc: 'elena.rostova@vancecap.com',
      subject: 'Re: Solaria Q3 ARR growth ($14.2M) & Series B follow-on allocation',
      body: `Alex,

Outstanding execution this quarter. Hitting $14.2M ARR with 142% NRR puts you in the top decile of enterprise infrastructure.

I've already confirmed with Marcus that we will exercise our full $4M super-pro-rata allocation. Let's do a quick 15-minute sync on Tuesday at 4:30 PM EST to review round syndicate dynamics.

Best,
David`,
      tone: 'Supportive & Decisive'
    },
    messages: [
      {
        id: 'msg-11-1',
        sender: { name: 'Alexandre Dumas', email: 'a.dumas@solaria.ai', avatar: 'AD', company: 'Solaria AI (Portfolio Co)', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: ['elena.rostova@vancecap.com'],
        timestamp: '2026-11-16T09:00:00Z',
        dateStr: '13h ago',
        body: `Hi David,

Thrilled to share our final Q3 operational metrics with you ahead of the broader board update:
- ARR: $14.2M (up 180% YoY, beating guidance by $1.8M)
- Net Revenue Retention: 142%
- Cash Runway: 19 months prior to Series B infusion

With Sarah Jenkins at Benchmark leading the round, I want to ensure Vance Capital exercises its full super-pro-rata right for $4M. 

Let me know when you have 15 minutes to align before you fly to SFO.

Best,
Alexandre Dumas
Co-Founder & CEO | Solaria AI`,
      }
    ],
    activityLog: [
      { id: 'actlog-13', action: 'AI Classified as Client to Reply (95% est. confidence)', timestamp: '13h ago', user: 'AI Engine' },
    ],
  },
  {
    id: 'thread-12',
    sender: {
      name: 'The St. Regis Concierge',
      email: 'concierge@stregis-sf.com',
      avatar: 'SR',
      company: 'The St. Regis San Francisco',
      isVIP: false,
    },
    recipients: ['elena.rostova@vancecap.com'],
    cc: ['david.vance@vancecap.com'],
    subject: 'Confirmation: Executive Suite Reservation (Nov 17-20) for David Vance',
    preview: 'Dear Elena, The executive corner suite at The St. Regis San Francisco has been secured for Mr. Vance arriving tomorrow...',
    timestamp: '2026-11-16T08:30:00Z',
    dateStr: '14h ago',
    classification: 'NO_REPLY_NEEDED',
    priority: 'low',
    isHandled: false,
    isStarred: false,
    isImportant: false,
    isRead: true,
    isWaiting: false,
    aiConfidence: 0.99,
    aiReasoning: 'Automated hotel confirmation. Explicitly accessible in No Reply Needed archive.',
    suggestedAction: 'Calendar event updated with hotel confirmation.',
    meeting: null,
    actionItems: [],
    attachments: [
      { id: 'att-12-1', name: 'StRegis_Reservation_Confirm_DV982144.pdf', size: '320 KB', type: 'pdf' }
    ],
    internalNotes: [],
    suggestedDraft: null,
    messages: [
      {
        id: 'msg-12-1',
        sender: { name: 'The St. Regis Concierge', email: 'concierge@stregis-sf.com', avatar: 'SR', company: 'The St. Regis San Francisco', isMe: false },
        recipients: ['elena.rostova@vancecap.com'],
        cc: ['david.vance@vancecap.com'],
        timestamp: '2026-11-16T08:30:00Z',
        dateStr: '14h ago',
        body: `Dear Elena Rostova,

Thank you for booking with The St. Regis San Francisco.

We are pleased to confirm the reservation for David Vance:
- Room: Metropolitan Executive Corner Suite (King)
- Check-in: Tuesday, Nov 17, 2026 (Early arrival noted for 2:00 PM)
- Check-out: Friday, Nov 20, 2026
- Confirmation #: SR-982144

Our house car will be on standby for airport transfers upon request.

Warm regards,
Concierge Team | The St. Regis San Francisco`,
      }
    ],
    activityLog: [
      { id: 'actlog-14', action: 'Classified as No Reply Needed (99% est. confidence)', timestamp: '14h ago', user: 'AI Engine' },
    ],
  }
]
