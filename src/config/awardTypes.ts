// Award Types Configuration
export type AwardType = 'Level 1' | 'Level 2' | 'Level 3' | 'Consultant' | 'Coach';

export const LevelColumns: Record<AwardType, string[]> = {
  'Level 1': [
    'Employee','Facility','Area',
    'Relias Training\nAssigned','Relias Training\nCompleted',
    'Level 1 Awarded'
  ],
  'Level 2': [
    'Employee','Facility','Area',
    'Conference\nCompleted',
    'Standing\nVideo',
    'Sleeping/Sitting\nVideo',
    'Feeding\nVideo',
    'Level 2 Awarded',
    'Notes',
    'Advisor'
  ],
  'Level 3': [
    'Employee','Facility','Area',
    'Conference\nCompleted',
    'Sitting/Standing/\nApproaching',
    'No Hand/No\nSpeak',
    'Challenge\nSleeping',
    'Level 3 Awarded',
    'Notes',
    'Advisor'
  ],
  'Consultant': [
    'Employee','Facility','Area',
    'Conference\nCompleted',
    'Coaching\nSession 1','Coaching\nSession 2','Coaching\nSession 3',
    'Consultant Awarded',
    'Notes',
    'Advisor'
  ],
  'Coach': [
    'Employee','Facility','Area',
    'Conference\nCompleted',
    'Coaching\nSession 1','Coaching\nSession 2','Coaching\nSession 3',
    'Coach Awarded',
    'Notes',
    'Advisor'
  ]
};

// Field mapping for each level (maps column headers to database fields)
export const LevelFieldMapping: Record<AwardType, Record<string, string>> = {
  'Level 1': {
    'Employee': 'name',
    'Facility': 'facility',
    'Area': 'area',
    'Relias Training\nAssigned': 'assignedDate',
    'Relias Training\nCompleted': 'completedDate',
    'Level 1 Awarded': 'secureCareAwarded'
  },
  'Level 2': {
    'Employee': 'name',
    'Facility': 'facility',
    'Area': 'area',
    'Conference\nCompleted': 'conferenceCompleted',
    'Standing\nVideo': 'standingVideo',
    'Sleeping/Sitting\nVideo': 'sleepingVideo',
    'Feeding\nVideo': 'feedGradVideo',
    'Level 2 Awarded': 'secureCareAwarded',
    'Notes': 'notes',
    'Advisor': 'advisorName'
  },
  'Level 3': {
    'Employee': 'name',
    'Facility': 'facility',
    'Area': 'area',
    'Conference\nCompleted': 'conferenceCompleted',
    'Sitting/Standing/\nApproaching': 'standingVideo',
    'No Hand/No\nSpeak': 'noHandnoSpeak',
    'Challenge\nSleeping': 'sleepingVideo',
    'Level 3 Awarded': 'secureCareAwarded',
    'Notes': 'notes',
    'Advisor': 'advisorName'
  },
  'Consultant': {
    'Employee': 'name',
    'Facility': 'facility',
    'Area': 'area',
    'Conference\nCompleted': 'conferenceCompleted',
    'Coaching\nSession 1': 'session1',
    'Coaching\nSession 2': 'session2',
    'Coaching\nSession 3': 'session3',
    'Consultant Awarded': 'secureCareAwarded',
    'Notes': 'notes',
    'Advisor': 'advisorName'
  },
  'Coach': {
    'Employee': 'name',
    'Facility': 'facility',
    'Area': 'area',
    'Conference\nCompleted': 'conferenceCompleted',
    'Coaching\nSession 1': 'session1',
    'Coaching\nSession 2': 'session2',
    'Coaching\nSession 3': 'session3',
    'Coach Awarded': 'secureCareAwarded',
    'Notes': 'notes',
    'Advisor': 'advisorName'
  }
};

// Schedule field mapping (maps completion fields to their schedule counterparts)
export const ScheduleFieldMapping: Record<string, string> = {
  'standingVideo': 'scheduleStandingVideo',
  'sleepingVideo': 'scheduleSleepingVideo',
  'feedGradVideo': 'scheduleFeedGradVideo',
  'noHandnoSpeak': 'schedulenoHandnoSpeak',  // Fixed casing to match database
  'session1': 'scheduleSession1',            // Map to frontend field name (aliased from database)
  'session2': 'scheduleSession2',            // Map to frontend field name (aliased from database)
  'session3': 'scheduleSession3'             // Map to frontend field name (aliased from database)
};

// Utility function for safe date parsing - timezone neutral
export const parseDate = (d?: string | Date | null): Date | null => {
  if (!d) return null;
  
  if (typeof d === 'string') {
    // Handle different date string formats from database
    if (d.includes('T')) {
      // ISO string format - extract just the date part to avoid timezone issues
      const datePart = d.split('T')[0];
      if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(d);
    } else if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD format - treat as local date (timezone neutral)
      const [year, month, day] = d.split('-').map(Number);
      return new Date(year, month - 1, day);
    } else {
      // Fallback to standard parsing
      return new Date(d);
    }
  }
  
  return d;
};

// Display helpers (format date or status)
export const fmt = {
  date: (d?: string | Date | null): string => {
    const date = parseDate(d);
    if (!date) return '—';
    return date.toLocaleDateString('en-US');
  },
  
  awarded: (bit?: number | boolean, date?: string | Date | null): string => {
    return bit ? fmt.date(date) : 'Pending';
  },
  
  conference: (awaiting: number | boolean | null, date?: string | Date | null): string => {
    if (!date) return 'Pending'; // No conference completed yet
    if (awaiting === false || awaiting === 0) return `Awaiting ${fmt.date(date)}`; // Awaiting approval
    if (awaiting === true || awaiting === 1) return fmt.date(date); // Approved
    if (awaiting === null && date) return 'Rejected'; // Rejected
    return 'Pending'; // Default case
  },
  
  scheduledOrDone: (scheduled?: string | Date | null, done?: string | Date | null): string => {
    if (done) return fmt.date(done);
    if (scheduled) return `Scheduled ${fmt.date(scheduled)}`;
    return 'Pending';
  }
};

// Level configuration for UI
export const LevelConfig = {
  'Level 1': { 
    key: 'level-1', 
    title: 'Level 1', 
    color: 'text-blue-600',
    isReadOnly: true 
  },
  'Level 2': { 
    key: 'level-2', 
    title: 'Level 2', 
    color: 'text-green-600',
    isReadOnly: false 
  },
  'Level 3': { 
    key: 'level-3', 
    title: 'Level 3', 
    color: 'text-purple-600',
    isReadOnly: false 
  },
  'Consultant': { 
    key: 'consultant', 
    title: 'Consultant', 
    color: 'text-orange-600',
    isReadOnly: false 
  },
  'Coach': { 
    key: 'coach', 
    title: 'Coach', 
    color: 'text-teal-600',
    isReadOnly: false 
  }
};

// Helper to get level from tab key
export const getLevelFromTabKey = (tabKey: string): AwardType => {
  const mapping: Record<string, AwardType> = {
    'level-1': 'Level 1',
    'level-2': 'Level 2',
    'level-3': 'Level 3',
    'consultant': 'Consultant',
    'coach': 'Coach'
  };
  return mapping[tabKey] || 'Level 1';
};

// Helper to get tab key from level
export const getTabKeyFromLevel = (level: AwardType): string => {
  const mapping: Record<AwardType, string> = {
    'Level 1': 'level-1',
    'Level 2': 'level-2',
    'Level 3': 'level-3',
    'Consultant': 'consultant',
    'Coach': 'coach'
  };
  return mapping[level] || 'level-1';
};

// Notes options for dropdown
export const NOTES_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'PRN', label: 'PRN' },
  { value: 'FMLA', label: 'FMLA' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Exempt ADA', label: 'Exempt ADA' }
];
